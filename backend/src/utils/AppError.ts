/**
 * Standard application error carrying an HTTP status code.
 * Route handlers/services should throw this (or subclasses) for expected
 * failure cases; the global error handler converts it into a consistent
 * JSON response without leaking internals.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request') {
    return new AppError(message, 400);
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }
  static conflict(message = 'Conflict') {
    return new AppError(message, 409);
  }
  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}
