import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AnalyticsOverview } from '../contract';

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
