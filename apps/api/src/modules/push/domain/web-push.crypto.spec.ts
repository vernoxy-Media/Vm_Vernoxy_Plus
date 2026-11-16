import { createCipheriv, createDecipheriv, createECDH, createPublicKey, hkdfSync, randomBytes, verify } from 'crypto';
import { encryptPayload, generateVapidKeys, pushHeaders, vapidAuthorization } from './web-push.crypto';

const b64u = (b: Buffer) => b.toString('base64url');
const fromB64u = (s: string) => Buffer.from(s, 'base64url');
const hkdf = (ikm: Buffer, salt: Buffer, info: Buffer | string, n: number) => Buffer.from(hkdfSync('sha256', ikm, salt, info, n));

/** A browser: its own key pair and auth secret, and a way to read a message the way a browser does (RFC 8291 section 4). */
function browser() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const authSecret = randomBytes(16);
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: b64u(ecdh.getPublicKey()), auth: b64u(authSecret) };
  const decrypt = (body: Buffer): Buffer => {
    const salt = body.subarray(0, 16);
    const recordSize = body.readUInt32BE(16);
    const idLen = body.readUInt8(20);
    const serverPublic = body.subarray(21, 21 + idLen);
    const cipherText = body.subarray(21 + idLen);
    const shared = ecdh.computeSecret(serverPublic);
    const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), ecdh.getPublicKey(), serverPublic]);
    const ikm = hkdf(shared, authSecret, keyInfo, 32);
    const key = hkdf(ikm, salt, 'Content-Encoding: aes128gcm\0', 16);
    const nonce = hkdf(ikm, salt, 'Content-Encoding: nonce\0', 12);
    const decipher = createDecipheriv('aes-128-gcm', key, nonce);
    decipher.setAuthTag(cipherText.subarray(cipherText.length - 16));
    const plain = Buffer.concat([decipher.update(cipherText.subarray(0, cipherText.length - 16)), decipher.final()]);
    expect(recordSize).toBe(4096);
    // the last record ends with the delimiter 0x02, then nothing but zero padding
    let end = plain.length;
    while (end > 0 && plain[end - 1] === 0) end -= 1;
    expect(plain[end - 1]).toBe(2);
    return plain.subarray(0, end - 1);
  };
  return { subscription, decrypt };
}

describe('generateVapidKeys', () => {
  it('makes a 65-byte public key and a 32-byte private key, different every time', () => {
    const a = generateVapidKeys();
    expect(fromB64u(a.publicKey)).toHaveLength(65);
    expect(fromB64u(a.publicKey)[0]).toBe(4);
    expect(fromB64u(a.privateKey)).toHaveLength(32);
    expect(generateVapidKeys().publicKey).not.toBe(a.publicKey);
  });
});

describe('vapidAuthorization', () => {
  const keys = { ...generateVapidKeys(), subject: 'mailto:admin@example.com' };

  it('is a signed token that names the push service, the contact and an expiry 12 hours away', () => {
    const now = Date.UTC(2026, 10, 17, 6, 0, 0);
    const header = vapidAuthorization('https://fcm.googleapis.com/fcm/send/xyz', keys, now);
    const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(header);
    expect(m).not.toBeNull();
    const [, h, c, s, k] = m!;
    expect(JSON.parse(fromB64u(h).toString())).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(JSON.parse(fromB64u(c).toString())).toEqual({ aud: 'https://fcm.googleapis.com', exp: Math.floor(now / 1000) + 12 * 3600, sub: 'mailto:admin@example.com' });
    expect(k).toBe(keys.publicKey);

    // the signature checks out against the public key, the way the push service checks it
    const pub = fromB64u(keys.publicKey);
    const publicKey = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
    expect(verify('sha256', Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, fromB64u(s))).toBe(true);
    expect(fromB64u(s)).toHaveLength(64);
  });

  it('is meant for the origin of the endpoint it is used with', () => {
    const t = (e: string) => JSON.parse(fromB64u(vapidAuthorization(e, keys).split('.')[1]).toString()).aud;
    expect(t('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe('https://updates.push.services.mozilla.com');
    expect(t('https://wns2-pn1p.notify.windows.com/w/?token=1')).toBe('https://wns2-pn1p.notify.windows.com');
  });
});

describe('encryptPayload', () => {
  it('can be read by the browser it was made for, and says what the message was', () => {
    const b = browser();
    const message = Buffer.from(JSON.stringify({ title: 'Regularization approved', body: 'Admin approved your request REG-0003 for 14 Nov 2026.', url: '/attendance?tab=regularization' }));
    const body = encryptPayload(b.subscription, message);
    expect(b.decrypt(body).toString('utf8')).toBe(message.toString('utf8'));
  });

  it('reads back a text with accents and Hindi letters', () => {
    const b = browser();
    const text = 'नया टास्क: Add Searchable Droapdown ✓';
    expect(b.decrypt(encryptPayload(b.subscription, Buffer.from(text))).toString('utf8')).toBe(text);
  });

  it('is different every time, and unreadable to another browser', () => {
    const b = browser();
    const other = browser();
    const msg = Buffer.from('hello');
    const one = encryptPayload(b.subscription, msg);
    const two = encryptPayload(b.subscription, msg);
    expect(one.equals(two)).toBe(false);
    expect(() => other.decrypt(one)).toThrow();
  });

  it('lays the body out as the standard says: salt, record size, key id, public key, then the data', () => {
    const b = browser();
    const body = encryptPayload(b.subscription, Buffer.from('hi'));
    expect(body.readUInt32BE(16)).toBe(4096);
    expect(body.readUInt8(20)).toBe(65);
    expect(body[21]).toBe(4); // an uncompressed P-256 public key
    // 2 bytes of text + the delimiter + a 16-byte tag
    expect(body.length).toBe(21 + 65 + 2 + 1 + 16);
  });

  it('refuses a broken subscription key and a message that is too big', () => {
    const b = browser();
    expect(() => encryptPayload({ ...b.subscription, auth: b64u(randomBytes(8)) }, Buffer.from('x'))).toThrow(/auth secret/);
    expect(() => encryptPayload({ ...b.subscription, p256dh: b64u(randomBytes(65).fill(1, 0, 1)) }, Buffer.from('x'))).toThrow(/P-256/);
    expect(() => encryptPayload(b.subscription, Buffer.alloc(4100, 1))).toThrow(/too large/);
  });

  it('gives the same answer for the same key and salt (so a run can be repeated)', () => {
    const b = browser();
    const server = createECDH('prime256v1');
    server.generateKeys();
    const salt = Buffer.alloc(16, 9);
    const a = encryptPayload(b.subscription, Buffer.from('same'), { ecdh: server, salt });
    const c = encryptPayload(b.subscription, Buffer.from('same'), { ecdh: server, salt });
    expect(a.equals(c)).toBe(true);
    // and it is the cipher the standard names: aes-128-gcm with a 12-byte nonce
    expect(() => createCipheriv('aes-128-gcm', Buffer.alloc(16), Buffer.alloc(12))).not.toThrow();
  });
});

describe('pushHeaders', () => {
  it('carries what a push service needs', () => {
    const keys = { ...generateVapidKeys(), subject: 'mailto:admin@example.com' };
    const h = pushHeaders('https://fcm.googleapis.com/fcm/send/xyz', keys, 123, { urgency: 'high', ttlSeconds: 60 });
    expect(h['Content-Encoding']).toBe('aes128gcm');
    expect(h['Content-Length']).toBe('123');
    expect(h.TTL).toBe('60');
    expect(h.Urgency).toBe('high');
    expect(h.Authorization).toMatch(/^vapid t=/);
  });
});
