import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Validates and replaces req.body/query/params with the parsed, typed result.
 * Never trust client-side validation alone — every write endpoint uses this.
 */
export function validate(schema: AnyZodObject, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: err.flatten().fieldErrors,
        });
      }
      next(err);
    }
  };
}
