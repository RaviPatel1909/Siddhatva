import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { createOrderBody, paymentVerifyBody } from '../schemas';
import { orderInclude, toApiOrder } from '../lib/mappers';
import { OrderListResponse } from '../contract';
import { orderEvents } from '../lib/events';
import { MockGateway, paymentGateway } from '../lib/payments';
import { markOrderPaid } from '../lib/orderPayments';

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

// POST /orders — create an order for the authenticated user (payment PENDING).
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
    orderEvents.emit('order.placed', { orderId: order.id });
    res.status(201).json(toApiOrder(order));
  })
);

// POST /orders/verify — verify the Razorpay Checkout result and mark PAID.
// (Declared before /:id so "verify" isn't captured as an order id.)
ordersRouter.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentVerifyBody.parse(
      req.body
    );
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: razorpay_order_id, userId: req.user!.id },
    });
    if (!order) throw new HttpError(404, 'Order not found');

    const valid = paymentGateway.verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) throw new HttpError(400, 'Payment signature verification failed');

    // Idempotent — the webhook may have already marked it PAID.
    await markOrderPaid(order.id, razorpay_payment_id);
    const updated = await prisma.order.findUnique({ where: { id: order.id }, include: orderInclude });
    res.json(toApiOrder(updated!));
  })
);

// GET /orders/:id — a single order (for the confirmation page to read the
// server-verified PAID state).
ordersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: orderInclude,
    });
    if (!order) throw new HttpError(404, 'Order not found');
    res.json(toApiOrder(order));
  })
);

// POST /orders/:id/pay-init — create a gateway order and return what the client
// needs to open Checkout.
ordersRouter.post(
  '/:id/pay-init',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!order) throw new HttpError(404, 'Order not found');
    if (order.paymentStatus === 'PAID') throw new HttpError(409, 'Order already paid');

    const amount = Math.round(order.total * 100); // paise, integer
    const gatewayOrder = await paymentGateway.createOrder({
      amount,
      currency: 'INR',
      receipt: order.id,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: gatewayOrder.id, paymentStatus: 'PENDING' },
    });

    res.json({
      razorpayOrderId: gatewayOrder.id,
      keyId: paymentGateway.keyId,
      amount,
      currency: 'INR',
      mode: paymentGateway.mode,
    });
  })
);

// POST /orders/:id/pay-mock — DEV ONLY (mock gateway). Stands in for Razorpay
// Checkout by returning a signed payment result the client posts to /verify.
ordersRouter.post(
  '/:id/pay-mock',
  asyncHandler(async (req, res) => {
    if (!(paymentGateway instanceof MockGateway)) throw new HttpError(404, 'Not found');
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!order || !order.razorpayOrderId) throw new HttpError(400, 'Call pay-init first');
    const { paymentId, signature } = paymentGateway.simulatePayment(order.razorpayOrderId);
    res.json({
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
  })
);
