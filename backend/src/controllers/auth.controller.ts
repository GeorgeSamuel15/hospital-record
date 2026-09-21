import { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, signAccessToken, verifyRefreshToken } from '../utils/tokens';
import { authenticateUser, changePassword, requestPasswordReset, resetPassword } from '../services/auth.service';
import { logAudit } from '../services/audit.service';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN,
};

export const login = asyncHandler(async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  try {
    const { accessToken, refreshToken, user } = await authenticateUser(req.body);

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, { ...baseCookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { ...baseCookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    await logAudit({ userId: user.id, action: 'LOGIN', resource: 'User', resourceId: user.id, req });

    res.json({ success: true, data: { user } });
  } catch (err) {
    await logAudit({ action: 'LOGIN_FAILED', resource: 'User', metadata: { email: req.body?.email }, req });
    throw err;
  }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions);

  if (req.user) {
    await logAudit({ userId: req.user.id, action: 'LOGOUT', resource: 'User', resourceId: req.user.id, req });
  }

  res.json({ success: true, message: 'Logged out successfully.' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      isDemo: true,
      lastLoginAt: true,
    },
  });

  res.json({ success: true, data: { user } });
});

/** Rotates the access token cookie using the refresh token cookie. */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (!token) throw AppError.unauthorized('No refresh token provided.');

  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw AppError.unauthorized('Refresh token is invalid or expired. Please log in again.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw AppError.unauthorized('Account unavailable.');

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, { ...baseCookieOptions, maxAge: 15 * 60 * 1000 });

  res.json({ success: true, message: 'Session refreshed.' });
});

export const forgotPassword = asyncHandler(
  async (req: Request<unknown, unknown, ForgotPasswordInput>, res: Response) => {
    const rawToken = await requestPasswordReset(req.body.email);

    await logAudit({ action: 'PASSWORD_RESET_REQUESTED', resource: 'User', metadata: { email: req.body.email }, req });

    // Always return a generic success message — never confirm/deny whether
    // the email exists in the system.
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // devResetToken is only ever populated outside production, purely to
      // make local development possible without an email provider wired up.
      ...(env.NODE_ENV !== 'production' && rawToken ? { devResetToken: rawToken } : {}),
    });
  }
);

export const resetPasswordHandler = asyncHandler(
  async (req: Request<unknown, unknown, ResetPasswordInput>, res: Response) => {
    const userId = await resetPassword(req.body);
    await logAudit({ userId, action: 'PASSWORD_RESET_COMPLETED', resource: 'User', resourceId: userId, req });
    res.json({ success: true, message: 'Password has been reset. You can now log in.' });
  }
);

export const changePasswordHandler = asyncHandler(
  async (req: Request<unknown, unknown, ChangePasswordInput>, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await changePassword(req.user.id, req.body);
    await logAudit({
      userId: req.user.id,
      action: 'PASSWORD_CHANGED',
      resource: 'User',
      resourceId: req.user.id,
      req,
    });
    res.json({ success: true, message: 'Password changed successfully.' });
  }
);
