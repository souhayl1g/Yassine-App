import express from 'express';
const router = express.Router();
import batchController from "../controllers/batchController.js"

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

// DELETE /api/batches/:id - Delete batch
router.delete('/:id', batchController.deleteBatch);

export default router;
