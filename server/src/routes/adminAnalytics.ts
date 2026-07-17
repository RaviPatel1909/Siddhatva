import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { analyticsRangeQuery } from '../schemas';
import { getOverview } from '../lib/analytics';

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
