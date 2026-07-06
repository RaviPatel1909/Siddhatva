import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { orderInclude, toApiOrder } from '../lib/mappers';
import { OrderListResponse } from '../contract';
import { imageStore, LocalImageStore } from '../lib/imageStore';
import { adminProductsRouter } from './adminProducts';
import { orderStatusBody, homeContentSchema } from '../schemas';
import { HOME_KEY } from '../lib/homeContent';
import { Prisma } from '@prisma/client';
import { orderEvents, OrderEvent } from '../lib/events';

export const adminRouter = Router();

// Every /admin route requires a valid token AND the ADMIN role.
// requireAuth first → 401 when unauthenticated; requireAdmin → 403 when not admin.
adminRouter.use(requireAuth, requireAdmin);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /admin/upload-signature — authorize an image upload for the active store.
// Cloudinary → signed params for a direct browser upload; local → the dev endpoint.
adminRouter.get('/upload-signature', (_req, res) => {
  res.json(imageStore.authorizeUpload());
});

// POST /admin/upload-dev — local dev image store only (Cloudinary uploads go
// direct from the browser). Returns { url, publicId }.
adminRouter.post(
  '/upload-dev',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!(imageStore instanceof LocalImageStore)) throw new HttpError(404, 'Not found');
    if (!req.file) throw new HttpError(400, 'No file uploaded');
    const stored = imageStore.saveUpload({
      originalname: req.file.originalname,
      buffer: req.file.buffer,
    });
    res.status(201).json(stored);
  })
);

// Allowed order status transitions (delivered/cancelled are terminal).
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// PATCH /admin/orders/:id/status — transition an order, validating the move.
adminRouter.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = orderStatusBody.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Order not found');
    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (order.status !== status && !allowed.includes(status)) {
      throw new HttpError(422, `Cannot change order from ${order.status} to ${status}`);
    }
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: orderInclude,
    });

    // Emit the matching lifecycle event (subscribers handle email/logistics later).
    const EVENT_FOR: Record<string, OrderEvent> = {
      shipped: 'order.shipped',
      delivered: 'order.delivered',
      cancelled: 'order.cancelled',
    };
    if (EVENT_FOR[status]) orderEvents.emit(EVENT_FOR[status], { orderId: updated.id });

    res.json(toApiOrder(updated));
  })
);

// PATCH /admin/site/home — replace the home content (fixed slots).
adminRouter.patch(
  '/site/home',
  asyncHandler(async (req, res) => {
    const content = homeContentSchema.parse(req.body);
    await prisma.siteContent.upsert({
      where: { key: HOME_KEY },
      create: { key: HOME_KEY, content: content as Prisma.InputJsonValue },
      update: { content: content as Prisma.InputJsonValue },
    });
    res.json(content);
  })
);

// Product CRUD lives under /admin/products.
adminRouter.use('/products', adminProductsRouter);

// GET /admin/orders — every order across all customers, newest first.
adminRouter.get(
  '/orders',
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    const body: OrderListResponse = { items: orders.map(toApiOrder), total: orders.length };
    res.json(body);
  })
);

// GET /admin/stats — dashboard KPIs.
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [orderCount, revenue, productCount, customerCount] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.product.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);
    res.json({
      totalOrders: orderCount,
      totalRevenue: revenue._sum.total ?? 0,
      totalProducts: productCount,
      totalCustomers: customerCount,
    });
  })
);
