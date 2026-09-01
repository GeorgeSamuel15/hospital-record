import '../test/setupEnv';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/tokens';

describe('tokens', () => {
  it('round-trips an access token with the correct payload', () => {
    const token = signAccessToken({ sub: 'user_123', role: 'DOCTOR' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user_123');
    expect(payload.role).toBe('DOCTOR');
  });

  it('round-trips a refresh token', () => {
    const token = signRefreshToken('user_456');
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user_456');
  });

  it('throws when verifying a garbage token', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow();
  });

  it('access and refresh tokens are not interchangeable (different secrets)', () => {
    const accessToken = signAccessToken({ sub: 'user_789', role: 'NURSE' });
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
