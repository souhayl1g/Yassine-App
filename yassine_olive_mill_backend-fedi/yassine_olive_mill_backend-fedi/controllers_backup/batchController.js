import db from "../models/index.js"
import { Op } from 'sequelize';


const { Batch, Client, ProcessingDecision, OilBatch, QualityTest } = db;
const batchController = {
  // GET /api/batches
  getAllBatches: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, clientId } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = {};
      if (status) whereClause.status = status;
      if (clientId) whereClause.clientId = clientId;

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
          pages: Math.ceil(batches.count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/batches/:id
  getBatchById: async (req, res) => {
    try {
      const batch = await Batch.findByPk(req.params.id, {
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
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/batches
  createBatch: async (req, res) => {
    try {
      const { clientId, weight_in, weight_out, net_weight, number_of_boxes } = req.body;
      
      const batch = await Batch.create({
        clientId,
        weight_in,
        weight_out,
        net_weight,
        number_of_boxes,
        status: 'received'
      });

      const fullBatch = await Batch.findByPk(batch.id, {
        include: [{ model: Client, as: 'client' }]
      });

      res.status(201).json(fullBatch);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/batches/:id/status
  updateBatchStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const batch = await Batch.findByPk(req.params.id);
      
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      await batch.update({ status });
      res.json(batch);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

export default batchController;
