import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import pressingQueueController from '../controllers/pressingQueueController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// POST /api/pressing-queue - Add session to queue
router.post('/', pressingQueueController.addToQueue);

// GET /api/pressing-queue - Get all queued sessions
router.get('/', pressingQueueController.getQueuedSessions);

// POST /api/pressing-queue/process-next - Process next session in queue
router.post('/process-next', pressingQueueController.processNextInQueue);

// DELETE /api/pressing-queue/:id - Remove session from queue
router.delete('/:id', pressingQueueController.removeFromQueue);

// GET /api/pressing-queue/stats - Get queue statistics
router.get('/stats', pressingQueueController.getQueueStats);

// GET /api/pressing-queue/batch/:batch_id/available-boxes - Get available boxes for a batch
router.get('/batch/:batch_id/available-boxes', pressingQueueController.getBatchAvailableBoxes);

// GET /api/pressing-queue/queuer/:queuer_id/session - Get queuer session status
router.get('/queuer/:queuer_id/session', pressingQueueController.getQueuerSessionStatus);

// PUT /api/pressing-queue/queuer/:queuer_id/session - Update queuer session (cancel/complete)
router.put('/queuer/:queuer_id/session', pressingQueueController.updateQueuerSession);

// GET /api/pressing-queue/partially-queued - Get active queuer sessions (batches being queued) system-wide
router.get('/partially-queued', pressingQueueController.getPartiallyQueuedBatches);

export default router;
