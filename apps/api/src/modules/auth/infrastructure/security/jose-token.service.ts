import { Injectable, Optional, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import * as jose from 'jose';
import {
  TokenService,
  AccessTokenPayload,
} from '../../application/ports/auth.ports';

export interface JoseTokenConfig {
  privateKeyBase64: string;
  publicKeyBase64: string;
  keyId: string;
  issuer: string;
  audience: string;
  ttlSeconds: number;
}

@Injectable()
export class JoseTokenService implements TokenService {
  private readonly keyId: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly ttlSeconds: number;

  private privateKeyPromise: Promise<any> | null = null;
  private publicKeyPromise: Promise<any> | null = null;

  constructor(@Optional() @Inject('JOSE_TOKEN_CONFIG') config?: Partial<JoseTokenConfig>) {
    const privBase64 = config?.privateKeyBase64 || process.env.JWT_PRIVATE_KEY || '';
    const pubBase64 = config?.publicKeyBase64 || process.env.JWT_PUBLIC_KEY || '';

    this.keyId = config?.keyId || process.env.JWT_KEY_ID || 'pulse_key_1';
    this.issuer = config?.issuer || process.env.JWT_ISSUER || 'pulse-api';
    this.audience = config?.audience || process.env.JWT_AUDIENCE || 'pulse-web';
    this.ttlSeconds = Number(config?.ttlSeconds || process.env.ACCESS_TOKEN_TTL_SECONDS || 900);

    if (privBase64 && pubBase64) {
      const privPem = Buffer.from(privBase64, 'base64').toString('utf8');
      const pubPem = Buffer.from(pubBase64, 'base64').toString('utf8');
      this.privateKeyPromise = jose.importPKCS8(privPem, 'RS256');
      this.publicKeyPromise = jose.importSPKI(pubPem, 'RS256');
    }
  }

  private async getPrivateKey(): Promise<any> {
    if (!this.privateKeyPromise) {
      throw new Error('JWT_PRIVATE_KEY is not configured or failed to parse');
    }
    return this.privateKeyPromise;
  }

  private async getPublicKey(): Promise<any> {
    if (!this.publicKeyPromise) {
      throw new Error('JWT_PUBLIC_KEY is not configured or failed to parse');
    }
    return this.publicKeyPromise;
  }

  async signAccessToken(payload: { emp_id: number; session_id: string }): Promise<{ token: string; expiresIn: number }> {
    const privKey = await this.getPrivateKey();
    const jti = crypto.randomUUID();

    const token = await new jose.SignJWT({
      sub: payload.emp_id.toString(),
      sid: payload.session_id,
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.keyId })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setExpirationTime(`${this.ttlSeconds}s`)
      .setJti(jti)
      .sign(privKey);

    return {
      token,
      expiresIn: this.ttlSeconds,
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const pubKey = await this.getPublicKey();
    const result = await jose.jwtVerify(token, pubKey, {
      issuer: this.issuer,
      audience: this.audience,
    });

    const payload = result.payload;
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new Error('Missing sub claim in access token');
    }
    if (!payload.sid || typeof payload.sid !== 'string') {
      throw new Error('Missing sid claim in access token');
    }

    return {
      sub: payload.sub,
      sid: payload.sid,
      iss: payload.iss,
      aud: typeof payload.aud === 'string' ? payload.aud : Array.isArray(payload.aud) ? payload.aud[0] : undefined,
      iat: payload.iat,
      exp: payload.exp,
      jti: payload.jti,
    };
  }

  async getJwks(): Promise<Record<string, unknown>> {
    const pubKey = await this.getPublicKey();
    const jwk = await jose.exportJWK(pubKey);
    jwk.kid = this.keyId;
    jwk.alg = 'RS256';
    jwk.use = 'sig';

    return {
      keys: [jwk],
    };
  }
}
