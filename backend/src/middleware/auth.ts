import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from '../utils/tokens';
import { prisma } from '../config/prisma';

export interface AuthenticatedUser {
  id: string;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isDemo: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Requires a valid access token cookie. Loads the current user from the
 * database (not just the token) so that a deactivated account is rejected
 * immediately, even if their token hasn't expired yet.
 */
export function requireAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
      if (!token) throw AppError.unauthorized('You must be logged in to access this resource.');

      const payload = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, email: true, firstName: true, lastName: true, isActive: true, isDemo: true },
      });

      if (!user) throw AppError.unauthorized('Account no longer exists.');
      if (!user.isActive) throw AppError.forbidden('This account has been deactivated.');

      req.user = user;
      next();
    } catch (err) {
      if (err instanceof AppError) return next(err);
      next(AppError.unauthorized('Invalid or expired session. Please log in again.'));
    }
  };
}

/**
 * Restricts a route to specific roles. Must be used AFTER requireAuth().
 * Enforced server-side — the frontend hiding buttons is not a substitute.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized('Authentication required.'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action.'));
    }
    next();
  };
}
