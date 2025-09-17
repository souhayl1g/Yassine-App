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


