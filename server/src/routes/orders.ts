import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { createOrderBody } from '../schemas';
import { orderInclude, toApiOrder } from '../lib/mappers';
import { OrderListResponse } from '../contract';

export const ordersRouter = Router();

async function demoUserId(): Promise<string> {
  const user = await prisma.user.findFirst();
  if (!user) throw new HttpError(500, 'No user seeded');
  return user.id;
}

// GET /orders — the customer's orders, newest first.
ordersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    const body: OrderListResponse = { items: orders.map(toApiOrder), total: orders.length };
    res.json(body);
  })
);

// POST /orders — create an order (the checkout write path). Persists to the DB
// and returns the created order in the same shape GET returns.
ordersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createOrderBody.parse(req.body);
    const userId = await demoUserId();
    const id = input.id ?? `SID-${Math.floor(10000 + Math.random() * 89999)}`;
    const date = input.date ?? new Date().toISOString().slice(0, 10);

    const order = await prisma.order.create({
      data: {
        id,
        user: { connect: { id: userId } },
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
