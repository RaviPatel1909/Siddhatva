import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AnalyticsOrders, AnalyticsOverview, RevenuePoint, TopProduct } from '../contract';

export type Granularity = 'day' | 'week' | 'month';

// Analytics aggregation service. Business logic lives here (routes stay thin);
// every time bucket + from/to boundary is resolved against IST (UTC+05:30) days,
// since this is a domestic-India store. Revenue counts PAID orders only, in
// whole INR rupees — consistent with AdminStats.revenue.

const IST_OFFSET_MIN = 330; // +05:30
const MS_PER_MIN = 60_000;
const MS_PER_DAY = 86_400_000;

// Mirrors /admin/stats: a variant at or below this (but > 0) is "low stock".
const LOW_STOCK_THRESHOLD = 5;

// The UTC instant of IST-midnight for the given IST calendar day. Date.UTC
// normalizes out-of-range day/month (e.g. day 0, month -1, month 12).
function istDayStartUtcMs(y: number, m0: number, d: number): number {
  return Date.UTC(y, m0, d) - IST_OFFSET_MIN * MS_PER_MIN;
}

// A UTC instant → its IST wall-clock calendar fields.
function istParts(instant: Date): { y: number; m0: number; d: number } {
  const w = new Date(instant.getTime() + IST_OFFSET_MIN * MS_PER_MIN);
  return { y: w.getUTCFullYear(), m0: w.getUTCMonth(), d: w.getUTCDate() };
}

// Parse a validated 'YYYY-MM-DD' (Zod already guaranteed it's a real date).
function parseIstDay(s: string): { y: number; m0: number; d: number } {
  const [y, mo, d] = s.split('-').map(Number);
  return { y, m0: mo - 1, d };
}

// Build a Prisma `createdAt` filter for an inclusive IST-day [from, to] range,
// as a half-open UTC interval [fromStart, (to+1day)start). Returns undefined when
// neither bound is set (→ no date constraint, i.e. all-time).
export function istRangeFilter(
  from?: string,
  to?: string
): Prisma.DateTimeFilter | undefined {
  const filter: Prisma.DateTimeFilter = {};
  if (from) {
    const f = parseIstDay(from);
    filter.gte = new Date(istDayStartUtcMs(f.y, f.m0, f.d));
  }
  if (to) {
    const t = parseIstDay(to);
    filter.lt = new Date(istDayStartUtcMs(t.y, t.m0, t.d) + MS_PER_DAY);
  }
  return filter.gte || filter.lt ? filter : undefined;
}

