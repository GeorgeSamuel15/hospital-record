import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';
import {
  changePasswordHandler,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  resetPasswordHandler,
} from '../controllers/auth.controller';

const router = Router();

// Stricter limiter for credential-related endpoints to slow brute-force attempts.
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', requireAuth(), logout);
router.get('/me', requireAuth(), me);
router.post('/refresh', refresh);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPasswordHandler);
router.post('/change-password', requireAuth(), validate(changePasswordSchema), changePasswordHandler);

export default router;
