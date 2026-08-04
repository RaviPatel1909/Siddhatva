import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http';

// Unmatched route → same `{ message }` shape as every other error.
export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' });
};

// Central error handler. Every error response is `{ "message": string }` to
// match the MSW mock / API contract (404, 500, and validation errors).
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    res.status(400).json({ message: 'Validation failed', issues: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    // `code` is only present on errors the client must branch on; omitted
    // otherwise so existing responses keep their exact `{ message }` shape.
    res.status(err.status).json(err.code ? { message: err.message, code: err.code } : { message: err.message });
    return;
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};
