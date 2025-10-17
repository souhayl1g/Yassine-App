import db from "../models/index.js"

const { OilBatch, Batch, PressingSession, QualityTest, ContainerOilBatch, Client, ProcessingDecision, PressingRoom, ContainerContent, Container } = db;

const oilBatchController = {
  // GET /api/oil-batches
  getAllOilBatches: async (req, res) => {
    try {
      const { batchId, pressing_sessionId, tested } = req.query;
      
      const whereClause = {};
      if (batchId) whereClause.batchId = parseInt(batchId);
      if (pressing_sessionId) whereClause.pressing_sessionId = parseInt(pressing_sessionId);

      const oilBatches = await OilBatch.findAll({
        where: whereClause,
        include: [
          { model: Batch, as: 'batch', include: [{ model: Client, as: 'client' }] },
          { model: PressingSession, as: 'pressingSession' },
          { model: QualityTest, as: 'qualityTests' },
          { model: ContainerOilBatch, as: 'containerOilBatches' }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Filter by tested status if requested
      let filteredBatches = oilBatches;
      if (tested === 'true') {
        filteredBatches = oilBatches.filter(batch => batch.qualityTests.length > 0);
      } else if (tested === 'false') {
        filteredBatches = oilBatches.filter(batch => batch.qualityTests.length === 0);
      }

      res.json(filteredBatches);
    } catch (error) {
      console.error('Get all oil batches error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/oil-batches
  createOilBatch: async (req, res) => {
    try {
      const { weight, residue, batchId, pressing_sessionId } = req.body;
      
      if (!weight) {
        return res.status(400).json({ error: 'weight is required' });
      }

      const oilBatch = await OilBatch.create({
        weight: parseInt(weight),
        residue: residue ? parseInt(residue) : null,
        batchId: batchId ? parseInt(batchId) : null,
        pressing_sessionId: pressing_sessionId ? parseInt(pressing_sessionId) : null
      });

      const fullOilBatch = await OilBatch.findByPk(oilBatch.id, {
        include: [
          { model: Batch, as: 'batch' },
          { model: PressingSession, as: 'pressingSession' }
        ]
      });

      res.status(201).json(fullOilBatch);
    } catch (error) {
      console.error('Create oil batch error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // GET /api/oil-batches/:id
  getOilBatchById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid oil batch ID' });
      }

      const oilBatch = await OilBatch.findByPk(id, {
        include: [
          { model: Batch, as: 'batch', include: [{ model: Client, as: 'client' }] },
          { model: PressingSession, as: 'pressingSession' },
          { model: QualityTest, as: 'qualityTests' },
          { model: ContainerOilBatch, as: 'containerOilBatches' }
        ]
      });

      if (!oilBatch) {
        return res.status(404).json({ error: 'Oil batch not found' });
      }

      res.json(oilBatch);
    } catch (error) {
      console.error('Get oil batch by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/oil-batches/with-container
  createOilBatchWithContainer: async (req, res) => {
    try {
      const { weight, residue, batchId, pressing_sessionId, containerId } = req.body;
      
      if (!weight) {
        return res.status(400).json({ error: 'weight is required' });
      }

      if (!containerId) {
        return res.status(400).json({ error: 'containerId is required' });
      }

      // Verify container exists
      const container = await Container.findByPk(containerId);
      if (!container) {
        return res.status(404).json({ error: 'Container not found' });
      }

      // Start a transaction to ensure data consistency
      const transaction = await db.sequelize.transaction();

      try {
        // Create the oil batch
        const oilBatch = await OilBatch.create({
          weight: parseInt(weight),
          residue: residue ? parseInt(residue) : null,
          batchId: batchId ? parseInt(batchId) : null,
          pressing_sessionId: pressing_sessionId ? parseInt(pressing_sessionId) : null
        }, { transaction });

        // Get the current total weight in the container
        const latestContent = await ContainerContent.findOne({
          where: { containerId: containerId },
          order: [['recorded_at', 'DESC']],
          transaction
        });

        const currentWeight = latestContent ? latestContent.total_weight : 0;
        const newTotalWeight = currentWeight + parseInt(weight);

        // Create new container content record
        const containerContent = await ContainerContent.create({
          containerId: parseInt(containerId),
          total_weight: newTotalWeight,
          recorded_at: new Date()
        }, { transaction });

        // Link the oil batch to the container content
        await ContainerOilBatch.create({
          containerContentId: containerContent.id,
          oilBatchId: oilBatch.id,
          weight: parseInt(weight)
        }, { transaction });

        // Commit the transaction
        await transaction.commit();

        // Fetch the complete oil batch with all associations
        const fullOilBatch = await OilBatch.findByPk(oilBatch.id, {
          include: [
            { model: Batch, as: 'batch' },
            { model: PressingSession, as: 'pressingSession' },
            { 
              model: ContainerOilBatch, 
              as: 'containerOilBatches',
              include: [
                { 
                  model: ContainerContent, 
                  as: 'containerContent',
                  include: [{ model: Container, as: 'container' }]
                }
              ]
            }
          ]
        });

        res.status(201).json(fullOilBatch);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Create oil batch with container error:', error);
      res.status(400).json({ error: error.message });
    }
  },
  getOilBatchTraceability: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid oil batch ID' });
      }

      const oilBatch = await OilBatch.findByPk(id, {
        include: [
          { 
            model: Batch, 
            as: 'batch',
            include: [
              { model: Client, as: 'client' },
              { model: ProcessingDecision, as: 'processingDecisions' }
            ]
          },
          { 
            model: PressingSession, 
            as: 'pressingSession',
            include: [{ model: PressingRoom, as: 'pressingRoom' }]
          },
          { model: QualityTest, as: 'qualityTests' },
          { 
            model: ContainerOilBatch, 
            as: 'containerOilBatches',
            include: [{ model: ContainerContent, as: 'containerContent' }]
          }
        ]
      });

      if (!oilBatch) {
        return res.status(404).json({ error: 'Oil batch not found' });
      }

      // Build traceability report
      const traceability = {
        oilBatch: {
          id: oilBatch.id,
          weight: oilBatch.weight,
          residue: oilBatch.residue,
          productionDate: oilBatch.createdAt
        },
        origin: {
          client: oilBatch.batch?.client,
          originalBatch: {
            id: oilBatch.batch?.id,
            dateReceived: oilBatch.batch?.date_received,
            netWeight: oilBatch.batch?.net_weight,
            numberOfBoxes: oilBatch.batch?.number_of_boxes
          }
        },
        processing: {
          pressingSession: oilBatch.pressingSession,
          decisions: oilBatch.batch?.processingDecisions
        },
        quality: oilBatch.qualityTests,
        storage: oilBatch.containerOilBatches
      };

      res.json(traceability);
    } catch (error) {
      console.error('Get oil batch traceability error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default oilBatchController;
