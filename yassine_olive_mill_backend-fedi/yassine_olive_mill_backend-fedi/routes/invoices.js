import express from 'express';
const router = express.Router();
import db from "../models/index.js"
const { Invoice, Client, Batch, Payment } = db;

// GET /api/invoices - Get all invoices
router.get('/', async (req, res) => {
  try {
    const { status, clientId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (clientId) whereClause.clientId = clientId;

    const invoices = await Invoice.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: Client, as: 'client' },
        { model: Batch, as: 'batch' },
        { model: Payment, as: 'payments' }
      ],
      order: [['issue_date', 'DESC']]
    });

    res.json({
      invoices: invoices.rows,
      pagination: {
        total: invoices.count,
        page: parseInt(page),
        pages: Math.ceil(invoices.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/invoices - Create new invoice
router.post('/', async (req, res) => {
  try {
    const { clientId, batchId, processing_decisionId, amount, due_date, notes } = req.body;
    
    const invoice = await Invoice.create({
      clientId,
      batchId,
      processing_decisionId,
      amount,
      issue_date: new Date(),
      due_date,
      notes,
      status: 'draft'
    });

    const fullInvoice = await Invoice.findByPk(invoice.id, {
      include: [{ model: Client, as: 'client' }]
    });

    res.status(201).json(fullInvoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/invoices/:id/status - Update invoice status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await invoice.update({ status });
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
