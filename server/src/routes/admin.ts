import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../lib/http';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { orderInclude, toApiOrder } from '../lib/mappers';
import { OrderListResponse } from '../contract';

export const adminRouter = Router();

// Every /admin route requires a valid token AND the ADMIN role.
// requireAuth first → 401 when unauthenticated; requireAdmin → 403 when not admin.
adminRouter.use(requireAuth, requireAdmin);

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
