import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign, type ECDH } from 'crypto';

/**
 * Web Push, written with Node's own crypto so it needs no extra package:
 *  - VAPID (RFC 8292): proves to the browser's push service that the message comes from this server.
 *  - Message encryption, aes128gcm (RFC 8291 + RFC 8188): only the user's browser can read the text.
 * Everything here is a pure function of its inputs, so it can be tested without a browser.
 */

export interface PushSubscriptionKeys {
  endpoint: string;
  /** The browser's public key, base64url (65 bytes). */
  p256dh: string;
  /** The browser's auth secret, base64url (16 bytes). */
  auth: string;
}

export interface VapidKeys {
  /** base64url of the 65-byte uncompressed P-256 public key */
  publicKey: string;
  /** base64url of the 32-byte private key */
  privateKey: string;
  /** "mailto:..." or an https URL: how the push service can reach whoever runs this server */
  subject: string;
}

const b64u = (b: Buffer): string => b.toString('base64url');
const fromB64u = (s: string): Buffer => Buffer.from(s, 'base64url');
const hkdf = (ikm: Buffer, salt: Buffer, info: Buffer | string, length: number): Buffer =>
  Buffer.from(hkdfSync('sha256', ikm, salt, info, length));

/** A fresh VAPID key pair; run once and keep the two values in the server's environment. */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const priv = ecdh.getPrivateKey();
  const padded = priv.length === 32 ? priv : Buffer.concat([Buffer.alloc(32 - priv.length), priv]);
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(padded) };
}

/** The Authorization header for one push request. The token names the push service it is meant for and lasts 12 hours. */
export function vapidAuthorization(endpoint: string, vapid: VapidKeys, nowMs: number = Date.now()): string {
  const header = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(
    Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(nowMs / 1000) + 12 * 3600, sub: vapid.subject })),
  );
  const data = `${header}.${claims}`;
  const pub = fromB64u(vapid.publicKey);
  const key = createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), d: vapid.privateKey },
    format: 'jwk',
  });
  const signature = sign('sha256', Buffer.from(data), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${data}.${b64u(signature)}, k=${vapid.publicKey}`;
}

/** Record size of the encrypted body. A notification is far smaller, so it is always a single record. */
const RECORD_SIZE = 4096;

/**
 * Encrypts `payload` for one browser. The result is the whole request body:
 * salt (16) | record size (4) | key id length (1) | our public key (65) | ciphertext + tag.
 * `ecdh` and `salt` can be given to make a run repeatable (for tests); in use they are fresh every time.
 */
export function encryptPayload(subscription: Pick<PushSubscriptionKeys, 'p256dh' | 'auth'>, payload: Buffer, fixed?: { ecdh?: ECDH; salt?: Buffer }): Buffer {
  const uaPublic = fromB64u(subscription.p256dh);
  const authSecret = fromB64u(subscription.auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4) throw new Error('The subscription public key is not a P-256 key.');
  if (authSecret.length !== 16) throw new Error('The subscription auth secret must be 16 bytes.');
  if (payload.length > RECORD_SIZE - 17 - 1) throw new Error('The notification is too large to send.');

  const server = fixed?.ecdh ?? createECDH('prime256v1');
  if (!fixed?.ecdh) server.generateKeys();
  const serverPublic = server.getPublicKey();
  const sharedSecret = server.computeSecret(uaPublic);
  const salt = fixed?.salt ?? randomBytes(16);

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, serverPublic]);
  const ikm = hkdf(sharedSecret, authSecret, keyInfo, 32);
  const contentKey = hkdf(ikm, salt, 'Content-Encoding: aes128gcm\0', 16);
  const nonce = hkdf(ikm, salt, 'Content-Encoding: nonce\0', 12);

  // The single record ends with the delimiter byte 0x02 (the last record)
  const cipher = createCipheriv('aes-128-gcm', contentKey, nonce);
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const head = Buffer.alloc(16 + 4 + 1);
  salt.copy(head, 0);
  head.writeUInt32BE(RECORD_SIZE, 16);
  head.writeUInt8(serverPublic.length, 20);
  return Buffer.concat([head, serverPublic, encrypted]);
}

/** The headers of a push request, apart from the body. */
export function pushHeaders(endpoint: string, vapid: VapidKeys, bodyLength: number, opts: { ttlSeconds?: number; urgency?: 'very-low' | 'low' | 'normal' | 'high' } = {}): Record<string, string> {
  return {
    Authorization: vapidAuthorization(endpoint, vapid),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(bodyLength),
    TTL: String(opts.ttlSeconds ?? 24 * 3600),
    Urgency: opts.urgency ?? 'normal',
  };
}
