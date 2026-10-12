import * as crypto from 'crypto';
import * as jose from 'jose';
import { JoseTokenService } from './jose-token.service';

describe('JoseTokenService', () => {
  let tokenService: JoseTokenService;
  let keyId: string;

  beforeAll(async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const privBase64 = Buffer.from(privateKey).toString('base64');
    const pubBase64 = Buffer.from(publicKey).toString('base64');
    keyId = 'kid_test_123';

    tokenService = new JoseTokenService({
      privateKeyBase64: privBase64,
      publicKeyBase64: pubBase64,
      keyId,
      issuer: 'pulse-test',
      audience: 'pulse-web-test',
      ttlSeconds: 900,
    });
  });

  it('signs and verifies access token with expected claims', async () => {
    const sessionId = crypto.randomUUID();
    const { token, expiresIn } = await tokenService.signAccessToken({
      emp_id: 42,
      session_id: sessionId,
    });

    expect(expiresIn).toBe(900);
    expect(typeof token).toBe('string');

    // Decode header to check kid and alg
    const header = jose.decodeProtectedHeader(token);
    expect(header.alg).toBe('RS256');
    expect(header.kid).toBe(keyId);

    // Verify token
    const payload = await tokenService.verifyAccessToken(token);
    expect(payload.sub).toBe('42');
    expect(payload.sid).toBe(sessionId);
    expect(payload.iss).toBe('pulse-test');
    expect(payload.aud).toBe('pulse-web-test');
  });

  it('exports public key as JWKS with kid and alg', async () => {
    const jwks = await tokenService.getJwks();
    expect(jwks).toHaveProperty('keys');
    const keys = (jwks as any).keys;
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBe(1);
    expect(keys[0].kty).toBe('RSA');
    expect(keys[0].alg).toBe('RS256');
    expect(keys[0].kid).toBe(keyId);
    expect(keys[0].use).toBe('sig');
  });

  it('rejects tampered token', async () => {
    const { token } = await tokenService.signAccessToken({
      emp_id: 1,
      session_id: crypto.randomUUID(),
    });

    const tampered = token.slice(0, -4) + 'abcd';
    await expect(tokenService.verifyAccessToken(tampered)).rejects.toThrow();
  });
});
