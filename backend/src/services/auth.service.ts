import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken, signRefreshToken } from '../utils/tokens';
import { sendPasswordResetEmail } from './email.service';
import type { LoginInput, ResetPasswordInput, ChangePasswordInput } from '../validators/auth.validator';

export async function authenticateUser({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberately identical error for "no such user" and "wrong password" so
  // we don't leak which emails are registered.
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw AppError.unauthorized('Invalid email or password.');
  }

  if (!user.isActive) {
    throw AppError.forbidden('This account has been deactivated. Contact an administrator.');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      isDemo: user.isDemo,
    },
  };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave the same way whether or not the user exists, to avoid
  // leaking account existence via response timing/content.
  if (!user || !user.isActive) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes
    },
  });

  await sendPasswordResetEmail(user.email, rawToken);

  // Still returned so the controller can optionally surface it in
  // non-production responses (see auth.controller.ts) — convenient when
  // SMTP isn't configured locally, since the email service will have
  // logged the same link to the console either way.
  return rawToken;
}

export async function resetPassword({ token, newPassword }: ResetPasswordInput) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetRecord = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw AppError.badRequest('This password reset link is invalid or has expired.');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetRecord.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetRecord.id }, data: { usedAt: new Date() } }),
  ]);

  return resetRecord.userId;
}

export async function changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw AppError.badRequest('Current password is incorrect.');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
