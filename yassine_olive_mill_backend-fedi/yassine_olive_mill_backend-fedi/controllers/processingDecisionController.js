import db from "../models/index.js"

const { ProcessingDecision, Batch, Price, Client } = db;

const processingDecisionController = {
  // GET /api/processing-decisions
  getAllProcessingDecisions: async (req, res) => {
    try {
      const { batchId, type } = req.query;
      
      const whereClause = {};
      if (batchId) whereClause.batchId = parseInt(batchId);
      if (type) whereClause.type = type;

      const decisions = await ProcessingDecision.findAll({
        where: whereClause,
        include: [
          { 
            model: Batch, 
            as: 'batch',
            include: [{ model: Client, as: 'client' }]
          },
          { model: Price, as: 'price' }
        ],
        order: [['date', 'DESC']]
      });

      res.json(decisions);
    } catch (error) {
      console.error('Get all processing decisions error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/processing-decisions
  createProcessingDecision: async (req, res) => {
    try {
      const { batchId, type, unit_price, priceId } = req.body;
      
      if (!batchId || !type) {
        return res.status(400).json({ error: 'batchId and type are required' });
      }

      if (!['milling', 'selling'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be milling or selling' });
      }

      // Verify batch exists and is available for processing
      const batch = await Batch.findByPk(parseInt(batchId));
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      if (batch.status === 'completed') {
        return res.status(400).json({ error: 'Batch already processed' });
      }

      const decision = await ProcessingDecision.create({
        batchId: parseInt(batchId),
        type,
        unit_price: unit_price ? parseInt(unit_price) : null,
        priceId: priceId ? parseInt(priceId) : null
      });

      // Update batch status to in_process
      await batch.update({ status: 'in_process' });

      const fullDecision = await ProcessingDecision.findByPk(decision.id, {
        include: [
          { model: Batch, as: 'batch' },
          { model: Price, as: 'price' }
        ]
      });

      res.status(201).json(fullDecision);
    } catch (error) {
      console.error('Create processing decision error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // GET /api/processing-decisions/:id
  getProcessingDecisionById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid processing decision ID' });
      }

      const decision = await ProcessingDecision.findByPk(id, {
        include: [
          { 
            model: Batch, 
            as: 'batch',
            include: [{ model: Client, as: 'client' }]
          },
          { model: Price, as: 'price' }
        ]
      });

      if (!decision) {
        return res.status(404).json({ error: 'Processing decision not found' });
      }

      res.json(decision);
    } catch (error) {
      console.error('Get processing decision by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default processingDecisionController;
