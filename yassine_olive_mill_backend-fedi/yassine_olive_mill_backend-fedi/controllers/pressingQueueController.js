import db from '../models/index.js';
const { PressingQueue, Batch, User, PressingSession, PressingRoom, BatchLoading } = db;

const pressingQueueController = {
  // Add a new batch loading to the queue
  addToQueue: async (req, res) => {
    try {
      let { batch_id, ticketId, ticketNumber, number_of_boxes, operator_id, notes, priority = 0 } = req.body;

      // Normalize numeric values
      number_of_boxes = number_of_boxes !== undefined ? parseInt(number_of_boxes, 10) : 0;

      // Validate required fields
      if (!number_of_boxes || !operator_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: batch_id/ticketId/ticketNumber, number_of_boxes (>0), operator_id' 
        });
      }

      // Determine batch by provided identifiers (support QR payloads)
      let batch = null;
      if (batch_id) {
        batch = await Batch.findByPk(batch_id, { include: ['client'] });
      } else if (ticketId) {
        // QR payload may contain ticketId that maps to the batch id
        batch = await Batch.findByPk(ticketId, { include: ['client'] });
      } else if (ticketNumber) {
        batch = await Batch.findOne({ where: { ticket_number: ticketNumber }, include: ['client'] });
      }

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found (provide batch_id, ticketId or ticketNumber)' });
      }

      // Calculate available boxes
      const totalBoxes = batch.number_of_boxes || 0;
      const loadedBoxes = batch.boxes_loaded_to_pressing || 0;
      const committedBoxes = batch.boxes_committed_to_queue || 0;
      const availableBoxes = totalBoxes - loadedBoxes - committedBoxes;

      if (number_of_boxes > availableBoxes) {
        return res.status(400).json({ 
          error: `Not enough available boxes. Available: ${availableBoxes}, Requested: ${number_of_boxes}` 
        });
      }

      // Create queue entry (BatchLoading will be created when processing starts)
      const queueEntry = await PressingQueue.create({
        batch_id: batch.id,
        batch_loading_id: null, // Will be set when processing starts
        number_of_boxes,
        operator_id,
        priority,
        notes,
        status: 'queued'
      });

      // Update batch to reflect boxes loaded to pressing (since they're now in queue)
      await batch.update({
        boxes_loaded_to_pressing: (loadedBoxes || 0) + number_of_boxes,
        boxes_committed_to_queue: (committedBoxes || 0) + number_of_boxes
      });

      // Return queue entry with position and some batch info for UI
      const position = await getQueuePosition(queueEntry.id);

      res.status(201).json({
        ...queueEntry.toJSON(),
        position,
        availableBoxesAfter: availableBoxes - number_of_boxes,
        batch: {
          id: batch.id,
          ticketNumber: batch.ticket_number,
          client: batch.client ? { id: batch.client.id, firstname: batch.client.firstname, lastname: batch.client.lastname } : null,
          weightIn: batch.weight_in,
          dateReceived: batch.date_received
        }
      });
    } catch (error) {
      console.error('Add to queue error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get all queued batch loadings
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
            model: BatchLoading,
            as: 'batchLoading',
            include: [
              {
                model: Batch,
                as: 'batch',
                include: ['client']
              }
            ]
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

  // Process next batch loading in queue (auto-assign to available room)
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

      // Get next queued batch loading
      const nextInQueue = await PressingQueue.findOne({
        where: { status: 'queued' },
        include: [
          {
            model: Batch,
            as: 'batch'
          },
          {
            model: BatchLoading,
            as: 'batchLoading',
            required: false // Allow null batch loading for queued items
          }
        ],
        order: [
          ['priority', 'DESC'],
          ['created_at', 'ASC']
        ]
      });

      if (!nextInQueue) {
        return res.status(404).json({ 
          error: 'No batch loadings in queue' 
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

      // Create batch loading entry now that we have session and room info
      const batchLoading = await BatchLoading.create({
        batchId: nextInQueue.batch_id,
        pressingSessionId: pressingSession.id,
        pressingRoomId: availableRoom.id,
        operatorId: nextInQueue.operator_id,
        boxesLoaded: nextInQueue.number_of_boxes,
        notes: nextInQueue.notes
      });

      // Update queue entry with batch loading reference
      await nextInQueue.update({ batch_loading_id: batchLoading.id });

      // Update room status
      await availableRoom.update({ status: 'active' });

      // Reduce committed boxes since they're now being processed
      const batch = nextInQueue.batch;
      await batch.update({
        boxes_committed_to_queue: Math.max(0, (batch.boxes_committed_to_queue || 0) - nextInQueue.number_of_boxes)
      });

      // Mark queue entry as completed
      await nextInQueue.update({ status: 'completed' });

      res.json({
        message: 'Successfully processed next batch loading in queue',
        pressingSession,
        queueEntry: nextInQueue,
        batchLoading: batchLoading,
        room: availableRoom
      });
    } catch (error) {
      console.error('Process next in queue error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Remove batch loading from queue
  removeFromQueue: async (req, res) => {
    try {
      const { id } = req.params;

      const queueEntry = await PressingQueue.findByPk(id, {
        include: [
          {
            model: Batch,
            as: 'batch'
          },
          {
            model: BatchLoading,
            as: 'batchLoading',
            required: false // Allow null batch loading for queued items
          }
        ]
      });

      if (!queueEntry) {
        return res.status(404).json({ error: 'Queue entry not found' });
      }

      if (queueEntry.status === 'processing') {
        return res.status(400).json({ 
          error: 'Cannot remove batch loading that is currently being processed' 
        });
      }

      // Release boxes back to batch (both committed and loaded)
      const batch = queueEntry.batch;
      await batch.update({
        boxes_loaded_to_pressing: Math.max(0, (batch.boxes_loaded_to_pressing || 0) - queueEntry.number_of_boxes),
        boxes_committed_to_queue: Math.max(0, (batch.boxes_committed_to_queue || 0) - queueEntry.number_of_boxes)
      });

      // Remove the batch loading entry
      if (queueEntry.batchLoading) {
        await queueEntry.batchLoading.destroy();
      }

      // Remove queue entry
      await queueEntry.destroy();

      res.json({ 
        message: 'Batch loading removed from queue successfully',
        releasedBoxes: queueEntry.number_of_boxes
      });
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
  },

  // Get available boxes for a batch
  getBatchAvailableBoxes: async (req, res) => {
    try {
      const { batch_id } = req.params;

      const batch = await Batch.findByPk(batch_id);
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      const totalBoxes = batch.number_of_boxes || 0;
      const loadedBoxes = batch.boxes_loaded_to_pressing || 0;
      const committedBoxes = batch.boxes_committed_to_queue || 0;
      const availableBoxes = totalBoxes - loadedBoxes - committedBoxes;

      res.json({
        batchId: batch_id,
        totalBoxes,
        loadedBoxes,
        committedBoxes,
        availableBoxes,
        status: batch.status
      });
    } catch (error) {
      console.error('Get batch available boxes error:', error);
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
