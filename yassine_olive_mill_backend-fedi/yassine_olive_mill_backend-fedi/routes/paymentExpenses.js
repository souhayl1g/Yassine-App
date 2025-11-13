import express from 'express';
import {
  getPaymentExpenses,
  getPaymentExpenseById,
  createPaymentExpense,
  updatePaymentExpense,
  deletePaymentExpense
} from '../controllers/paymentExpenseController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Payment expense routes
router.get('/', getPaymentExpenses);
router.get('/:id', getPaymentExpenseById);
router.post('/', createPaymentExpense);
router.put('/:id', updatePaymentExpense);
router.delete('/:id', deletePaymentExpense);

export default router;

