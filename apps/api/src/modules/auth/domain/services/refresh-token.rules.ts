import * as crypto from 'crypto';

export const REFRESH_TOKEN_GRACE_WINDOW_MS = 10_000; // 10 seconds

export enum RefreshTokenOutcome {
  VALID_CURRENT = 'VALID_CURRENT',
  PREVIOUS_WITHIN_GRACE = 'PREVIOUS_WITHIN_GRACE',
  PREVIOUS_REUSE_DETECTED = 'PREVIOUS_REUSE_DETECTED',
  EXPIRED = 'EXPIRED',
  UNKNOWN_TOKEN = 'UNKNOWN_TOKEN',
}

export function generateRawRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export interface EvaluateRefreshTokenParams {
  presentedHash: string;
  currentHash: string;
  previousHash: string | null;
  lastUsedAt: Date;
  expiresAt: Date;
  now?: Date;
}

export function evaluateRefreshTokenUsage(params: EvaluateRefreshTokenParams): RefreshTokenOutcome {
  const { presentedHash, currentHash, previousHash, lastUsedAt, expiresAt } = params;
  const now = params.now ?? new Date();

  if (expiresAt.getTime() <= now.getTime()) {
    return RefreshTokenOutcome.EXPIRED;
  }

  if (presentedHash === currentHash) {
    return RefreshTokenOutcome.VALID_CURRENT;
  }

  if (previousHash && presentedHash === previousHash) {
    const elapsedMs = now.getTime() - lastUsedAt.getTime();
    if (elapsedMs <= REFRESH_TOKEN_GRACE_WINDOW_MS) {
      return RefreshTokenOutcome.PREVIOUS_WITHIN_GRACE;
    }
    return RefreshTokenOutcome.PREVIOUS_REUSE_DETECTED;
  }

  return RefreshTokenOutcome.UNKNOWN_TOKEN;
}
