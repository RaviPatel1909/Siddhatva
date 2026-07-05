import { NextFunction, Request, RequestHandler, Response } from 'express';

// Thrown by route handlers for expected error responses. The error handler
// serializes it to the contract shape `{ message }` with this status.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

// Express 4 doesn't forward async rejections; wrap handlers so thrown/rejected
// errors (including Zod validation errors) reach the central error handler.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
