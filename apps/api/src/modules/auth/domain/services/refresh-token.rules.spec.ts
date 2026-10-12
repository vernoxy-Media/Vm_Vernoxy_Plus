import {
  generateRawRefreshToken,
  hashRefreshToken,
  evaluateRefreshTokenUsage,
  RefreshTokenOutcome,
} from './refresh-token.rules';

describe('refresh-token.rules', () => {
  it('generates 32-byte base64url string', () => {
    const token = generateRawRefreshToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('hashes token into 64-char hex string with SHA-256', () => {
    const raw = 'my_refresh_token_test_123456';
    const hash1 = hashRefreshToken(raw);
    const hash2 = hashRefreshToken(raw);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('returns VALID_CURRENT when presented token matches current hash', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const outcome = evaluateRefreshTokenUsage({
      presentedHash: 'cur_hash',
      currentHash: 'cur_hash',
      previousHash: 'prev_hash',
      lastUsedAt: new Date(now.getTime() - 20_000),
      expiresAt: new Date(now.getTime() + 60_000),
      now,
    });
    expect(outcome).toBe(RefreshTokenOutcome.VALID_CURRENT);
  });

  it('returns PREVIOUS_WITHIN_GRACE when matching previous hash within 10 seconds', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const outcome = evaluateRefreshTokenUsage({
      presentedHash: 'prev_hash',
      currentHash: 'cur_hash',
      previousHash: 'prev_hash',
      lastUsedAt: new Date(now.getTime() - 5_000), // 5 seconds ago <= 10s
      expiresAt: new Date(now.getTime() + 60_000),
      now,
    });
    expect(outcome).toBe(RefreshTokenOutcome.PREVIOUS_WITHIN_GRACE);
  });

  it('returns PREVIOUS_REUSE_DETECTED when matching previous hash older than 10 seconds', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const outcome = evaluateRefreshTokenUsage({
      presentedHash: 'prev_hash',
      currentHash: 'cur_hash',
      previousHash: 'prev_hash',
      lastUsedAt: new Date(now.getTime() - 15_000), // 15 seconds ago > 10s
      expiresAt: new Date(now.getTime() + 60_000),
      now,
    });
    expect(outcome).toBe(RefreshTokenOutcome.PREVIOUS_REUSE_DETECTED);
  });

  it('returns EXPIRED when session expires_at is past', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const outcome = evaluateRefreshTokenUsage({
      presentedHash: 'cur_hash',
      currentHash: 'cur_hash',
      previousHash: null,
      lastUsedAt: new Date(now.getTime() - 5_000),
      expiresAt: new Date(now.getTime() - 1_000),
      now,
    });
    expect(outcome).toBe(RefreshTokenOutcome.EXPIRED);
  });

  it('returns UNKNOWN_TOKEN when token matches neither', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const outcome = evaluateRefreshTokenUsage({
      presentedHash: 'random_hash',
      currentHash: 'cur_hash',
      previousHash: 'prev_hash',
      lastUsedAt: new Date(now.getTime() - 5_000),
      expiresAt: new Date(now.getTime() + 60_000),
      now,
    });
    expect(outcome).toBe(RefreshTokenOutcome.UNKNOWN_TOKEN);
  });
});
