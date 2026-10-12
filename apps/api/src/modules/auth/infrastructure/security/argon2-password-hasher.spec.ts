import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('hash starts with $argon2id$', async () => {
    const hash = await hasher.hash('SuperSecretPassword123!');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('hash verifies with correct password', async () => {
    const rawPassword = 'CorrectPassword999#';
    const hash = await hasher.hash(rawPassword);
    const verified = await hasher.verify(rawPassword, hash);
    expect(verified).toBe(true);
  });

  it('hash verification fails with wrong password', async () => {
    const rawPassword = 'CorrectPassword999#';
    const hash = await hasher.hash(rawPassword);
    const verified = await hasher.verify('WrongPassword123!', hash);
    expect(verified).toBe(false);
  });

  it('needsRehash returns false for matching parameters', async () => {
    const hash = await hasher.hash('TestPasswordParameters123!');
    expect(hasher.needsRehash(hash)).toBe(false);
  });
});
