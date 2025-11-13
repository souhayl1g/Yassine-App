import db from "../models/index.js";

const { PressingRoom, PressingSession, PressingQueue, Batch, User, BatchLoading, Client, QueuerSession } = db;

const pressingRoomController = {
  // GET /api/pressing-rooms
  getAllPressingRooms: async (req, res) => {
    try {
      const rooms = await PressingRoom.findAll({
        order: [["createdAt", "ASC"]],
      });

      // Get active sessions with detailed information
      const activeSessions = await PressingSession.findAll({ 
        where: { 
          finish: null,
          status: 'active' // Only get actively running sessions, exclude 'done' status
        },
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
      });

      // Create a map of room ID to session details
      const sessionMap = new Map();
      activeSessions.forEach((session) => {
        if (session.pressing_roomID) {
          sessionMap.set(session.pressing_roomID, {
            id: session.id,
            startTime: session.start,
            numberOfBoxes: session.number_of_boxes,
            status: session.status,
            batch: session.batch,
            occupantName: session.batch?.client 
              ? `${session.batch.client.firstname || ''} ${session.batch.client.lastname || ''}`.trim()
              : 'Unknown'
          });
        }
      });

      const roomsWithStatus = rooms.map((room) => {
        const sessionInfo = sessionMap.get(room.id);
        return {
          ...room.toJSON(),
          status: sessionInfo ? "active" : "inactive",
          currentSession: sessionInfo || null
        };
      });

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
        where: { 
          finish: null,
          status: 'active' // Only get actively running sessions, exclude 'done' status
        },
        include: [
          {
            model: db.Batch,
            as: 'batch',
            required: false, // LEFT JOIN to allow sessions without batches
            include: [
              {
                model: db.Client,
                as: 'client',
                required: false,
                attributes: ['id', 'firstname', 'lastname']
              }
            ]
          }
        ]
      });

      // Create a map of room ID to session data
      const sessionMap = new Map();
      activeSessions.forEach(session => {
        if (session.pressing_roomID) {
          let clientName = 'Unknown';
          let ticketId = session.id.toString();
          let weightIn = 0;

          // Get batch information if available
          if (session.batch) {
            weightIn = session.batch.weight_in || 0;
            ticketId = session.batch.ticket_number || session.batch.id.toString();
            
            if (session.batch.client) {
              clientName = `${session.batch.client.firstname || ''} ${session.batch.client.lastname || ''}`.trim();
            }
          }

          sessionMap.set(session.pressing_roomID, {
            id: ticketId,
            sessionId: session.id, // Add the actual pressing session ID
            batchId: session.batch?.id, // Add the actual batch database ID
            clientName: clientName,
            weightIn: weightIn,
            numberOfBatches: session.number_of_boxes, // Using number_of_boxes from session
            sessionStartTime: session.start,
            estimatedTime: session.batch?.estimated_time || 60, // Use batch estimated time or default 60 minutes
            operationType: session.batch?.operation_type || 'milling' // Add operation type from batch
          });
        }
      });

      // Map actual rooms from database with their session status
      const roomsWithStatus = rooms.map(room => ({
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

  // GET /api/pressing-rooms/combined-display-data - get both rooms and queue data in single response
  getCombinedDisplayData: async (req, res) => {
    try {
      // Get pressing rooms data
      const rooms = await PressingRoom.findAll({
        order: [["id", "ASC"]],
      });

      // Get active sessions with detailed information
      const activeSessions = await PressingSession.findAll({ 
        where: { 
          finish: null,
          status: 'active' // Only get actively running sessions, exclude 'done' status
        },
        include: [
          {
            model: db.Batch,
            as: 'batch',
            required: false, // LEFT JOIN to allow sessions without batches
            include: [
              {
                model: db.Client,
                as: 'client',
                required: false,
                attributes: ['id', 'firstname', 'lastname']
              }
            ]
          }
        ]
      });

      // Create a map of room ID to session data
      const sessionMap = new Map();
      activeSessions.forEach(session => {
        if (session.pressing_roomID) {
          let clientName = 'Unknown';
          let ticketId = session.id.toString();
          let weightIn = 0;

          // Get batch information if available
          if (session.batch) {
            weightIn = session.batch.weight_in || 0;
            ticketId = session.batch.ticket_number || session.batch.id.toString();
            
            if (session.batch.client) {
              clientName = `${session.batch.client.firstname || ''} ${session.batch.client.lastname || ''}`.trim();
            }
          }

          sessionMap.set(session.pressing_roomID, {
            id: ticketId,
            sessionId: session.id, // Add the actual pressing session ID
            batchId: session.batch?.id, // Add the actual batch database ID
            clientName: clientName,
            weightIn: weightIn,
            numberOfBatches: session.number_of_boxes, // Using number_of_boxes from session
            sessionStartTime: session.start,
            estimatedTime: session.batch?.estimated_time || 60, // Use batch estimated time or default 60 minutes
            operationType: session.batch?.operation_type || 'milling' // Add operation type from batch
          });
        }
      });

      // Map actual rooms from database with their session status
      const roomsWithStatus = rooms.map(room => ({
        id: room.id,
        name: room.name,
        status: sessionMap.has(room.id) ? 'busy' : 'available',
        currentBatch: sessionMap.get(room.id) || undefined
      }));

      // Get queue data from all queuer sessions (existence in table means there's queuing activity)
      const queuerSessions = await QueuerSession.findAll({
        include: [
          {
            model: Batch,
            as: 'batch',
            include: [
              {
                model: Client,
                as: 'client',
                attributes: ['id', 'firstname', 'lastname']
              }
            ]
          },
          {
            model: User,
            as: 'queuer',
            attributes: ['id', 'firstname', 'lastname']
          }
        ],
        order: [
          ['startedAt', 'ASC'] // Order by when session started (first come, first served)
        ]
      });

      // Format queuer sessions data for display
      const queueItems = queuerSessions.map(session => {
        const batch = session.batch;
        const client = batch?.client;
        const queuer = session.queuer;
        
        return {
          id: session.id,
          batchId: session.currentBatchId,
          ticketNumber: batch?.ticket_number || batch?.id.toString() || 'N/A',
          clientName: client ? `${client.firstname} ${client.lastname}`.trim() : 'Unknown',
          totalBoxes: session.totalBoxes,
          boxesQueued: session.boxesQueued,
          boxesRemaining: session.totalBoxes - session.boxesQueued,
          progress: Math.round((session.boxesQueued / session.totalBoxes) * 100),
          startedAt: session.startedAt,
          queuerName: queuer ? `${queuer.firstname} ${queuer.lastname}`.trim() : 'Unknown',
          weightIn: batch?.weight_in || 0,
          operationType: batch?.operation_type || 'milling',
          status: session.status
        };
      });

      // Return combined data
      res.json({
        pressingRooms: roomsWithStatus,
        queueItems: queueItems
      });
    } catch (error) {
      console.error("Get combined display data error:", error);
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


