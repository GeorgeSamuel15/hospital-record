import { z } from 'zod';
import { Request, Response } from 'express';
import { validate } from '../middleware/validate';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('validate middleware', () => {
  const schema = z.object({ email: z.string().email(), age: z.coerce.number().int().min(0) });

  it('calls next() and replaces req.body with the parsed result on success', () => {
    const req = { body: { email: 'a@b.com', age: '30' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith(); // called with no error
    expect(req.body).toEqual({ email: 'a@b.com', age: 30 }); // coerced
  });

  it('responds with 422 and field errors on invalid input, without calling next()', () => {
    const req = { body: { email: 'not-an-email', age: -1 } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.success).toBe(false);
    expect(jsonArg.errors).toHaveProperty('email');
    expect(jsonArg.errors).toHaveProperty('age');
  });

  it('validates query params when source is "query"', () => {
    const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1) });
    const req = { query: {} } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    validate(querySchema, 'query')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 1 });
  });
});
