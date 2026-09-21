import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  APP_ORIGINS: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),

  // SMTP is optional. When unset, EmailService logs emails to the console
  // instead of sending them — convenient for local development, but NOT
  // something to rely on in production (see email.service.ts).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('Hospital RMS <no-reply@hospital.example>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud rather than starting the server in a broken state.
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. Check your .env against .env.example.');
}

const rawEnv = parsed.data;
const cookieSecure = rawEnv.NODE_ENV === 'production' || rawEnv.COOKIE_SECURE === 'true';
const cookieSameSite = rawEnv.COOKIE_SAME_SITE ?? (rawEnv.NODE_ENV === 'production' ? 'none' : 'lax');
const requestedCookieDomain = rawEnv.COOKIE_DOMAIN?.trim();

// Host-only cookies are correct for a separately hosted API (for example,
// Vercel frontend + Render backend). A production cookie scoped to localhost
// is never useful, so an old value is safely ignored during upgrades.
const cookieDomain = rawEnv.NODE_ENV === 'production' && requestedCookieDomain === 'localhost'
  ? undefined
  : requestedCookieDomain || undefined;

const appOrigins = [...new Set(
  [rawEnv.FRONTEND_URL, ...(rawEnv.APP_ORIGINS?.split(',') ?? [])]
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
)];

export const env = {
  ...rawEnv,
  APP_ORIGINS: appOrigins,
  COOKIE_SECURE: cookieSecure,
  COOKIE_DOMAIN: cookieDomain,
  COOKIE_SAME_SITE: cookieSameSite,
};
