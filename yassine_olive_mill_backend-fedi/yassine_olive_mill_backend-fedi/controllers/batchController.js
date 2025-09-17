import db from "../models/index.js"
import { Op } from 'sequelize';

const { Batch, Client, ProcessingDecision, OilBatch, QualityTest } = db;

const batchController = {
  // GET /api/batches
  getAllBatches: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, clientId } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const whereClause = {};
      if (status) whereClause.status = status;
      if (clientId) whereClause.clientId = parseInt(clientId);

      const batches = await Batch.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          { model: Client, as: 'client', attributes: ['id', 'firstname', 'lastname'] },
          { model: ProcessingDecision, as: 'processingDecisions' },
          { model: OilBatch, as: 'oilBatches' }
        ],
        order: [['date_received', 'DESC']]
      });

      res.json({
        batches: batches.rows,
        pagination: {
          total: batches.count,
          page: parseInt(page),
          pages: Math.ceil(batches.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get all batches error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/batches/:id
  getBatchById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
      }

      const batch = await Batch.findByPk(id, {
        include: [
          { model: Client, as: 'client' },
          { model: ProcessingDecision, as: 'processingDecisions' },
          { 
            model: OilBatch, 
            as: 'oilBatches',
            include: [{ model: QualityTest, as: 'qualityTests' }]
          }
        ]
      });

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      res.json(batch);
    } catch (error) {
      console.error('Get batch by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/batches
  createBatch: async (req, res) => {
    try {
      const { clientId, weight_in, weight_out, net_weight, number_of_boxes } = req.body;
      
      if (!clientId || !net_weight || !number_of_boxes) {
        return res.status(400).json({ error: 'clientId, net_weight, and number_of_boxes are required' });
      }

      const batch = await Batch.create({
        clientId: parseInt(clientId),
        weight_in: weight_in ? parseInt(weight_in) : null,
        weight_out: weight_out ? parseInt(weight_out) : null,
        net_weight: parseInt(net_weight),
        number_of_boxes: parseInt(number_of_boxes),
        status: 'received'
      });

      const fullBatch = await Batch.findByPk(batch.id, {
        include: [{ model: Client, as: 'client' }]
      });

      res.status(201).json(fullBatch);
    } catch (error) {
      console.error('Create batch error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/batches/:id/status
  updateBatchStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
      }

      if (!status || !['received', 'in_process', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const batch = await Batch.findByPk(id);
      
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      await batch.update({ status });
      res.json(batch);
    } catch (error) {
      console.error('Update batch status error:', error);
      res.status(400).json({ error: error.message });
    }
  }
,

  // PUT /api/batches/:id - generic update
  updateBatch: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid batch ID' });

      const batch = await Batch.findByPk(id);
      if (!batch) return res.status(404).json({ error: 'Batch not found' });

      // Accept either camelCase or snake_case field names
      const updatable = {};
      const mapping = {
        weightIn: 'weight_in',
        weightOut: 'weight_out',
        netWeight: 'net_weight',
        numberOfBoxes: 'number_of_boxes',
        unitPrice: 'unit_price',
        totalAmount: 'total_amount',
        status: 'status',
        isPaid: 'is_paid',
        paymentMethod: 'payment_method',
        paymentReference: 'payment_reference',
        datePaid: 'date_paid',
      };

      Object.keys(req.body || {}).forEach((key) => {
        const snake = mapping[key] || key;
        updatable[snake] = req.body[key];
      });

      await batch.update(updatable);
      const updated = await Batch.findByPk(id, { include: [{ model: Client, as: 'client' }] });
      res.json(updated);
    } catch (error) {
      console.error('Update batch error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/batches/:id
  deleteBatch: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid batch ID' });

      const batch = await Batch.findByPk(id);
      if (!batch) return res.status(404).json({ error: 'Batch not found' });

      await batch.destroy();
      res.json({ success: true, id });
    } catch (error) {
      console.error('Delete batch error:', error);
      res.status(400).json({ error: error.message });
    }
  }
};

export default batchController;
