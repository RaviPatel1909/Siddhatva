import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { createOrderBody } from '../schemas';
import { orderInclude, toApiOrder } from '../lib/mappers';
import { OrderListResponse } from '../contract';

export const ordersRouter = Router();

// Orders are always scoped to the authenticated user.
ordersRouter.use(requireAuth);

// GET /orders — the authenticated user's orders, newest first.
ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    const body: OrderListResponse = { items: orders.map(toApiOrder), total: orders.length };
    res.json(body);
  })
);

// POST /orders — create an order for the authenticated user.
ordersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createOrderBody.parse(req.body);
    const id = input.id ?? `SID-${Math.floor(10000 + Math.random() * 89999)}`;
    const date = input.date ?? new Date().toISOString().slice(0, 10);

    const order = await prisma.order.create({
      data: {
        id,
        user: { connect: { id: req.user!.id } },
        customerName: input.customerName,
        date,
        status: 'processing',
        subtotal: input.subtotal,
        shipping: input.shipping,
        tax: input.tax,
        total: input.total,
        shippingAddress: { create: { ...input.shippingAddress } },
        items: { create: input.items.map((it, i) => ({ ...it, position: i })) },
      },
      include: orderInclude,
    });
    res.status(201).json(toApiOrder(order));
  })
);
