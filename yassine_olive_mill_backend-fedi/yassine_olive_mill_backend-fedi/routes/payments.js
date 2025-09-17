import express from 'express';
const router = express.Router();
import db from "../models/index.js"
const { Payment, Invoice } = db;

// GET /api/payments - Get all payments
router.get('/', async (req, res) => {
  try {
    const { invoiceId } = req.query;
    
    const whereClause = {};
    if (invoiceId) whereClause.invoiceId = invoiceId;

    const payments = await Payment.findAll({
      where: whereClause,
      include: [{ model: Invoice, as: 'invoice' }],
      order: [['payment_date', 'DESC']]
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments - Record new payment
router.post('/', async (req, res) => {
  try {
    const { invoiceId, amount, payment_method, reference } = req.body;
    
    // Verify invoice exists
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const payment = await Payment.create({
      invoiceId,
      amount,
      payment_date: new Date(),
      payment_method,
      reference
    });

    // Check if invoice is fully paid
    const totalPaid = await Payment.sum('amount', { where: { invoiceId } });
    if (totalPaid >= invoice.amount) {
      await invoice.update({ status: 'paid' });
    }

    const fullPayment = await Payment.findByPk(payment.id, {
      include: [{ model: Invoice, as: 'invoice' }]
    });

    res.status(201).json(fullPayment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
