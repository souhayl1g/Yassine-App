import express from 'express';
const router = express.Router();
import dashboardController from "../controllers/dashboardController.js"

// GET /api/dashboard/overview - Get dashboard overview metrics
router.get('/overview', dashboardController.getOverview);

// GET /api/dashboard/production-summary - Get production summary
router.get('/production-summary', dashboardController.getProductionSummary);

// GET /api/dashboard/financial-summary - Get financial summary
router.get('/financial-summary', dashboardController.getFinancialSummary);

// GET /api/dashboard/activity - Get recent activity events
router.get('/activity', dashboardController.getRecentActivity);

export default router;
