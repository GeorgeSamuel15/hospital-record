import { hashPassword, verifyPassword } from '../utils/password';

describe('password hashing', () => {
  it('hashes a password to something other than the plaintext', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    await expect(verifyPassword(hash, 'Sup3rSecret!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    await expect(verifyPassword(hash, 'WrongPassword')).resolves.toBe(false);
  });

  it('returns false rather than throwing for a malformed hash', async () => {
    await expect(verifyPassword('not-a-real-hash', 'anything')).resolves.toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
    expect(a).not.toBe(b);
  });
});
