import express from 'express';
const router = express.Router();
import batchController from "../controllers/batchController.js"

// GET /api/batches/next-ticket-number - Get next daily ticket number
router.get('/next-ticket-number', batchController.getNextTicketNumber);

// GET /api/batches - Get all batches with filtering
router.get('/', batchController.getAllBatches);

// GET /api/batches/:id - Get batch by ID
router.get('/:id', batchController.getBatchById);

// POST /api/batches - Create new batch
router.post('/', batchController.createBatch);

// PUT /api/batches/:id - Update batch (generic)
router.put('/:id', batchController.updateBatch);

// PUT /api/batches/:id/status - Update batch status
router.put('/:id/status', batchController.updateBatchStatus);

// PUT /api/batches/:id/assign-room - Assign batch to pressing room
router.put('/:id/assign-room', batchController.assignToRoom);

// PUT /api/batches/:id/complete-session - Complete pressing session
router.put('/:id/complete-session', batchController.completeSession);

// PUT /api/batches/:id/load-boxes - Load boxes to pressing
router.put('/:id/load-boxes', batchController.loadBoxesToPressing);

// DELETE /api/batches/:id - Delete batch
router.delete('/:id', batchController.deleteBatch);

export default router;
