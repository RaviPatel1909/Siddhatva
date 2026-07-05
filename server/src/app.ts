import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './env';
import { errorHandler, notFound } from './middleware/error';
import { productsRouter } from './routes/products';
import { ordersRouter } from './routes/orders';
import { wishlistRouter } from './routes/wishlist';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Contract routes (docs/API_CONTRACT.md), mounted under /api.
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/wishlist', wishlistRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
