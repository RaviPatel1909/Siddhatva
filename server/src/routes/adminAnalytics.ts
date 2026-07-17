import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { analyticsProductsQuery, analyticsRangeQuery, analyticsTimeSeriesQuery } from '../schemas';
import {
  getCustomerAnalytics,
  getOrderBreakdown,
  getOverview,
  getRevenueSeries,
  getTopProducts,
} from '../lib/analytics';

// Default number of top products when ?limit is omitted.
const DEFAULT_PRODUCT_LIMIT = 10;

// /admin/analytics/* — mounted under the admin router, so it inherits
// requireAuth + requireAdmin. Handlers stay thin: parse+validate the query with
// Zod (invalid input throws → central 400), then delegate to the analytics
// service. No auth logic here.
export const adminAnalyticsRouter = Router();

// GET /admin/analytics/overview?from&to
adminAnalyticsRouter.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const query = analyticsRangeQuery.parse(req.query);
    res.json(await getOverview(query));
  })
);

// GET /admin/analytics/revenue?from&to&granularity
adminAnalyticsRouter.get(
  '/revenue',
  asyncHandler(async (req, res) => {
    const { from, to, granularity } = analyticsTimeSeriesQuery.parse(req.query);
    res.json(await getRevenueSeries({ from, to }, granularity));
  })
);

// GET /admin/analytics/orders?from&to
adminAnalyticsRouter.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const query = analyticsRangeQuery.parse(req.query);
    res.json(await getOrderBreakdown(query));
  })
);

// GET /admin/analytics/products?limit
adminAnalyticsRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { limit } = analyticsProductsQuery.parse(req.query);
    res.json(await getTopProducts(limit ?? DEFAULT_PRODUCT_LIMIT));
  })
);

// GET /admin/analytics/customers?from&to&granularity
adminAnalyticsRouter.get(
  '/customers',
  asyncHandler(async (req, res) => {
    const { from, to, granularity } = analyticsTimeSeriesQuery.parse(req.query);
    res.json(await getCustomerAnalytics({ from, to }, granularity));
  })
);
