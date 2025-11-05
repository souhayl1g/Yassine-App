import express from 'express';
import {
  getTicketPayments,
  getTicketPaymentById,
  createTicketPayment,
  updateTicketPayment,
  deleteTicketPayment,
  getPaymentsByTicketId,
  getTicketPaymentStats
} from '../controllers/ticketPaymentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Ticket payment routes
router.get('/', getTicketPayments);
router.get('/stats', getTicketPaymentStats);
router.get('/:id', getTicketPaymentById);
router.post('/', createTicketPayment);
router.put('/:id', updateTicketPayment);
router.delete('/:id', deleteTicketPayment);

// Get payments for specific ticket
router.get('/ticket/:ticketId', getPaymentsByTicketId);

export default router;
