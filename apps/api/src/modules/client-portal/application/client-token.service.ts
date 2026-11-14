import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as jose from 'jose';

/**
 * Access tokens of client logins. They use the same keys as the employees' tokens but another audience,
 * so a client token is rejected everywhere an employee token is expected, and the other way round.
 */
@Injectable()
export class ClientTokenService {
  static readonly AUDIENCE = 'pulse-client';
  static readonly TTL_SECONDS = 8 * 60 * 60;

  private readonly issuer = process.env.JWT_ISSUER || 'pulse-api';
  private readonly keyId = process.env.JWT_KEY_ID || 'pulse_key_1';
  private privateKey: Promise<jose.CryptoKey | Uint8Array> | null = null;
  private publicKey: Promise<jose.CryptoKey | Uint8Array> | null = null;

  private keys() {
    if (!this.privateKey || !this.publicKey) {
      const priv = process.env.JWT_PRIVATE_KEY;
      const pub = process.env.JWT_PUBLIC_KEY;
      if (!priv || !pub) throw new Error('JWT keys are not configured');
      this.privateKey = jose.importPKCS8(Buffer.from(priv, 'base64').toString('utf8'), 'RS256');
      this.publicKey = jose.importSPKI(Buffer.from(pub, 'base64').toString('utf8'), 'RS256');
    }
    return { priv: this.privateKey, pub: this.publicKey };
  }

  async sign(clientUserId: number): Promise<{ token: string; expiresIn: number }> {
    const token = await new jose.SignJWT({ sub: String(clientUserId), typ_: 'client' })
      .setProtectedHeader({ alg: 'RS256', kid: this.keyId })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(ClientTokenService.AUDIENCE)
      .setExpirationTime(`${ClientTokenService.TTL_SECONDS}s`)
      .setJti(crypto.randomUUID())
      .sign(await this.keys().priv);
    return { token, expiresIn: ClientTokenService.TTL_SECONDS };
  }

  /** The client user id in the token, or null when the token is not a valid client token. */
  async verify(token: string): Promise<number | null> {
    try {
      const { payload } = await jose.jwtVerify(token, await this.keys().pub, { issuer: this.issuer, audience: ClientTokenService.AUDIENCE, algorithms: ['RS256'] });
      const id = Number(payload.sub);
      return Number.isInteger(id) && id > 0 ? id : null;
    } catch {
      return null;
    }
  }
}
