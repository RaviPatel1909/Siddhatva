import 'express';

// Populated by the requireAuth middleware from a verified access token.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: 'CUSTOMER' | 'ADMIN' };
    }
  }
}

export {};
