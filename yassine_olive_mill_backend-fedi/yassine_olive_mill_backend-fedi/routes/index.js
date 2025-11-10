import express from 'express';
const router = express.Router();

// Import all route modules
import clientRoutes from "./clients.js"
import batchRoutes from "./batches.js"
import pressingSessionRoutes from "./pressingSessions.js"
import oilBatchRoutes from "./oilBatches.js"
import qualityTestRoutes from "./qualityTests.js"
import invoiceRoutes from "./invoices.js"
import paymentRoutes from "./payments.js"
import ticketPaymentRoutes from "./ticketPayments.js"
import exportPaymentRoutes from "./exportPayments.js"
import employeeRoutes from "./employees.js"
import priceRoutes from "./prices.js"
import dashboardRoutes from "./dashboard.js"
import pressingRoomRoutes from "./pressingRooms.js"
import containerRoutes from "./containers.js"
import batchLoadingRoutes from "./batchLoadings.js"
import pressingQueueRoutes from "./pressingQueue.js"
import operatorRoutes from "./operator.js"
import employeeScannerRoutes from "./employee.js"
import userRoutes from "./users.js"
import ownerFundRoutes from "./ownerFunds.js"
import workerRoutes from "./workers.js"
import workerPaymentRoutes from "./workerPayments.js"
import paymentExpenseRoutes from "./paymentExpenses.js"
import oilSaleRoutes from "./oilSales.js"
// Note: printer routes are registered directly in app.js as public routes

// Mount routes
router.use('/clients', clientRoutes);
router.use('/batches', batchRoutes);
router.use('/pressing-sessions', pressingSessionRoutes);
router.use('/oil-batches', oilBatchRoutes);
router.use('/quality-tests', qualityTestRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/ticket-payments', ticketPaymentRoutes);
router.use('/export-payments', exportPaymentRoutes);
router.use('/employees', employeeRoutes);
router.use('/prices', priceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/pressing-rooms', pressingRoomRoutes);
router.use('/containers', containerRoutes);
router.use('/batch-loadings', batchLoadingRoutes);
router.use('/pressing-queue', pressingQueueRoutes);
router.use('/operator', operatorRoutes);
router.use('/employee', employeeScannerRoutes);
router.use('/users', userRoutes);
router.use('/owner-funds', ownerFundRoutes);
router.use('/workers', workerRoutes);
router.use('/worker-payments', workerPaymentRoutes);
router.use('/payment-expenses', paymentExpenseRoutes);
router.use('/oil-sales', oilSaleRoutes);
// Note: printer routes are registered directly in app.js as public routes

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Olive Oil Mill API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
