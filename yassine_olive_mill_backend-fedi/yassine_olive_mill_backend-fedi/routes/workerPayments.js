import express from 'express';
import {
  getWorkerPayments,
  getWorkerPaymentById,
  createWorkerPayment,
  updateWorkerPayment,
  deleteWorkerPayment
} from '../controllers/workerPaymentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Worker payment routes
router.get('/', getWorkerPayments);
router.get('/:id', getWorkerPaymentById);
router.post('/', createWorkerPayment);
router.put('/:id', updateWorkerPayment);
router.delete('/:id', deleteWorkerPayment);

export default router;

