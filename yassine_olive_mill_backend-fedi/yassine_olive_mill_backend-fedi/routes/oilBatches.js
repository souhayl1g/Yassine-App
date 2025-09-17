import express from 'express';
const router = express.Router();
import oilBatchController from "../controllers/oilBatchController.js"

// GET /api/oil-batches - Get all oil batches
router.get('/', oilBatchController.getAllOilBatches);

// GET /api/oil-batches/:id - Get oil batch by ID
router.get('/:id', oilBatchController.getOilBatchById);

// GET /api/oil-batches/:id/traceability - Get full traceability report
router.get('/:id/traceability', oilBatchController.getOilBatchTraceability);

// POST /api/oil-batches - Create new oil batch
router.post('/', oilBatchController.createOilBatch);

export default router;
