import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { getSalesMetrics, getRevenueMetrics, getEfficiencyMetrics, getCustomerMetrics, getDashboardSummary, getMonthlyTrends, getSalesMetricsForDateRange, getRevenueMetricsForDateRange, getEfficiencyMetricsForDateRange, getCustomerMetricsForDateRange, getDashboardSummaryForDateRange, getSalesMetricsForFullYear, getRevenueMetricsForFullYear, getEfficiencyMetricsForFullYear, getCustomerMetricsForFullYear, getDashboardSummaryForFullYear, getAgentPerformance, getGlobalSummary, invalidateCache, getUserActivities, getActivityStats, getUserStats, getEntityPopularity } from '../controllers/analyticsController.js';
const router = express.Router();
router.use(validateJWT);
// Single month
router.get('/analytics/sales', authorize('admin', 'agent'), getSalesMetrics);
router.get('/analytics/revenue', authorize('admin', 'agent'), getRevenueMetrics);
router.get('/analytics/efficiency', authorize('admin', 'agent'), getEfficiencyMetrics);
router.get('/analytics/customers', authorize('admin', 'agent'), getCustomerMetrics);
router.get('/analytics/dashboard', authorize('admin', 'agent'), getDashboardSummary);
router.get('/analytics/trends', authorize('admin', 'agent'), getMonthlyTrends);
// Date range
router.get('/analytics/sales/range', authorize('admin', 'agent'), getSalesMetricsForDateRange);
router.get('/analytics/revenue/range', authorize('admin', 'agent'), getRevenueMetricsForDateRange);
router.get('/analytics/efficiency/range', authorize('admin', 'agent'), getEfficiencyMetricsForDateRange);
router.get('/analytics/customers/range', authorize('admin', 'agent'), getCustomerMetricsForDateRange);
router.get('/analytics/dashboard/range', authorize('admin', 'agent'), getDashboardSummaryForDateRange);
// Full year
router.get('/analytics/sales/year', authorize('admin', 'agent'), getSalesMetricsForFullYear);
router.get('/analytics/revenue/year', authorize('admin', 'agent'), getRevenueMetricsForFullYear);
router.get('/analytics/efficiency/year', authorize('admin', 'agent'), getEfficiencyMetricsForFullYear);
router.get('/analytics/customers/year', authorize('admin', 'agent'), getCustomerMetricsForFullYear);
router.get('/analytics/dashboard/year', authorize('admin', 'agent'), getDashboardSummaryForFullYear);
// Admin analytics
router.get('/admin/analytics/agent-performance', authorize('admin'), getAgentPerformance);
router.get('/admin/analytics/global-summary', authorize('admin'), getGlobalSummary);
router.post('/admin/analytics/cache/invalidate/:agent_id', authorize('admin'), invalidateCache);
router.get('/admin/activities', authorize('admin'), getUserActivities);
router.get('/admin/activity-stats', authorize('admin'), getActivityStats);
router.get('/admin/user-stats', authorize('admin'), getUserStats);
router.get('/admin/popular-entities', authorize('admin'), getEntityPopularity);
export default router;
