import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './env';
import { errorHandler, notFound } from './middleware/error';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
