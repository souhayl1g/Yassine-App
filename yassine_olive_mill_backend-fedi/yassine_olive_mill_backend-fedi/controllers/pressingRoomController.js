import db from "../models/index.js";

const { PressingRoom, PressingSession } = db;

const pressingRoomController = {
  // GET /api/pressing-rooms
  getAllPressingRooms: async (req, res) => {
    try {
      const rooms = await PressingRoom.findAll({
        order: [["createdAt", "ASC"]],
      });

      // compute derived status from active sessions
      const activeSessions = await PressingSession.findAll({ where: { finish: null } });
      const activeRoomIds = new Set(activeSessions.map((s) => s.pressing_roomID));

      const roomsWithStatus = rooms.map((room) => ({
        ...room.toJSON(),
        status: activeRoomIds.has(room.id) ? "active" : "inactive",
      }));

      res.json(roomsWithStatus);
    } catch (error) {
      console.error("Get all pressing rooms error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/pressing-rooms/:id
  getPressingRoomById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid room ID" });

      const room = await PressingRoom.findByPk(id);
      if (!room) return res.status(404).json({ error: "Pressing room not found" });

      const activeSession = await PressingSession.findOne({ where: { pressing_roomID: id, finish: null } });
      const result = { ...room.toJSON(), status: activeSession ? "active" : "inactive" };
      res.json(result);
    } catch (error) {
      console.error("Get pressing room by ID error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/pressing-rooms
  createPressingRoom: async (req, res) => {
    try {
      const { name, capacity } = req.body;
      if (!name) return res.status(400).json({ error: "name is required" });
      const room = await PressingRoom.create({ name, capacity: capacity ? parseInt(capacity) : null });
      res.status(201).json(room);
    } catch (error) {
      console.error("Create pressing room error:", error);
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/pressing-rooms/:id
  updatePressingRoom: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid room ID" });
      const { name, capacity } = req.body;

      const room = await PressingRoom.findByPk(id);
      if (!room) return res.status(404).json({ error: "Pressing room not found" });

      await room.update({
        ...(name !== undefined ? { name } : {}),
        ...(capacity !== undefined ? { capacity: capacity ? parseInt(capacity) : null } : {}),
      });
      res.json(room);
    } catch (error) {
      console.error("Update pressing room error:", error);
      res.status(400).json({ error: error.message });
    }
  },

  // GET /api/pressing-rooms/display-data - get rooms with detailed session info for display
  getPressingRoomsDisplayData: async (req, res) => {
    try {
      const rooms = await PressingRoom.findAll({
        order: [["id", "ASC"]],
      });

      // Get active sessions with detailed information
      const activeSessions = await PressingSession.findAll({ 
        where: { finish: null },
        include: [
          {
            model: db.OilBatch,
            as: 'oilBatches',
            include: [
              {
                model: db.Batch,
                as: 'batch',
                include: [
                  {
                    model: db.Client,
                    as: 'client',
                    attributes: ['id', 'firstname', 'lastname']
                  }
                ]
              }
            ]
          }
        ]
      });

      // Create a map of room ID to session data
      const sessionMap = new Map();
      activeSessions.forEach(session => {
        if (session.pressing_roomID) {
          // Calculate total weight and get client info from all batches in this session
          let totalWeight = 0;
          let clientName = 'غير محدد';
          let ticketId = null;

          if (session.oilBatches && session.oilBatches.length > 0) {
            session.oilBatches.forEach(oilBatch => {
              if (oilBatch.batch) {
                totalWeight += oilBatch.batch.weight_in || 0;
                if (oilBatch.batch.client && !ticketId) {
                  clientName = `${oilBatch.batch.client.firstname} ${oilBatch.batch.client.lastname}`;
                  ticketId = oilBatch.batch.id;
                }
              }
            });
          }

          sessionMap.set(session.pressing_roomID, {
            id: ticketId || session.id.toString(),
            clientName: clientName,
            weightIn: totalWeight,
            numberOfBatches: session.oilBatches ? session.oilBatches.length : 0,
            sessionStartTime: session.start,
            estimatedTime: 60 // Default 60 minutes, could be configurable
          });
        }
      });

      // Map rooms with their status and active session data
      const roomsWithStatus = rooms.map((room) => ({
        id: room.id,
        name: room.name,
        status: sessionMap.has(room.id) ? 'busy' : 'available',
        currentBatch: sessionMap.get(room.id) || undefined
      }));

      res.json(roomsWithStatus);
    } catch (error) {
      console.error("Get pressing rooms display data error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE /api/pressing-rooms/:id
  deletePressingRoom: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid room ID" });

      const room = await PressingRoom.findByPk(id);
      if (!room) return res.status(404).json({ error: "Pressing room not found" });

      await room.destroy();
      res.json({ success: true });
    } catch (error) {
      console.error("Delete pressing room error:", error);
      res.status(400).json({ error: error.message });
    }
  },
};

export default pressingRoomController;


