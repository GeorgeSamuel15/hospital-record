import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

// Must be registered LAST, after all routes, and have 4 parameters so
// Express recognizes it as an error handler.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  // Known, expected application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Validation errors from Zod
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
  }

  // Known Prisma errors — translate to safe, useful messages
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return res.status(409).json({ success: false, message: `A record with this ${target} already exists.` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    return res.status(400).json({ success: false, message: 'Database request error.' });
  }

  // Unknown/unexpected errors — never leak stack traces or internals to the client
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  const message = env.NODE_ENV === 'development' && err instanceof Error ? err.message : 'Internal server error';
  return res.status(500).json({ success: false, message });
}

/** Wraps an async route handler so rejected promises reach errorHandler. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
