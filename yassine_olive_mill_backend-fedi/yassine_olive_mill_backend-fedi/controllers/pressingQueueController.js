import db from '../models/index.js';
const { PressingQueue, Batch, User, PressingSession, PressingRoom } = db;

const pressingQueueController = {
  // Add a new session to the queue
  addToQueue: async (req, res) => {
    try {
      const { batch_id, number_of_boxes, operator_id, notes, priority = 0 } = req.body;

      // Validate required fields
      if (!batch_id || !number_of_boxes || !operator_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: batch_id, number_of_boxes, operator_id' 
        });
      }

      // Check if batch exists and is valid for queuing
      const batch = await Batch.findByPk(batch_id);
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      // Check if batch is already in queue
      const existingQueueEntry = await PressingQueue.findOne({
        where: { 
          batch_id, 
          status: 'queued' 
        }
      });

      if (existingQueueEntry) {
        return res.status(400).json({ 
          error: 'Batch is already in the pressing queue' 
        });
      }

      // Create queue entry
      const queueEntry = await PressingQueue.create({
        batch_id,
        number_of_boxes,
        operator_id,
        priority,
        notes,
        status: 'queued'
      });

      // Return queue entry with position
      const position = await getQueuePosition(queueEntry.id);

      res.status(201).json({
        ...queueEntry.toJSON(),
        position
      });
    } catch (error) {
      console.error('Add to queue error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get all queued sessions
  getQueuedSessions: async (req, res) => {
    try {
      const { status = 'queued' } = req.query;

      const queuedSessions = await PressingQueue.findAll({
        where: { status },
        include: [
          {
            model: Batch,
            as: 'batch',
            include: ['client']
          },
          {
            model: User,
            as: 'operator',
            attributes: ['id', 'firstname', 'lastname']
          }
        ],
        order: [
          ['priority', 'DESC'],
          ['created_at', 'ASC']
        ]
      });

      res.json(queuedSessions);
    } catch (error) {
      console.error('Get queued sessions error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Process next session in queue (auto-assign to available room)
  processNextInQueue: async (req, res) => {
    try {
      const { room_id } = req.body;

      // Find available room if not specified
      let availableRoom;
      if (room_id) {
        availableRoom = await PressingRoom.findOne({
          where: { 
            id: room_id,
            status: 'available' 
          }
        });
        
        if (!availableRoom) {
          return res.status(400).json({ 
            error: 'Specified room is not available' 
          });
        }
      } else {
        availableRoom = await PressingRoom.findOne({
          where: { status: 'available' },
          order: [['id', 'ASC']]
        });
        
        if (!availableRoom) {
          return res.status(400).json({ 
            error: 'No available rooms found' 
          });
        }
      }

      // Get next queued session
      const nextInQueue = await PressingQueue.findOne({
        where: { status: 'queued' },
        include: [
          {
            model: Batch,
            as: 'batch'
          }
        ],
        order: [
          ['priority', 'DESC'],
          ['created_at', 'ASC']
        ]
      });

      if (!nextInQueue) {
        return res.status(404).json({ 
          error: 'No sessions in queue' 
        });
      }

      // Mark queue entry as processing
      await nextInQueue.update({ status: 'processing' });

      // Create pressing session
      const pressingSession = await PressingSession.create({
        pressing_roomID: availableRoom.id,
        number_of_boxes: nextInQueue.number_of_boxes,
        batch_id: nextInQueue.batch_id,
        status: 'active'
      });

      // Update room status
      await availableRoom.update({ status: 'active' });

      // Update batch boxes loaded to pressing
      const batch = nextInQueue.batch;
      await batch.update({
        boxes_loaded_to_pressing: (batch.boxes_loaded_to_pressing || 0) + nextInQueue.number_of_boxes
      });

      // Mark queue entry as completed
      await nextInQueue.update({ status: 'completed' });

      res.json({
        message: 'Successfully processed next session in queue',
        pressingSession,
        queueEntry: nextInQueue,
        room: availableRoom
      });
    } catch (error) {
      console.error('Process next in queue error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Remove session from queue
  removeFromQueue: async (req, res) => {
    try {
      const { id } = req.params;

      const queueEntry = await PressingQueue.findByPk(id);
      if (!queueEntry) {
        return res.status(404).json({ error: 'Queue entry not found' });
      }

      if (queueEntry.status === 'processing') {
        return res.status(400).json({ 
          error: 'Cannot remove session that is currently being processed' 
        });
      }

      await queueEntry.destroy();

      res.json({ message: 'Session removed from queue successfully' });
    } catch (error) {
      console.error('Remove from queue error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get queue statistics
  getQueueStats: async (req, res) => {
    try {
      const totalQueued = await PressingQueue.count({
        where: { status: 'queued' }
      });

      const totalProcessing = await PressingQueue.count({
        where: { status: 'processing' }
      });

      const availableRooms = await PressingRoom.count({
        where: { status: 'available' }
      });

      const busyRooms = await PressingRoom.count({
        where: { status: 'active' }
      });

      res.json({
        queue: {
          queued: totalQueued,
          processing: totalProcessing
        },
        rooms: {
          available: availableRooms,
          busy: busyRooms,
          total: availableRooms + busyRooms
        }
      });
    } catch (error) {
      console.error('Get queue stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

// Helper function to get queue position
const getQueuePosition = async (queueId) => {
  try {
    const queueEntry = await PressingQueue.findByPk(queueId);
    if (!queueEntry) return 0;

    const position = await PressingQueue.count({
      where: {
        status: 'queued',
        [db.Sequelize.Op.or]: [
          { priority: { [db.Sequelize.Op.gt]: queueEntry.priority } },
          {
            priority: queueEntry.priority,
            created_at: { [db.Sequelize.Op.lt]: queueEntry.created_at }
          }
        ]
      }
    });

    return position + 1;
  } catch (error) {
    console.error('Get queue position error:', error);
    return 0;
  }
};

export default pressingQueueController;
