import db from "../models/index.js";

const { PressingSession, PressingRoom, OilBatch } = db;

const pressingSessionController = {
  // GET /api/pressing-sessions
  getAllPressingSessions: async (req, res) => {
    try {
      const { active, pressing_roomId } = req.query;
      
      const whereClause = {};
      if (active === 'true') whereClause.finish = null;
      if (pressing_roomId) whereClause.pressing_roomID = pressing_roomId;

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
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/pressing-sessions
  startPressingSession: async (req, res) => {
    try {
      const { pressing_roomID, number_of_boxes } = req.body;
      
      // Check if room is already in use
      const activeSession = await PressingSession.findOne({
        where: { 
          pressing_roomID,
          finish: null 
        }
      });

      if (activeSession) {
        return res.status(400).json({ error: 'Pressing room is already in use' });
      }

      const session = await PressingSession.create({
        pressing_roomID,
        number_of_boxes,
        start: new Date()
      });

      const fullSession = await PressingSession.findByPk(session.id, {
        include: [{ model: PressingRoom, as: 'pressingRoom' }]
      });

      res.status(201).json(fullSession);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/pressing-sessions/:id/finish
  finishPressingSession: async (req, res) => {
    try {
      const session = await PressingSession.findByPk(req.params.id);
      
      if (!session) {
        return res.status(404).json({ error: 'Pressing session not found' });
      }

      if (session.finish) {
        return res.status(400).json({ error: 'Session already finished' });
      }

      await session.update({ finish: new Date() });
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // GET /api/pressing-sessions/:id
  getPressingSessionById: async (req, res) => {
    try {
      const session = await PressingSession.findByPk(req.params.id, {
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
      res.status(500).json({ error: error.message });
    }
  }
};

export default pressingSessionController;
