import { AppError } from '../utils/AppError';

describe('AppError', () => {
  it('sets the correct status code and message for each factory method', () => {
    expect(AppError.badRequest('bad')).toMatchObject({ statusCode: 400, message: 'bad' });
    expect(AppError.unauthorized('no auth')).toMatchObject({ statusCode: 401, message: 'no auth' });
    expect(AppError.forbidden('nope')).toMatchObject({ statusCode: 403, message: 'nope' });
    expect(AppError.notFound('missing')).toMatchObject({ statusCode: 404, message: 'missing' });
    expect(AppError.conflict('dupe')).toMatchObject({ statusCode: 409, message: 'dupe' });
    expect(AppError.internal('oops')).toMatchObject({ statusCode: 500, message: 'oops' });
  });

  it('falls back to sensible default messages', () => {
    expect(AppError.notFound().message).toBe('Resource not found');
    expect(AppError.unauthorized().message).toBe('Unauthorized');
  });

  it('is an instance of Error and marked operational', () => {
    const err = AppError.badRequest();
    expect(err).toBeInstanceOf(Error);
    expect(err.isOperational).toBe(true);
  });
});
