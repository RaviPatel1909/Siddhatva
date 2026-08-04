import path from 'node:path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './env';
import { errorHandler, notFound } from './middleware/error';
import { rateLimit } from './middleware/rateLimit';
import { securityHeaders } from './middleware/securityHeaders';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { ordersRouter } from './routes/orders';
import { wishlistRouter } from './routes/wishlist';
import { adminRouter } from './routes/admin';
import { siteRouter } from './routes/site';
import { webhookRouter } from './routes/webhooks';
import { shiprocketWebhookRouter } from './routes/shiprocketWebhook';

export function createApp() {
  const app = express();

  // Don't advertise the framework.
  app.disable('x-powered-by');

  // Standard security headers on every response (nosniff / frame-deny / referrer
  // / HSTS-in-prod). See middleware/securityHeaders.ts.
  app.use(securityHeaders);

  // Behind a trusted proxy/CDN (prod), trust X-Forwarded-* so req.ip is the real
  // client IP — the rate limiter keys on it, so this number is load-bearing and
  // is the MEASURED hop count, not a default. See TRUST_PROXY_HOPS in env.ts.
  // Off in local dev (no proxy), where req.ip is the socket address.
  if (env.trustProxyHops > 0) app.set('trust proxy', env.trustProxyHops);

  // Allowed origins come from CORS_ORIGINS (comma-separated env) — the cors
  // package echoes back whichever listed origin made the request. credentials:
  // true so the httpOnly refresh cookie flows cross-origin.
  app.use(cors({ origin: env.corsOrigins, credentials: true }));

  // Webhooks need the RAW body for signature/token verification — mount them
  // (with express.raw) BEFORE express.json parses everything else.
  app.use('/api/webhooks/razorpay', express.raw({ type: '*/*' }), webhookRouter);
  app.use('/api/webhooks/shiprocket', express.raw({ type: '*/*' }), shiprocketWebhookRouter);

  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));

  // Coarse per-IP flood backstop for the API. Deliberately loose — the tight
  // per-endpoint limits (login/register/checkout/password-reset) are the real
  // controls; this only catches runaway floods. Mounted after the webhook routes
  // above, so provider webhook retries are never rate-limited.
  app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 2000, name: 'global' }));

  // Local dev image store: serve uploaded files (no-op in Cloudinary mode).
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Contract routes (docs/API_CONTRACT.md), mounted under /api.
  app.use('/api/auth', authRouter);
  app.use('/api/site', siteRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
