import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import operatorController from '../controllers/operatorController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// GET /api/operator/batch/:batchId/details - Get batch details for operator scanner
router.get('/batch/:batchId/details', operatorController.getBatchForOperator);

// GET /api/operator/rooms - Get available pressing rooms for operator
router.get('/rooms', operatorController.getAvailableRooms);

// GET /api/operator/rooms/display-data - Get rooms display data for operator scanner
router.get('/rooms/display-data', operatorController.getRoomsDisplayData);

// GET /api/operator/queue/partially-queued - Get partially queued batches for operator
router.get('/queue/partially-queued', operatorController.getPartiallyQueuedBatches);

// GET /api/operator/batch/:batchId/queue-status - Get queue status for a specific batch
router.get('/batch/:batchId/queue-status', operatorController.getBatchQueueStatus);

// POST /api/operator/queue - Add batch to queue (operator-specific logic)
router.post('/queue', operatorController.addToQueue);

// POST /api/operator/pressing-session - Start pressing session (operator-specific logic)
router.post('/pressing-session', operatorController.startPressingSession);

// PUT /api/operator/batch/:id/load-boxes - Load boxes to pressing room (operator-specific logic)
router.put('/batch/:id/load-boxes', operatorController.loadBoxesToPressing);

// PUT /api/operator/pressing-session/:id/complete - Complete pressing session (operator-specific logic)
router.put('/pressing-session/:id/complete', operatorController.completePressingSession);

// PUT /api/operator/batch/:id - Update batch (operator-specific logic)
router.put('/batch/:id', operatorController.updateBatch);

export default router;
