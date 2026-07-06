import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../lib/http';
import { DEFAULT_HOME_CONTENT, HOME_KEY, HomeContent } from '../lib/homeContent';

export const siteRouter = Router();

// GET /site/home — public. Returns the stored content, or the default if the
// row is missing, so this endpoint is never empty.
siteRouter.get(
  '/home',
  asyncHandler(async (_req, res) => {
    const row = await prisma.siteContent.findUnique({ where: { key: HOME_KEY } });
    const content = (row?.content as HomeContent | undefined) ?? DEFAULT_HOME_CONTENT;
    res.json(content);
  })
);
