import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { orderInclude, toApiOrder } from '../lib/mappers';
import { AdminStats, OrderListResponse } from '../contract';
import { imageStore, LocalImageStore } from '../lib/imageStore';
import { adminProductsRouter } from './adminProducts';
import { orderStatusBody, homeContentSchema } from '../schemas';
import { HOME_KEY } from '../lib/homeContent';
import { Prisma } from '@prisma/client';
import { orderEvents, OrderEvent } from '../lib/events';
import { shipOrder } from '../lib/orderShipping';

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

// POST /admin/orders/:id/ship — create the shipment for a PAID order via the
// ShippingProvider (Shiprocket/mock), persist AWB/label/tracking, advance the
// order to `shipped`, and emit order.shipped (→ Phase 7 shipping email).
// Idempotent: re-calling returns the existing shipment without duplicating.
adminRouter.post(
  '/orders/:id/ship',
  asyncHandler(async (req, res) => {
    const { order, created } = await shipOrder(req.params.id);
    res.status(created ? 201 : 200).json(toApiOrder(order));
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

// A variant at or below this stock count (but not zero) is "low stock".
const LOW_STOCK_THRESHOLD = 5;
// How many trailing months the sales chart covers.
const SALES_MONTHS = 6;
const MONTH_LABELS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

// Bucket paid-order revenue into the last `count` calendar months (oldest first).
// Empty months stay at 0 so a new store charts a real, mostly-flat baseline.
function buildSalesByMonth(
  orders: { total: number; createdAt: Date }[],
  count: number
): AdminStats['salesByMonth'] {
  const now = new Date();
  const buckets = Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), revenue: 0 };
  });
  for (const o of orders) {
    const bucket = buckets.find(
      (b) => b.year === o.createdAt.getFullYear() && b.month === o.createdAt.getMonth()
    );
    if (bucket) bucket.revenue += o.total;
  }
  return buckets.map((b) => ({ month: MONTH_LABELS[b.month], revenue: Math.round(b.revenue) }));
}

// GET /admin/stats — real dashboard aggregates. Revenue counts PAID orders only.
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [orders, paidAgg, paidOrders, customers, products, lowStock, outOfStock, reviews, paidForChart] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } }),
        prisma.order.count({ where: { paymentStatus: 'PAID' } }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.product.count(),
        prisma.variant.count({ where: { stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
        prisma.variant.count({ where: { stock: 0 } }),
        prisma.review.count(),
        prisma.order.findMany({
          where: { paymentStatus: 'PAID' },
          select: { total: true, createdAt: true },
        }),
      ]);

    const revenue = Math.round(paidAgg._sum.total ?? 0);
    const stats: AdminStats = {
      revenue,
      orders,
      paidOrders,
      customers,
      avgOrderValue: paidOrders > 0 ? Math.round(revenue / paidOrders) : 0,
      products,
      lowStock,
      outOfStock,
      reviews,
      salesByMonth: buildSalesByMonth(paidForChart, SALES_MONTHS),
    };
    res.json(stats);
  })
);
