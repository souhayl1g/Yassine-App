import db from "../models/index.js";

const { PressingSession, PressingRoom, OilBatch, Batch } = db;

const pressingSessionController = {
  // GET /api/pressing-sessions
  getAllPressingSessions: async (req, res) => {
    try {
      const { active, pressing_roomId, status } = req.query;
      
      const whereClause = {};
      if (active === 'true') whereClause.finish = null;
      if (pressing_roomId) whereClause.pressing_roomID = parseInt(pressing_roomId);
      if (status) whereClause.status = status;

      const sessions = await PressingSession.findAll({
        where: whereClause,
        include: [
          { model: PressingRoom, as: 'pressingRoom' },
          { model: OilBatch, as: 'oilBatches' }
        ],
        order: [['start', 'DESC']]
      });

      res.json(sessions);
    } catch (error) {
      console.error('Get all pressing sessions error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/pressing-sessions
  startPressingSession: async (req, res) => {
    try {
      const { pressing_roomID, number_of_boxes, status = 'waiting' } = req.body;

      const hasRoom = pressing_roomID !== undefined && pressing_roomID !== null;
      const hasBoxes = number_of_boxes !== undefined && number_of_boxes !== null;
      if (!hasRoom || !hasBoxes) {
        return res.status(400).json({ error: 'pressing_roomID and number_of_boxes are required' });
      }

      // Validate status
      const validStatuses = ['waiting', 'done', 'active'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be one of: waiting, done, active' });
      }

      // Check if room is already in use (active session)
      const activeSession = await PressingSession.findOne({
        where: { 
          pressing_roomID: parseInt(pressing_roomID),
          status: 'active'
        }
      });

      if (activeSession) {
        return res.status(400).json({ error: 'Pressing room is already in use' });
      }

      const session = await PressingSession.create({
        pressing_roomID: parseInt(pressing_roomID),
        number_of_boxes: parseInt(number_of_boxes),
        start: new Date(),
        status: status
      });

      const fullSession = await PressingSession.findByPk(session.id, {
        include: [{ model: PressingRoom, as: 'pressingRoom' }]
      });

      res.status(201).json(fullSession);
    } catch (error) {
      console.error('Start pressing session error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/pressing-sessions/:id/finish
  finishPressingSession: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid pressing session ID' });
      }

      const session = await PressingSession.findByPk(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Pressing session not found' });
      }

      if (session.status === 'done') {
        return res.status(400).json({ error: 'Session already finished' });
      }

      await session.update({ 
        finish: new Date(),
        status: 'done'
      });
      res.json(session);
    } catch (error) {
      console.error('Finish pressing session error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // GET /api/pressing-sessions/:id
  getPressingSessionById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid pressing session ID' });
      }

      const session = await PressingSession.findByPk(id, {
        include: [
          { model: PressingRoom, as: 'pressingRoom' },
          { 
            model: OilBatch, 
            as: 'oilBatches',
            include: [{ model: Batch, as: 'batch' }]
          }
        ]
      });

      if (!session) {
        return res.status(404).json({ error: 'Pressing session not found' });
      }

      res.json(session);
    } catch (error) {
      console.error('Get pressing session by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // PUT /api/pressing-sessions/:id/status
  updatePressingSessionStatus: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid pressing session ID' });
      }

      const validStatuses = ['waiting', 'done', 'active'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be one of: waiting, done, active' });
      }

      const session = await PressingSession.findByPk(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Pressing session not found' });
      }

      // If setting to active, check if room is already in use
      if (status === 'active' && session.status !== 'active') {
        const activeSession = await PressingSession.findOne({
          where: { 
            pressing_roomID: session.pressing_roomID,
            status: 'active',
            id: { [db.Sequelize.Op.ne]: id } // Exclude current session
          }
        });

        if (activeSession) {
          return res.status(400).json({ error: 'Pressing room is already in use by another session' });
        }
      }

      // Update finish time when setting to done
      const updateData = { status };
      if (status === 'done' && !session.finish) {
        updateData.finish = new Date();
      }

      await session.update(updateData);
      
      const updatedSession = await PressingSession.findByPk(id, {
        include: [{ model: PressingRoom, as: 'pressingRoom' }]
      });

      res.json(updatedSession);
    } catch (error) {
      console.error('Update pressing session status error:', error);
      res.status(400).json({ error: error.message });
    }
  }
};

export default pressingSessionController;
