import db from '../models/index.js';
const { Batch, Client, PressingRoom, PressingSession, BatchLoading, PressingQueue, QueuerSession, User } = db;

const operatorController = {
  // GET /api/operator/batch/:batchId/details - Get batch details for operator scanner
  getBatchForOperator: async (req, res) => {
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
          },
          {
            model: BatchLoading,
            as: 'batchLoadings',
            include: [
              {
                model: PressingRoom,
                as: 'pressingRoom',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });

      if (!batch) {
        return res.status(404).json({ 
          error: 'التذكرة غير موجودة في النظام',
          message: 'Batch not found' 
        });
      }

      // Calculate boxes loaded to pressing from actual BatchLoading records
      const batchLoadings = await BatchLoading.findAll({
        where: { batchId: batch.id }
      });
      
      const boxesLoadedToPressing = batchLoadings.reduce((sum, loading) => {
        return sum + (loading.boxesLoaded || 0);
      }, 0);
      
      // Find active pressing rooms for this batch
      const activeRooms = await PressingSession.findAll({
        where: {
          batch_id: batch.id,
          status: 'active'
        },
        include: [
          {
            model: PressingRoom,
            as: 'pressingRoom',
            attributes: ['id', 'name', 'capacity']
          }
        ]
      });

      // Prepare client name - handle undefined clientId gracefully
      const clientName = batch.client
        ? `${batch.client.firstname || ''} ${batch.client.lastname || ''}`.trim()
        : batch.clientId 
        ? `Client #${batch.clientId}`
        : `Batch #${batch.id}`;

      // Log batch data for debugging
      console.log('Batch data for operator:', {
        id: batch.id,
        clientId: batch.clientId,
        client: batch.client,
        weight_in: batch.weight_in,
        number_of_boxes: batch.number_of_boxes,
        ticket_number: batch.ticket_number
      });

      const response = {
        id: String(batch.id),
        ticketNumber: batch.ticket_number || `#${batch.id}`,
        clientName: clientName,
        weightIn: batch.weight_in ?? 0,
        status: batch.status || 'received',
        numberOfBoxes: batch.number_of_boxes || 0,
        numberOfBidons: batch.number_of_bidons || 0,
        boxesLoadedToPressing: boxesLoadedToPressing,
        pressingRooms: activeRooms.map(session => ({
          id: session.pressingRoom.id,
          name: session.pressingRoom.name,
          status: 'active', // Room is active if it has an active session
          capacity: session.pressingRoom.capacity,
          currentSession: {
            id: session.id,
            startTime: session.start,
            numberOfBoxes: session.number_of_boxes,
            status: session.status,
            occupantName: clientName,
            batchId: batch.id
          }
        }))
      };

      res.json(response);
    } catch (error) {
      console.error('Get batch for operator error:', error);
      const errorMessage = error?.message || 'فشل جلب التذكرة';
      res.status(500).json({ 
        error: errorMessage,
        message: 'Failed to fetch batch details'
      });
    }
  },

  // GET /api/operator/rooms - Get available pressing rooms for operator
  getAvailableRooms: async (req, res) => {
    try {
      const rooms = await PressingRoom.findAll({
        include: [
          {
            model: PressingSession,
            as: 'pressingSessions',
            where: { status: 'active' },
            required: false,
            include: [
              {
                model: Batch,
                as: 'batch',
                include: [
                  {
                    model: Client,
                    as: 'client',
                    attributes: ['firstname', 'lastname']
                  }
                ]
              }
            ]
          }
        ],
        order: [['name', 'ASC']]
      });

      const roomsWithStatus = rooms.map(room => {
        const activeSessions = room.pressingSessions || [];
        const currentSession = activeSessions.length > 0 ? activeSessions[0] : null;
        
        return {
          id: room.id,
          name: room.name,
          status: currentSession ? 'active' : 'available',
          capacity: room.capacity,
          currentSession: currentSession ? {
            id: currentSession.id,
            startTime: currentSession.start,
            numberOfBoxes: currentSession.number_of_boxes,
            status: currentSession.status,
            occupantName: currentSession.batch?.client 
              ? `${currentSession.batch.client.firstname || ''} ${currentSession.batch.client.lastname || ''}`.trim()
              : `Batch #${currentSession.batch_id}`,
            batchId: currentSession.batch_id
          } : null
        };
      });

      res.json(roomsWithStatus);
    } catch (error) {
      console.error('Get available rooms error:', error);
      res.status(500).json({ 
        error: error.message,
        rooms: []
      });
    }
  },

  // GET /api/operator/rooms/display-data - Get rooms display data for operator scanner
  getRoomsDisplayData: async (req, res) => {
    try {
      // Get rooms with active sessions
      const rooms = await PressingRoom.findAll({
        include: [
          {
            model: PressingSession,
            as: 'pressingSessions',
            where: { status: 'active' },
            required: false,
            include: [
              {
                model: Batch,
                as: 'batch',
                include: [
                  {
                    model: Client,
                    as: 'client',
                    attributes: ['firstname', 'lastname']
                  }
                ]
              }
            ]
          }
        ],
        order: [['name', 'ASC']]
      });

      // Get queue items (all batches in QueuerSession table)
      const queueItems = await QueuerSession.findAll({
        include: [
          {
            model: Batch,
            as: 'batch',
            include: [
              {
                model: Client,
                as: 'client',
                attributes: ['firstname', 'lastname']
              }
            ]
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      const roomsData = rooms.map(room => {
        const activeSessions = room.pressingSessions || [];
        const currentSession = activeSessions.length > 0 ? activeSessions[0] : null;
        
        return {
          id: room.id,
          name: room.name,
          status: currentSession ? 'busy' : 'available',
          capacity: room.capacity,
          isOccupied: !!currentSession,
          currentBatch: currentSession ? {
            sessionId: currentSession.id,
            batchId: currentSession.batch_id,
            id: currentSession.batch?.ticket_number || `#${currentSession.batch_id}`,
            ticketNumber: currentSession.batch?.ticket_number || `#${currentSession.batch_id}`,
            clientName: currentSession.batch?.client 
              ? `${currentSession.batch.client.firstname || ''} ${currentSession.batch.client.lastname || ''}`.trim()
              : `Batch #${currentSession.batch_id}`,
            sessionStartTime: currentSession.start,
            numberOfBatches: currentSession.number_of_boxes,
            weightIn: currentSession.batch?.weight_in || 0,
            operationType: currentSession.batch?.operation_type || 'milling'
          } : null
        };
      });

      const queueItemsData = queueItems.map(session => {
        const remainingBoxes = session.totalBoxes - session.boxesQueued;
        return {
          id: session.id,
          batchId: session.currentBatchId,
          currentBatchId: session.currentBatchId,
          totalBoxes: session.totalBoxes,
          boxesQueued: session.boxesQueued,
          remainingBoxes: remainingBoxes,
          fullyQueued: remainingBoxes === 0,
          total_boxes: session.totalBoxes,
          boxes_queued: session.boxesQueued,
          queuedBoxes: session.boxesQueued,
          ticketNumber: session.batch?.ticket_number || `#${session.currentBatchId}`,
          clientName: session.batch?.client 
            ? `${session.batch.client.firstname || ''} ${session.batch.client.lastname || ''}`.trim()
            : `Batch #${session.currentBatchId}`,
          client: session.batch?.client ? {
            name: `${session.batch.client.firstname || ''} ${session.batch.client.lastname || ''}`.trim(),
            firstname: session.batch.client.firstname,
            lastname: session.batch.client.lastname
          } : null
        };
      });

      res.json({ 
        rooms: roomsData,
        queueItems: queueItemsData
      });
    } catch (error) {
      console.error('Get rooms display data error:', error);
      res.status(500).json({ 
        error: error.message,
        rooms: [],
        queueItems: []
      });
    }
  },

  // GET /api/operator/queue/partially-queued - Get partially queued batches for operator
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
      console.error('Get partially queued batches error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/operator/batch/:batchId/queue-status - Get queue status for a specific batch
  getBatchQueueStatus: async (req, res) => {
    try {
      const { batchId } = req.params;

      // Find queuer session for this batch - batch is "queued" if it exists in QueuerSession table
      const queuerSession = await QueuerSession.findOne({
        where: {
          currentBatchId: parseInt(batchId)
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
          remainingBoxes: 0,
          clientName: null,
          ticketNumber: null
        });
      }

      const batch = queuerSession.batch;
      const client = batch?.client;
      const remainingBoxes = queuerSession.totalBoxes - queuerSession.boxesQueued;
      
      return res.json({
        inQueue: true,
        totalBoxes: queuerSession.totalBoxes,
        boxesQueued: queuerSession.boxesQueued,
        remainingBoxes: remainingBoxes,
        fullyQueued: remainingBoxes === 0,
        clientName: client ? `${client.firstname || ''} ${client.lastname || ''}`.trim() : 'Unknown',
        ticketNumber: batch?.ticket_number || batch?.id?.toString() || 'N/A'
      });
    } catch (error) {
      console.error('Get batch queue status error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/operator/queue - Add batch to queue (operator-specific logic)
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

      // Determine batch by provided identifiers
      let batch = null;
      if (batch_id) {
        batch = await Batch.findByPk(batch_id, { include: ['client'] });
      } else if (ticketId) {
        batch = await Batch.findByPk(ticketId, { include: ['client'] });
      } else if (ticketNumber) {
        batch = await Batch.findOne({ where: { ticket_number: ticketNumber }, include: ['client'] });
      }

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      // Calculate available boxes for operator (different logic than queuer)
      const totalBoxes = batch.number_of_boxes || 0;
      const loadedBoxes = batch.boxes_loaded_to_pressing || 0;
      const committedBoxes = batch.boxes_committed_to_queue || 0;
      const availableBoxes = totalBoxes - loadedBoxes - committedBoxes;

      if (number_of_boxes > availableBoxes) {
        return res.status(400).json({ 
          error: `Not enough available boxes. Available: ${availableBoxes}, Requested: ${number_of_boxes}` 
        });
      }

      // Create queue entry
      const queueEntry = await PressingQueue.create({
        batch_id: batch.id,
        batch_loading_id: null,
        number_of_boxes,
        operator_id,
        priority,
        notes: notes || 'Added to queue by operator',
        status: 'queued'
      });

      // Update batch to reflect boxes committed to queue
      await batch.update({
        boxes_committed_to_queue: (committedBoxes || 0) + number_of_boxes
      });

      res.status(201).json({
        ...queueEntry.toJSON(),
        availableBoxesAfter: availableBoxes - number_of_boxes,
        batch: {
          id: batch.id,
          ticketNumber: batch.ticket_number,
          client: batch.client ? { 
            id: batch.client.id, 
            firstname: batch.client.firstname, 
            lastname: batch.client.lastname 
          } : null,
          weightIn: batch.weight_in,
          dateReceived: batch.date_received
        }
      });
    } catch (error) {
      console.error('Operator add to queue error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/operator/pressing-session - Start pressing session (operator-specific logic)
  startPressingSession: async (req, res) => {
    try {
      const { 
        batch_id, 
        pressing_roomID, 
        number_of_boxes, 
        operator_id, 
        notes 
      } = req.body;

      // Validate required fields
      if (!batch_id || !pressing_roomID || !number_of_boxes || !operator_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: batch_id, pressing_roomID, number_of_boxes, operator_id' 
        });
      }

      // Check if room is available
      const room = await PressingRoom.findByPk(pressing_roomID);
      if (!room) {
        return res.status(404).json({ error: 'Pressing room not found' });
      }

      // Check if room is already occupied
      const existingSession = await PressingSession.findOne({
        where: {
          pressing_roomID: pressing_roomID,
          status: 'active'
        }
      });

      if (existingSession) {
        return res.status(400).json({ 
          error: 'Room is already occupied',
          message: 'الغرفة مشغولة حالياً'
        });
      }

      // Get the batch
      const batch = await Batch.findByPk(batch_id, { include: ['client'] });
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      // Calculate total boxes already loaded across all batch loadings
      const existingLoadings = await BatchLoading.findAll({
        where: { batchId: batch_id }
      });

      const totalBoxesAlreadyLoaded = existingLoadings.reduce((sum, loading) => {
        return sum + (loading.boxesLoaded || 0);
      }, 0);

      const requestedBoxes = parseInt(number_of_boxes);
      const totalBatchBoxes = batch.number_of_boxes || 0;
      const availableBoxes = totalBatchBoxes - totalBoxesAlreadyLoaded;

      // Validate that we don't exceed the total boxes in the batch
      if (requestedBoxes > availableBoxes) {
        return res.status(400).json({ 
          error: `Cannot load ${requestedBoxes} boxes. Only ${availableBoxes} boxes available out of ${totalBatchBoxes} total.`,
          message: `لا يمكن تحميل ${requestedBoxes} صندوق. متوفر فقط ${availableBoxes} صندوق من أصل ${totalBatchBoxes}`,
          details: {
            totalBoxes: totalBatchBoxes,
            alreadyLoaded: totalBoxesAlreadyLoaded,
            availableBoxes: availableBoxes,
            requestedBoxes: requestedBoxes
          }
        });
      }

      if (requestedBoxes <= 0) {
        return res.status(400).json({ 
          error: 'Number of boxes must be greater than 0',
          message: 'عدد الصناديق يجب أن يكون أكبر من صفر'
        });
      }

      // Create pressing session
      const session = await PressingSession.create({
        batch_id: parseInt(batch_id),
        pressing_roomID: parseInt(pressing_roomID),
        number_of_boxes: parseInt(number_of_boxes),
        operator_id: parseInt(operator_id),
        start: new Date(),
        status: 'active',
        notes: notes || 'Started by operator'
      });

      // Create batch loading entry
      const batchLoading = await BatchLoading.create({
        batchId: batch_id,
        pressingRoomId: pressing_roomID,
        boxesLoaded: number_of_boxes,
        operatorId: operator_id,
        loadedAt: new Date(),
        pressingSessionId: session.id
      });

      // Update batch boxes loaded to pressing (calculate from actual batch loadings)
      const newTotalLoaded = totalBoxesAlreadyLoaded + requestedBoxes;
      await batch.update({
        boxes_loaded_to_pressing: newTotalLoaded
      });

      res.status(201).json({
        session: {
          ...session.toJSON(),
          batch: {
            id: batch.id,
            ticketNumber: batch.ticket_number,
            clientName: batch.client ? 
              `${batch.client.firstname || ''} ${batch.client.lastname || ''}`.trim() : 
              `Client #${batch.clientId}`
          },
          room: {
            id: room.id,
            name: room.name
          }
        },
        batchLoading: batchLoading.toJSON()
      });
    } catch (error) {
      console.error('Start pressing session error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Load boxes to pressing room for operator
  loadBoxesToPressing: async (req, res) => {
    try {
      const { id } = req.params;
      const { boxesToLoad, pressingSessionId, pressingRoomId, operatorId, notes } = req.body;

      const batch = await Batch.findByPk(id);
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      // Calculate total boxes already loaded across all batch loadings
      const existingLoadings = await BatchLoading.findAll({
        where: { batchId: id }
      });

      const totalBoxesAlreadyLoaded = existingLoadings.reduce((sum, loading) => {
        return sum + (loading.boxesLoaded || 0);
      }, 0);

      const requestedBoxes = parseInt(boxesToLoad);
      const totalBatchBoxes = batch.number_of_boxes || 0;
      const availableBoxes = totalBatchBoxes - totalBoxesAlreadyLoaded;

      // Validate that we don't exceed the total boxes in the batch
      if (requestedBoxes > availableBoxes) {
        return res.status(400).json({ 
          error: `Cannot load ${requestedBoxes} boxes. Only ${availableBoxes} boxes available out of ${totalBatchBoxes} total.`,
          message: `لا يمكن تحميل ${requestedBoxes} صندوق. متوفر فقط ${availableBoxes} صندوق من أصل ${totalBatchBoxes}`,
          details: {
            totalBoxes: totalBatchBoxes,
            alreadyLoaded: totalBoxesAlreadyLoaded,
            availableBoxes: availableBoxes,
            requestedBoxes: requestedBoxes
          }
        });
      }

      if (requestedBoxes <= 0) {
        return res.status(400).json({ 
          error: 'Number of boxes must be greater than 0',
          message: 'عدد الصناديق يجب أن يكون أكبر من صفر'
        });
      }

      // Create batch loading entry if pressingSessionId and pressingRoomId are provided
      if (pressingSessionId && pressingRoomId) {
        await BatchLoading.create({
          batchId: id,
          pressingRoomId: pressingRoomId,
          boxesLoaded: requestedBoxes,
          operatorId: operatorId,
          loadedAt: new Date(),
          pressingSessionId: pressingSessionId,
          notes: notes || 'Loaded by operator'
        });
      }

      // Update batch with loaded boxes information (calculate from actual batch loadings)
      const newTotalLoaded = totalBoxesAlreadyLoaded + requestedBoxes;
      await batch.update({
        boxes_loaded_to_pressing: newTotalLoaded,
        pressing_session_id: pressingSessionId,
        pressing_room_id: pressingRoomId,
        status: 'in_process'
      });

      res.json(batch);
    } catch (error) {
      console.error('Load boxes to pressing error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Complete pressing session for operator
  completePressingSession: async (req, res) => {
    try {
      const { id } = req.params;
      const { finish, status, oil_bidons_produced } = req.body;

      const session = await PressingSession.findByPk(id);
      if (!session) {
        return res.status(404).json({ error: 'Pressing session not found' });
      }

      await session.update({
        finish: finish || new Date(),
        status: status || 'done',
        oil_bidons_produced: oil_bidons_produced || 0
      });

      res.json(session);
    } catch (error) {
      console.error('Complete pressing session error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Update batch for operator
  updateBatch: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const batch = await Batch.findByPk(id);
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      await batch.update(updateData);
      res.json(batch);
    } catch (error) {
      console.error('Update batch error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default operatorController;
