import express from 'express';
import {
  getExportPayments,
  getExportPaymentById,
  createExportPayment,
  updateExportPayment,
  deleteExportPayment,
  getPaymentsByContainerId,
  getExportPaymentStats
} from '../controllers/exportPaymentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Export payment routes
router.get('/', getExportPayments);
router.get('/stats', getExportPaymentStats);
router.get('/:id', getExportPaymentById);
router.post('/', createExportPayment);
router.put('/:id', updateExportPayment);
router.delete('/:id', deleteExportPayment);

// Get payments for specific container
router.get('/container/:containerId', getPaymentsByContainerId);

export default router;
