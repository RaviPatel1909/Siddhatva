import path from 'node:path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './env';
import { errorHandler, notFound } from './middleware/error';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { ordersRouter } from './routes/orders';
import { wishlistRouter } from './routes/wishlist';
import { adminRouter } from './routes/admin';
import { siteRouter } from './routes/site';
import { webhookRouter } from './routes/webhooks';

export function createApp() {
  const app = express();

  // credentials:true so the httpOnly refresh cookie flows cross-origin (dev).
  app.use(cors({ origin: env.corsOrigin, credentials: true }));

  // Webhook needs the RAW body for signature verification — mount it (with
  // express.raw) BEFORE express.json parses everything else.
  app.use('/api/webhooks/razorpay', express.raw({ type: '*/*' }), webhookRouter);

  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));

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
