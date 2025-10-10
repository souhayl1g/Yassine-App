import db from "../models/index.js";

const { BatchLoading, Batch, PressingSession, PressingRoom, User, Client } = db;

const batchLoadingController = {
  // GET /api/batch-loadings
  getAllBatchLoadings: async (req, res) => {
    try {
      const { page = 1, limit = 20, batchId, pressingSessionId, pressingRoomId } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const whereClause = {};
      if (batchId) whereClause.batchId = parseInt(batchId);
      if (pressingSessionId) whereClause.pressingSessionId = parseInt(pressingSessionId);
      if (pressingRoomId) whereClause.pressingRoomId = parseInt(pressingRoomId);

      const loadings = await BatchLoading.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          { 
            model: Batch, 
            as: 'batch', 
            include: [{ model: Client, as: 'client', attributes: ['id', 'firstname', 'lastname'] }]
          },
          { model: PressingSession, as: 'pressingSession' },
          { model: PressingRoom, as: 'pressingRoom', attributes: ['id', 'name'] },
          { model: User, as: 'operator', attributes: ['id', 'firstname', 'lastname'] }
        ],
        order: [['loadedAt', 'DESC']]
      });

      res.json({
        loadings: loadings.rows,
        pagination: {
          total: loadings.count,
          page: parseInt(page),
          pages: Math.ceil(loadings.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get all batch loadings error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/batch-loadings/:id
  getBatchLoadingById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid batch loading ID' });
      }

      const loading = await BatchLoading.findByPk(id, {
        include: [
          { 
            model: Batch, 
            as: 'batch', 
            include: [{ model: Client, as: 'client' }]
          },
          { model: PressingSession, as: 'pressingSession' },
          { model: PressingRoom, as: 'pressingRoom' },
          { model: User, as: 'operator' }
        ]
      });

      if (!loading) {
        return res.status(404).json({ error: 'Batch loading not found' });
      }

      res.json(loading);
    } catch (error) {
      console.error('Get batch loading by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/batch-loadings
  createBatchLoading: async (req, res) => {
    try {
      const { batchId, pressingSessionId, pressingRoomId, boxesLoaded, operatorId, notes } = req.body;

      if (!batchId || !pressingSessionId || !pressingRoomId || !boxesLoaded) {
        return res.status(400).json({ 
          error: 'batchId, pressingSessionId, pressingRoomId, and boxesLoaded are required' 
        });
      }

      // Validate that the entities exist
      const batch = await Batch.findByPk(batchId);
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      const pressingSession = await PressingSession.findByPk(pressingSessionId);
      if (!pressingSession) {
        return res.status(404).json({ error: 'Pressing session not found' });
      }

      const pressingRoom = await PressingRoom.findByPk(pressingRoomId);
      if (!pressingRoom) {
        return res.status(404).json({ error: 'Pressing room not found' });
      }

      // Validate operator if provided
      if (operatorId) {
        const operator = await User.findByPk(operatorId);
        if (!operator) {
          return res.status(404).json({ error: 'Operator not found' });
        }
      }

      // Check if loading would exceed total boxes
      const totalBoxes = batch.number_of_boxes || 0;
      const currentlyLoaded = batch.boxes_loaded_to_pressing || 0;
      const newTotalLoaded = currentlyLoaded + parseInt(boxesLoaded);

      if (newTotalLoaded > totalBoxes) {
        return res.status(400).json({ 
          error: `Cannot load ${boxesLoaded} boxes. Available: ${totalBoxes - currentlyLoaded}, Would exceed total: ${totalBoxes}` 
        });
      }

      const loading = await BatchLoading.create({
        batchId: parseInt(batchId),
        pressingSessionId: parseInt(pressingSessionId),
        pressingRoomId: parseInt(pressingRoomId),
        boxesLoaded: parseInt(boxesLoaded),
        operatorId: operatorId ? parseInt(operatorId) : null,
        notes: notes || null,
        loadedAt: new Date()
      });

      const fullLoading = await BatchLoading.findByPk(loading.id, {
        include: [
          { model: Batch, as: 'batch' },
          { model: PressingSession, as: 'pressingSession' },
          { model: PressingRoom, as: 'pressingRoom' },
          { model: User, as: 'operator' }
        ]
      });

      res.status(201).json(fullLoading);
    } catch (error) {
      console.error('Create batch loading error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // GET /api/batch-loadings/history/:batchId
  getBatchLoadingHistory: async (req, res) => {
    try {
      const batchId = parseInt(req.params.batchId);
      if (isNaN(batchId)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
      }

      const loadings = await BatchLoading.findAll({
        where: { batchId },
        include: [
          { model: PressingSession, as: 'pressingSession' },
          { model: PressingRoom, as: 'pressingRoom', attributes: ['id', 'name'] },
          { model: User, as: 'operator', attributes: ['id', 'firstname', 'lastname'] }
        ],
        order: [['loadedAt', 'ASC']]
      });

      // Calculate cumulative totals
      let cumulativeBoxes = 0;
      const historyWithCumulative = loadings.map(loading => {
        cumulativeBoxes += loading.boxesLoaded;
        return {
          ...loading.toJSON(),
          cumulativeBoxesLoaded: cumulativeBoxes
        };
      });

      res.json({
        batchId,
        totalLoadingOperations: loadings.length,
        totalBoxesLoaded: cumulativeBoxes,
        history: historyWithCumulative
      });
    } catch (error) {
      console.error('Get batch loading history error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/batch-loadings/session/:pressingSessionId
  getSessionLoadingHistory: async (req, res) => {
    try {
      const pressingSessionId = parseInt(req.params.pressingSessionId);
      if (isNaN(pressingSessionId)) {
        return res.status(400).json({ error: 'Invalid pressing session ID' });
      }

      const loadings = await BatchLoading.findAll({
        where: { pressingSessionId },
        include: [
          { 
            model: Batch, 
            as: 'batch', 
            include: [{ model: Client, as: 'client', attributes: ['id', 'firstname', 'lastname'] }]
          },
          { model: PressingRoom, as: 'pressingRoom', attributes: ['id', 'name'] },
          { model: User, as: 'operator', attributes: ['id', 'firstname', 'lastname'] }
        ],
        order: [['loadedAt', 'ASC']]
      });

      const totalBoxesInSession = loadings.reduce((sum, loading) => sum + loading.boxesLoaded, 0);

      res.json({
        pressingSessionId,
        totalLoadingOperations: loadings.length,
        totalBoxesLoaded: totalBoxesInSession,
        loadings
      });
    } catch (error) {
      console.error('Get session loading history error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default batchLoadingController;