// GET /admin/analytics/overview — headline metrics. Revenue/orders/customers/
// reviews respect the date range; inventory (lowStock/outOfStock) is always
// current-state. Six aggregate/count queries in parallel — no per-row work.
export async function getOverview(range: {
  from?: string;
  to?: string;
}): Promise<AnalyticsOverview> {
  const createdAt = istRangeFilter(range.from, range.to);
  const orderWhere: Prisma.OrderWhereInput = createdAt ? { createdAt } : {};

  const [orders, paidAgg, paidOrders, customers, reviews, lowStock, outOfStock] =
    await Promise.all([
      prisma.order.count({ where: orderWhere }),
      prisma.order.aggregate({ _sum: { total: true }, where: { ...orderWhere, paymentStatus: 'PAID' } }),
      prisma.order.count({ where: { ...orderWhere, paymentStatus: 'PAID' } }),
      prisma.user.count({ where: { role: 'CUSTOMER', ...(createdAt ? { createdAt } : {}) } }),
      prisma.review.count({ where: createdAt ? { createdAt } : {} }),
      prisma.variant.count({ where: { stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
      prisma.variant.count({ where: { stock: 0 } }),
    ]);

  const revenue = Math.round(paidAgg._sum.total ?? 0);
  return {
    revenue,
    orders,
    paidOrders,
    customers,
    averageOrderValue: paidOrders > 0 ? Math.round(revenue / paidOrders) : 0,
    lowStock,
    outOfStock,
    reviews,
  };
}

// --- Shared IST time-bucketing (reused by revenue + customer time-series) ---

const pad2 = (n: number) => String(n).padStart(2, '0');

// Start-of-bucket (as a UTC instant ms) for the IST day/week/month containing
// `instant`. Weeks start Monday (IST). Date.UTC normalizes negative/overflow.
function bucketStartMs(instant: Date, g: Granularity): number {
  const { y, m0, d } = istParts(instant);
  if (g === 'month') return istDayStartUtcMs(y, m0, 1);
  if (g === 'week') {
    const dow = new Date(instant.getTime() + IST_OFFSET_MIN * MS_PER_MIN).getUTCDay(); // 0=Sun..6=Sat
    return istDayStartUtcMs(y, m0, d - ((dow + 6) % 7)); // back to Monday
  }
  return istDayStartUtcMs(y, m0, d);
}

// Bucket label: month → 'YYYY-MM', day/week → 'YYYY-MM-DD' (week = its Monday).
function bucketKey(startMs: number, g: Granularity): string {
  const { y, m0, d } = istParts(new Date(startMs));
  return g === 'month' ? `${y}-${pad2(m0 + 1)}` : `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}

function nextBucketStartMs(startMs: number, g: Granularity): number {
  if (g === 'day') return startMs + MS_PER_DAY;
  if (g === 'week') return startMs + 7 * MS_PER_DAY;
  const { y, m0 } = istParts(new Date(startMs));
  return istDayStartUtcMs(y, m0 + 1, 1);
}

// Resolve the bounded [startMs, endMsExclusive) window for a time-series request.
// Explicit from/to win; otherwise a trailing window ending today (IST) sized by
// granularity: day → 30 days, week → ~12 weeks, month → 12 months.
export function resolveSeriesWindow(
  from: string | undefined,
  to: string | undefined,
  g: Granularity
): { startMs: number; endMsExclusive: number } {
  const nowP = istParts(new Date());
  const toDay = to ? parseIstDay(to) : nowP;
  const toStartMs = istDayStartUtcMs(toDay.y, toDay.m0, toDay.d);
  const endMsExclusive = toStartMs + MS_PER_DAY;

  let startMs: number;
  if (from) {
    const f = parseIstDay(from);
    startMs = istDayStartUtcMs(f.y, f.m0, f.d);
  } else if (g === 'day') {
    startMs = toStartMs - 29 * MS_PER_DAY;
  } else if (g === 'week') {
    startMs = toStartMs - 83 * MS_PER_DAY; // ~12 weeks
  } else {
    startMs = istDayStartUtcMs(toDay.y, toDay.m0 - 11, 1); // 12 months
  }
  return { startMs, endMsExclusive };
}

// Ordered, zero-filled buckets spanning [startMs, endMsExclusive) plus a
// key→index lookup — the shared skeleton every time-series fills.
function emptyBuckets<T extends { date: string }>(
  startMs: number,
  endMsExclusive: number,
  g: Granularity,
  make: (date: string) => T
): { series: T[]; indexByKey: Map<string, number> } {
  const series: T[] = [];
  const indexByKey = new Map<string, number>();
  let cur = bucketStartMs(new Date(startMs), g);
  while (cur < endMsExclusive) {
    const key = bucketKey(cur, g);
    indexByKey.set(key, series.length);
    series.push(make(key));
    cur = nextBucketStartMs(cur, g);
  }
  return { series, indexByKey };
}

// GET /admin/analytics/revenue — PAID revenue + paid-order count per bucket.
// One query (createdAt-filtered, minimal columns) then in-memory bucketing —
// mirrors the existing salesByMonth approach; no N+1.
export async function getRevenueSeries(
  range: { from?: string; to?: string },
  granularity: Granularity | undefined
): Promise<RevenuePoint[]> {
  const g = granularity ?? 'month';
  const { startMs, endMsExclusive } = resolveSeriesWindow(range.from, range.to, g);

  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: 'PAID',
      createdAt: { gte: new Date(startMs), lt: new Date(endMsExclusive) },
    },
    select: { createdAt: true, total: true },
  });

  const { series, indexByKey } = emptyBuckets(startMs, endMsExclusive, g, (date) => ({
    date,
    revenue: 0,
    orders: 0,
  }));
  for (const o of orders) {
    const idx = indexByKey.get(bucketKey(bucketStartMs(o.createdAt, g), g));
    if (idx !== undefined) {
      series[idx].revenue += o.total;
      series[idx].orders += 1;
    }
  }
  for (const p of series) p.revenue = Math.round(p.revenue);
  return series;
}

// GET /admin/analytics/orders — counts across the THREE independent status axes
// (fulfillment / payment / shipping). One groupBy per axis (parallel, no N+1);
// each named bucket defaults to 0, so an empty store returns all zeros.
export async function getOrderBreakdown(range: {
  from?: string;
  to?: string;
}): Promise<AnalyticsOrders> {
  const createdAt = istRangeFilter(range.from, range.to);
  const where: Prisma.OrderWhereInput = createdAt ? { createdAt } : {};

  const [byStatus, byPayment, byShipping] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.order.groupBy({ by: ['paymentStatus'], where, _count: { _all: true } }),
    prisma.order.groupBy({ by: ['shippingStatus'], where, _count: { _all: true } }),
  ]);

  const statusN = new Map(byStatus.map((g) => [g.status, g._count._all]));
  const paymentN = new Map(byPayment.map((g) => [g.paymentStatus, g._count._all]));
  const shippingN = new Map(byShipping.map((g) => [g.shippingStatus, g._count._all]));
  const at = (m: Map<string, number>, k: string) => m.get(k) ?? 0;

  return {
    fulfillment: {
      processing: at(statusN, 'processing'),
      shipped: at(statusN, 'shipped'),
      delivered: at(statusN, 'delivered'),
      cancelled: at(statusN, 'cancelled'),
    },
    payment: {
      pendingPayment: at(paymentN, 'PENDING'),
      paid: at(paymentN, 'PAID'),
      failedPayment: at(paymentN, 'FAILED'),
    },
    shipping: {
      notShipped: at(shippingN, 'not_shipped'),
      shipmentCreated: at(shippingN, 'shipment_created'),
      inTransit: at(shippingN, 'in_transit'),
      outForDelivery: at(shippingN, 'out_for_delivery'),
      delivered: at(shippingN, 'delivered'),
      cancelled: at(shippingN, 'cancelled'),
    },
  };
}

// GET /admin/analytics/products — top products by units sold, PAID orders only.
// Aggregated in memory because per-line revenue is quantity*price and orderCount
// is a DISTINCT-order count — neither expressible in a single groupBy. One query
// (PAID order items) then a single reduce; no N+1. productName is the
// denormalized OrderItem.name, so it survives a product hard-delete.
export async function getTopProducts(limit: number): Promise<TopProduct[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: { paymentStatus: 'PAID' } },
    select: { productId: true, name: true, quantity: true, price: true, orderId: true },
  });

  type Agg = {
    productId: string;
    productName: string;
    unitsSold: number;
    revenue: number;
    orders: Set<string>;
  };
  const byProduct = new Map<string, Agg>();
  for (const it of items) {
    let a = byProduct.get(it.productId);
    if (!a) {
      a = { productId: it.productId, productName: it.name, unitsSold: 0, revenue: 0, orders: new Set() };
      byProduct.set(it.productId, a);
    }
    a.unitsSold += it.quantity;
    a.revenue += it.quantity * it.price;
    a.orders.add(it.orderId);
    a.productName = it.name; // denormalized; keep the most recent label seen
  }

  return [...byProduct.values()]
    .map((a) => ({
      productId: a.productId,
      productName: a.productName,
      unitsSold: a.unitsSold,
      revenue: Math.round(a.revenue),
      orderCount: a.orders.size,
    }))
    .sort((x, y) => y.unitsSold - x.unitsSold || y.revenue - x.revenue)
    .slice(0, limit);
}
