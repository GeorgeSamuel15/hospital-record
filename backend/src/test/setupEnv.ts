// Runs before any test file or app module is imported, so config/env.ts's
// Zod validation has everything it needs even though no real .env exists
// in CI or a fresh checkout.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-please-replace-me-1234567890';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-please-replace-me-0987654321';
process.env.NODE_ENV ??= 'test';
process.env.COOKIE_SECURE ??= 'false';
