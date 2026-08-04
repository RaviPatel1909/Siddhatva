import { NextFunction, Request, RequestHandler, Response } from 'express';

// Thrown by route handlers for expected error responses. The error handler
// serializes it to the contract shape `{ message }` with this status.
//
// `code` is optional and additive: a stable machine-readable discriminator for
// the few cases where the client must branch on WHICH error occurred, not just
// the status. Added for EMAIL_NOT_VERIFIED so the login page can render its
// dedicated screen without string-matching a human-facing message (which
// changes freely and is not an API contract). Responses without a code are
// byte-identical to before.
export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

// Express 4 doesn't forward async rejections; wrap handlers so thrown/rejected
// errors (including Zod validation errors) reach the central error handler.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
