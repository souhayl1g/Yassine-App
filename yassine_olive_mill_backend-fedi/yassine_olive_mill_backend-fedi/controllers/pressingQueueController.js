import db from '../models/index.js';
const { PressingQueue, Batch, User, PressingSession, PressingRoom, BatchLoading, QueuerSession, Client } = db;

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

      // Check if batch is already in an active pressing session
      const activePressingSession = await db.PressingSession.findOne({
        where: {
          batch_id: batch.id,
          status: 'active'
        }
      });

      if (activePressingSession) {
        return res.status(400).json({ 
          error: 'Cannot add batch to queue - it is currently being pressed',
          message: 'لا يمكن إضافة هذه التذكرة للطابور - قيد العصر حالياً',
          isCurrentlyPressed: true,
          batchId: batch.id,
          sessionId: activePressingSession.id
        });
      }

      // Also check for sessions that are not finished (regardless of status)
      const unfinishedPressingSession = await db.PressingSession.findOne({
        where: {
          batch_id: batch.id,
          finish: null
        }
      });

      if (unfinishedPressingSession && unfinishedPressingSession.status !== 'waiting') {
        return res.status(400).json({ 
          error: 'Cannot add batch to queue - it has an unfinished pressing session',
          message: 'لا يمكن إضافة هذه التذكرة للطابور - لها جلسة عصر غير مكتملة',
          isCurrentlyPressed: true,
          batchId: batch.id,
          sessionId: unfinishedPressingSession.id,
          sessionStatus: unfinishedPressingSession.status
        });
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
        const differentBatchSession = activeQueuerSessions.find(session => {
          const remainingBoxes = session.totalBoxes - session.boxesQueued;
          return session.currentBatchId !== batch.id && remainingBoxes > 0; // Only consider sessions with remaining boxes
        });
        
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
          // Queuer has an active session, must continue with the same batch unless it's fully processed
          if (activeSession.currentBatchId !== batch.id) {
            const remainingBoxes = activeSession.totalBoxes - activeSession.boxesQueued;
            
            // Only block if there are remaining boxes > 0
            if (remainingBoxes > 0) {
              const currentBatch = activeSession.batch;
              const currentBatchName = currentBatch 
                ? `${currentBatch.ticket_number || `#${currentBatch.id}`} - ${currentBatch.client ? `${currentBatch.client.firstname} ${currentBatch.client.lastname}` : `Client #${currentBatch.clientId}`}`
                : `Batch #${activeSession.currentBatchId}`;
              
              return res.status(400).json({ 
                error: 'Cannot switch to a different batch while processing another batch',
                currentBatch: currentBatchName,
                remainingBoxes: remainingBoxes,
                message: `يجب إنهاء معالجة الدفعة الحالية قبل البدء في دفعة جديدة: ${currentBatchName} (متبقي ${remainingBoxes} صندوق)`
              });
            } else {
              // Current batch is fully processed, close the session and create a new one
              await QueuerSession.update(
                { status: 'completed' },
                { where: { id: activeSession.id } }
              );
              activeSession = null; // Will create new session below
            }
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
          
          // Update the session with new boxes queued count
          await activeSession.update({
            boxesQueued: newBoxesQueued
          });
          
          console.log(`Updated queuer session ${activeSession.id} - boxes queued: ${newBoxesQueued}/${activeSession.totalBoxes}`);
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
  // Disabled by policy: auto-assignment is not allowed.
  processNextInQueue: async (req, res) => {
    return res.status(403).json({ error: 'Auto-assigning next queue item is disabled.' });
  },

  // Remove batch loading from queue or queuer session
  removeFromQueue: async (req, res) => {
    try {
      const { id } = req.params;

      // First try to find as a QueuerSession
      const queuerSession = await QueuerSession.findByPk(id, {
        include: [
          {
            model: Batch,
            as: 'batch'
          }
        ]
      });

      if (queuerSession) {
        // Remove queuer session
        await queuerSession.destroy();
        return res.json({ 
          message: 'Queuer session removed successfully',
          type: 'queuer_session',
          batchId: queuerSession.currentBatchId
        });
      }

      // If not found as queuer session, try as PressingQueue entry
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
        return res.status(404).json({ error: 'Queue entry or queuer session not found' });
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
        type: 'pressing_queue',
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
        // When manually completing, remove the session entirely
        await activeSession.destroy();
        console.log(`Manually removed queuer session ${activeSession.id} - marked as complete`);
        
        return res.json({
          message: `Queuer session completed and removed successfully`,
          sessionId: activeSession.id,
          action: action
        });
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

      // Filter out sessions that are complete (remainingBoxes <= 0)
      const result = activeQueuerSessions
        .map(session => {
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
        })
        .filter(session => session.remainingBoxes > 0); // Only include sessions with remaining boxes

      res.json({
        partiallyQueuedBatches: result,
        hasPartiallyQueued: result.length > 0
      });
    } catch (error) {
      console.error('Get active queuer sessions error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/pressing-queue/batch-status/:batchId - Get queue status for a specific batch
  getBatchStatus: async (req, res) => {
    try {
      const { batchId } = req.params;

      // Find queuer session for this batch
      const queuerSession = await QueuerSession.findOne({
        where: {
          currentBatchId: parseInt(batchId),
          status: 'active'
        },
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
          }
        ]
      });

      if (!queuerSession) {
        return res.json({
          inQueue: false,
          totalBoxes: 0,
          boxesQueued: 0,
          clientName: null,
          ticketNumber: null
        });
      }

      const batch = queuerSession.batch;
      const client = batch?.client;
      
      return res.json({
        inQueue: true,
        totalBoxes: queuerSession.totalBoxes,
        boxesQueued: queuerSession.boxesQueued,
        clientName: client ? `${client.firstname || ''} ${client.lastname || ''}`.trim() : 'Unknown',
        ticketNumber: batch?.ticket_number || batch?.id?.toString() || 'N/A'
      });
    } catch (error) {
      console.error('Get batch status error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/pressing-queue/batch/:batchId/details - Get batch details for queuer scanner
  getBatchForQueuer: async (req, res) => {
    try {
      const { batchId } = req.params;
      let idOrCode = batchId;
      
      // Handle different ID formats
      if (typeof batchId === 'string') {
        const num = parseInt(batchId.replace(/\D+/g, ''), 10);
        idOrCode = isNaN(num) ? batchId : String(num);
      }

      const batch = await Batch.findByPk(idOrCode, {
        include: [
          { 
            model: Client, 
            as: 'client',
            attributes: ['id', 'firstname', 'lastname']
          }
        ]
      });

      if (!batch) {
        return res.status(404).json({ 
          error: 'التذكرة غير موجودة في النظام',
          message: 'Batch not found' 
        });
      }

      // Calculate available boxes 
      const totalBoxes = batch.number_of_boxes || 0;
      let availableBoxes = totalBoxes;
      
      // Check if there's an active queuer session for this batch
      try {
        const activeSession = await QueuerSession.findOne({
          where: {
            currentBatchId: parseInt(batch.id),
            status: 'active'
          }
        });
        
        if (activeSession) {
          // This batch has an active session, use remaining boxes from session
          availableBoxes = activeSession.totalBoxes - activeSession.boxesQueued;
        } else {
          // Check other active sessions to see if they affect this batch's availability
          const otherActiveSessions = await QueuerSession.findAll({
            where: {
              status: 'active'
            }
          });
          
          if (otherActiveSessions.length === 0) {
            // No active sessions, use normal calculation
            const loadedBoxes = batch.boxes_loaded_to_pressing || 0;
            const committedBoxes = batch.boxes_committed_to_queue || 0;
            availableBoxes = totalBoxes - Math.max(loadedBoxes - committedBoxes, 0);
          } else {
            // Other sessions are active, this batch might not be available
            const loadedBoxes = batch.boxes_loaded_to_pressing || 0;
            availableBoxes = totalBoxes - loadedBoxes;
          }
        }
      } catch (error) {
        console.error('Error checking queuer sessions:', error);
        // Fallback to basic calculation
        const loadedBoxes = batch.boxes_loaded_to_pressing || 0;
        availableBoxes = totalBoxes - loadedBoxes;
      }

      // Prepare client name
      const clientName = batch.client
        ? `${batch.client.firstname || ''} ${batch.client.lastname || ''}`.trim()
        : `עميל #${batch.clientId}`;

      const response = {
        id: String(batch.id),
        ticketNumber: batch.ticket_number || `#${batch.id}`,
        clientName: clientName,
        weightIn: batch.weight_in ?? 0,
        status: batch.status || 'received',
        operationType: batch.operation_type || 'milling',
        numberOfBoxes: availableBoxes > 0 ? availableBoxes : undefined
      };

      res.json(response);
    } catch (error) {
      console.error('Get batch for queuer error:', error);
      const errorMessage = error?.message || 'فشل جلب التذكرة';
      res.status(500).json({ 
        error: errorMessage,
        message: 'Failed to fetch batch details'
      });
    }
  },

  // GET /api/pressing-queue/batch/:batchId/pressing-status - Check if batch is currently being pressed
  checkBatchPressingStatus: async (req, res) => {
    try {
      const { batchId } = req.params;
      
      // Check if batch exists in pressing sessions table
      const existingSession = await PressingSession.findOne({
        where: {
          batch_id: parseInt(batchId)
        },
        include: [
          {
            model: PressingRoom,
            as: 'pressingRoom',
            attributes: ['id', 'name']
          }
        ]
      });
      
      if (existingSession) {
        res.json({
          isCurrentlyPressed: true,
          pressingRoomInfo: {
            roomName: existingSession.pressingRoom?.name || `Room ${existingSession.pressing_roomID}`,
            sessionStartTime: existingSession.start
          }
        });
      } else {
        res.json({
          isCurrentlyPressed: false,
          pressingRoomInfo: null
        });
      }
    } catch (error) {
      console.error('Check batch pressing status error:', error);
      res.status(500).json({ 
        error: error.message,
        isCurrentlyPressed: false,
        pressingRoomInfo: null
      });
    }
  },

  // GET /api/pressing-queue/display-data - Get queue display data for queuer scanner
  getQueueDisplayData: async (req, res) => {
    try {
      // Get queue items from queuer sessions (active sessions show current queue status)
      const queuerSessions = await QueuerSession.findAll({
        where: {
          status: 'active'
        },
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
        ]
      });

      // Transform queuer sessions into queue items format, only include sessions with remaining boxes > 0
      const queueItems = queuerSessions
        .map(session => {
          const batch = session.batch;
          const client = batch?.client;
          const remainingBoxes = session.totalBoxes - session.boxesQueued;
          
          return {
            batchId: session.currentBatchId,
            currentBatchId: session.currentBatchId,
            totalBoxes: session.totalBoxes,
            total_boxes: session.totalBoxes,
            boxesQueued: session.boxesQueued,
            queuedBoxes: session.boxesQueued,
            boxes_queued: session.boxesQueued,
            remainingBoxes: remainingBoxes,
            clientName: client ? `${client.firstname || ''} ${client.lastname || ''}`.trim() : 'Unknown',
            ticketNumber: batch?.ticket_number || `#${batch?.id || session.currentBatchId}`,
            status: session.status,
            queuerName: session.queuer ? `${session.queuer.firstname || ''} ${session.queuer.lastname || ''}`.trim() : 'Unknown'
          };
        })
        .filter(item => item.remainingBoxes > 0); // Only include sessions with remaining boxes

      res.json({
        queueItems: queueItems
      });
    } catch (error) {
      console.error('Get queue display data error:', error);
      res.status(500).json({ 
        error: error.message,
        queueItems: []
      });
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
