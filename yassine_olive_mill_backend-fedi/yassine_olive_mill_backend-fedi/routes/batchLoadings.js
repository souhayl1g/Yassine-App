import express from 'express';
const router = express.Router();
import batchLoadingController from "../controllers/batchLoadingController.js";

// GET /api/batch-loadings - Get all batch loadings with filtering and pagination
router.get('/', batchLoadingController.getAllBatchLoadings);

// GET /api/batch-loadings/:id - Get batch loading by ID
router.get('/:id', batchLoadingController.getBatchLoadingById);

// POST /api/batch-loadings - Create new batch loading record
router.post('/', batchLoadingController.createBatchLoading);

// GET /api/batch-loadings/history/:batchId - Get loading history for a specific batch
router.get('/history/:batchId', batchLoadingController.getBatchLoadingHistory);

// GET /api/batch-loadings/session/:pressingSessionId - Get loading history for a specific session
router.get('/session/:pressingSessionId', batchLoadingController.getSessionLoadingHistory);

export default router;
