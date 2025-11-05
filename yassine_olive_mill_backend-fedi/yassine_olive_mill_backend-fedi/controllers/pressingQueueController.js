import db from '../models/index.js';
const { PressingQueue, Batch, User, PressingSession, PressingRoom, BatchLoading, QueuerSession } = db;

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

      // Check if there are any active queuer sessions system-wide for different batches
      const activeQueuerSessions = await QueuerSession.findAll({
        where: { 
          status: 'active'
        },
        include: [
          {
            model: Batch,
            as: 'batch',
            include: ['client']
          },
          {
            model: User,
            as: 'queuer',
            attributes: ['id', 'firstname', 'lastname']
          }
        ]
      });

      // Check if there are active sessions for different batches
      // Instead of preventing the request, we'll allow it to proceed but mark it for frontend handling
      let hasConflictingSession = false;
      let conflictingSessionInfo = null;
      
      if (activeQueuerSessions.length > 0) {
        const differentBatchSession = activeQueuerSessions.find(session => session.currentBatchId !== batch.id);
        if (differentBatchSession) {
          hasConflictingSession = true;
          const currentBatch = differentBatchSession.batch;
          const remainingBoxes = differentBatchSession.totalBoxes - differentBatchSession.boxesQueued;
          const batchName = `${currentBatch.ticket_number || `#${currentBatch.id}`}`;
          const clientName = currentBatch.client 
            ? `${currentBatch.client.firstname} ${currentBatch.client.lastname}` 
            : `Client #${currentBatch.clientId}`;
          const queuerName = differentBatchSession.queuer 
            ? `${differentBatchSession.queuer.firstname} ${differentBatchSession.queuer.lastname}`
            : `Queuer #${differentBatchSession.queueId}`;
          
          conflictingSessionInfo = {
            id: currentBatch.id,
            ticketNumber: currentBatch.ticket_number,
            clientName: clientName,
            remainingBoxes: remainingBoxes,
            queuerName: queuerName,
            message: `يجب إنهاء معالجة الدفعة الحالية قبل البدء في دفعة جديدة: ${batchName} - ${clientName} (متبقي ${remainingBoxes} صندوق) - جاري المعالجة بواسطة: ${queuerName}`
          };
          
          // Return early with conflict information but don't create queue entry
          return res.status(409).json({ 
            error: 'Cannot queue a new batch while another batch is being queued',
            conflictingSession: conflictingSessionInfo,
            cannotQueue: true,
            message: conflictingSessionInfo.message
          });
        }
      }

      // Check if queuer has an active session and enforce batch consistency
      const operator = await User.findByPk(operator_id);
      let activeSession = null; // Declare outside the queuer block for later use
      
      if (operator && operator.role === 'queuer') {
        activeSession = await QueuerSession.findOne({
          where: { 
            queueId: operator_id, 
            status: 'active' 
          },
          include: [
            {
              model: Batch,
              as: 'batch',
              include: ['client']
            }
          ]
        });

        if (activeSession) {
          // Queuer has an active session, must continue with the same batch
          if (activeSession.currentBatchId !== batch.id) {
            const currentBatch = activeSession.batch;
            const currentBatchName = currentBatch 
              ? `${currentBatch.ticket_number || `#${currentBatch.id}`} - ${currentBatch.client ? `${currentBatch.client.firstname} ${currentBatch.client.lastname}` : `Client #${currentBatch.clientId}`}`
              : `Batch #${activeSession.currentBatchId}`;
            
            const remainingBoxes = activeSession.totalBoxes - activeSession.boxesQueued;
            
            return res.status(400).json({ 
              error: 'Cannot switch to a different batch while processing another batch',
              currentBatch: currentBatchName,
              remainingBoxes: remainingBoxes,
              message: `يجب إنهاء معالجة الدفعة الحالية قبل البدء في دفعة جديدة: ${currentBatchName} (متبقي ${remainingBoxes} صندوق)`
            });
          }
        } else {
          // No active session, create a new one for this batch
          activeSession = await QueuerSession.create({
            queueId: operator_id,
            currentBatchId: batch.id,
            totalBoxes: batch.number_of_boxes || 0,
            boxesQueued: 0,
            status: 'active'
          });
        }
      }

      // Calculate available boxes
      const totalBoxes = batch.number_of_boxes || 0;
      const loadedBoxes = batch.boxes_loaded_to_pressing || 0;
      const committedBoxes = batch.boxes_committed_to_queue || 0;
      let availableBoxes;

      // If this is a queuer with an active session, use session progress
      if (operator && operator.role === 'queuer' && activeSession) {
        availableBoxes = totalBoxes - activeSession.boxesQueued;
      } else {
        // For operators or no active session, use batch-level calculations
        // Available = total - actually loaded - committed to queue
        availableBoxes = totalBoxes - loadedBoxes - committedBoxes;
      }

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

      // Update batch to reflect boxes committed to queue (but not yet loaded to pressing)
      await batch.update({
        boxes_committed_to_queue: (committedBoxes || 0) + number_of_boxes
      });

      // Update queuer session if this is a queuer
      if (operator && operator.role === 'queuer') {
        const activeSession = await QueuerSession.findOne({
          where: { 
            queueId: operator_id, 
            status: 'active',
            currentBatchId: batch.id 
          }
        });

        if (activeSession) {
          const newBoxesQueued = activeSession.boxesQueued + number_of_boxes;
          
          // Check if session is complete
          if (newBoxesQueued >= activeSession.totalBoxes) {
            await activeSession.update({
              boxesQueued: newBoxesQueued,
              status: 'completed',
              completedAt: new Date()
            });
          } else {
            await activeSession.update({
              boxesQueued: newBoxesQueued
            });
          }
        }
      }

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
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        errors: error.errors,
        sql: error.sql
      });
      
      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeForeignKeyConstraintError') {
        const validationErrors = error.errors ? error.errors.map(e => e.message).join(', ') : error.message;
        return res.status(400).json({ 
          error: 'Validation error',
          details: validationErrors,
          message: validationErrors
        });
      }
      
      res.status(500).json({ 
        error: error.message,
        details: error.errors ? error.errors.map(e => e.message) : undefined
      });
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

      // Now that processing has started, move boxes from committed to loaded
      const batch = nextInQueue.batch;
      await batch.update({
        boxes_loaded_to_pressing: (batch.boxes_loaded_to_pressing || 0) + nextInQueue.number_of_boxes,
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
      const availableBoxes = totalBoxes - loadedBoxes;

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
  },

  // Get queuer current session status
  getQueuerSessionStatus: async (req, res) => {
    try {
      const { queuer_id } = req.params;

      const queuer = await User.findByPk(queuer_id);
      if (!queuer) {
        return res.status(404).json({ error: 'Queuer not found' });
      }

      if (queuer.role !== 'queuer') {
        return res.status(400).json({ error: 'User is not a queuer' });
      }

      const activeSession = await QueuerSession.findOne({
        where: { 
          queueId: queuer_id, 
          status: 'active' 
        },
        include: [
          {
            model: Batch,
            as: 'batch',
            include: ['client']
          }
        ]
      });

      const hasActiveSession = !!activeSession;
      let sessionInfo = null;

      if (hasActiveSession) {
        const batch = activeSession.batch;
        const remainingBoxes = activeSession.totalBoxes - activeSession.boxesQueued;
        const progress = activeSession.totalBoxes > 0 
          ? Math.round((activeSession.boxesQueued / activeSession.totalBoxes) * 100) 
          : 0;

        sessionInfo = {
          sessionId: activeSession.id,
          batchId: batch.id,
          ticketNumber: batch.ticket_number,
          client: batch.client ? {
            id: batch.client.id,
            firstname: batch.client.firstname,
            lastname: batch.client.lastname
          } : null,
          totalBoxes: activeSession.totalBoxes,
          boxesQueued: activeSession.boxesQueued,
          remainingBoxes,
          progress,
          startedAt: activeSession.startedAt
        };
      }

      res.json({
        queueId: queuer_id,
        hasActiveSession,
        session: sessionInfo
      });
    } catch (error) {
      console.error('Get queuer session status error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Cancel/complete queuer session manually
  updateQueuerSession: async (req, res) => {
    try {
      const { queuer_id } = req.params;
      const { action } = req.body; // 'cancel' or 'complete'

      if (!['cancel', 'complete'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Must be "cancel" or "complete"' });
      }

      const queuer = await User.findByPk(queuer_id);
      if (!queuer) {
        return res.status(404).json({ error: 'Queuer not found' });
      }

      if (queuer.role !== 'queuer') {
        return res.status(400).json({ error: 'User is not a queuer' });
      }

      const activeSession = await QueuerSession.findOne({
        where: { 
          queueId: queuer_id, 
          status: 'active' 
        }
      });

      if (!activeSession) {
        return res.status(404).json({ error: 'No active session found for this queuer' });
      }

      const updateData = {
        status: action === 'cancel' ? 'cancelled' : 'completed'
      };

      if (action === 'complete') {
        updateData.completedAt = new Date();
        updateData.boxesQueued = activeSession.totalBoxes; // Mark all as queued
      }

      await activeSession.update(updateData);

      res.json({
        message: `Queuer session ${action}d successfully`,
        sessionId: activeSession.id,
        action: action
      });
    } catch (error) {
      console.error('Update queuer session error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get active queuer sessions (batches currently being queued) system-wide
  getPartiallyQueuedBatches: async (req, res) => {
    try {
      const activeQueuerSessions = await QueuerSession.findAll({
        where: { 
          status: 'active'
        },
        include: [
          {
            model: Batch,
            as: 'batch',
            include: ['client']
          },
          {
            model: User,
            as: 'queuer',
            attributes: ['id', 'firstname', 'lastname']
          }
        ],
        order: [['updatedAt', 'DESC']]
      });

      const result = activeQueuerSessions.map(session => {
        const batch = session.batch;
        const remainingBoxes = session.totalBoxes - session.boxesQueued;
        const queuerName = session.queuer 
          ? `${session.queuer.firstname} ${session.queuer.lastname}`
          : `Queuer #${session.queueId}`;
        
        return {
          id: batch.id,
          ticketNumber: batch.ticket_number,
          clientName: batch.client 
            ? `${batch.client.firstname} ${batch.client.lastname}` 
            : `Client #${batch.clientId}`,
          totalBoxes: session.totalBoxes,
          queuedBoxes: session.boxesQueued,
          remainingBoxes: remainingBoxes,
          queuerName: queuerName,
          sessionStarted: session.startedAt,
          updatedAt: session.updatedAt
        };
      });

      res.json({
        partiallyQueuedBatches: result,
        hasPartiallyQueued: result.length > 0
      });
    } catch (error) {
      console.error('Get active queuer sessions error:', error);
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
