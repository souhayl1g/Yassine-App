import db from "../models/index.js"
import { Op } from 'sequelize';


const { Batch, Client, Price, OilBatch, QualityTest, PressingSession, PressingRoom, BatchLoading } = db;


const batchController = {
  // GET /api/batches
  getAllBatches: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, clientId } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const whereClause = {};
      if (status) whereClause.status = status;
      if (clientId) whereClause.clientId = parseInt(clientId);

      const batches = await Batch.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          { model: Client, as: 'client', attributes: ['id', 'firstname', 'lastname'] },
          { model: Price, as: 'price' },

          { 
            model: db.PressingRoom, 
            as: 'pressingRoom', 
            attributes: ['id', 'name'],
            required: false // LEFT JOIN to include batches without pressing rooms
          },

          { model: OilBatch, as: 'oilBatches' },
          { 
            model: db.BatchLoading, 
            as: 'batchLoadings',
            include: [
              { model: PressingRoom, as: 'pressingRoom', attributes: ['id', 'name'] },
              { model: db.User, as: 'operator', attributes: ['id', 'firstname', 'lastname', 'email'] }
            ],
            required: false // LEFT JOIN to include batches without loading history
          }
        ],
        order: [['date_received', 'DESC']]
      });

      res.json({
        batches: batches.rows,
        pagination: {
          total: batches.count,
          page: parseInt(page),
          pages: Math.ceil(batches.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get all batches error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/batches/:id
  getBatchById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
      }

      const batch = await Batch.findByPk(req.params.id, {
        include: [
          { model: Client, as: 'client' },
          { 
            model: OilBatch, 
            as: 'oilBatches',
            include: [{ model: QualityTest, as: 'qualityTests' }]
          },
          { 
            model: db.BatchLoading, 
            as: 'batchLoadings',
            include: [
              { model: PressingRoom, as: 'pressingRoom', attributes: ['id', 'name'] },
              { model: db.User, as: 'operator', attributes: ['id', 'firstname', 'lastname', 'email'] },
              { model: PressingSession, as: 'pressingSession', attributes: ['id', 'start', 'finish'] }
            ],
            order: [['loadedAt', 'ASC']]
          }
        ]
      });

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      res.json(batch);
    } catch (error) {
      console.error('Get batch by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/batches
  createBatch: async (req, res) => {
    try {
      const { clientId, weight_in, weight_out, net_weight, number_of_boxes, operation_type, ticket_number, notes, status, taux } = req.body;
      
      console.log('Creating batch with payload:', req.body);
      
      if (!clientId) {
        return res.status(400).json({ error: 'clientId is required' });
      }

      // Get the latest price record
      const latestPrice = await Price.findOne({
        order: [['createdAt', 'DESC']]
      });

      const batch = await Batch.create({
        clientId: parseInt(clientId),
        priceId: latestPrice ? latestPrice.id : null, // Assign latest price
        weight_in: weight_in ? parseInt(weight_in) : null,
        weight_out: weight_out ? parseInt(weight_out) : null,
        net_weight: net_weight ? parseInt(net_weight) : null,
        number_of_boxes: number_of_boxes ? parseInt(number_of_boxes) : null,
        operation_type: operation_type || 'milling', // Add operation_type field
        ticket_number: ticket_number || null,
        notes: notes || null,
        status: status || 'received',
        taux: taux ? parseFloat(taux) : null // Add taux field for oil extraction percentage
      });

      const fullBatch = await Batch.findByPk(batch.id, {
        include: [
          { model: Client, as: 'client' },
          { model: Price, as: 'price' }
        ]
      });

      res.status(201).json(fullBatch);
    } catch (error) {
      console.error('Create batch error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/batches/:id/status
  updateBatchStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
      }

      if (!status || !['received', 'in_process', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const batch = await Batch.findByPk(id);
      
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      await batch.update({ status });
      res.json(batch);
    } catch (error) {
      console.error('Update batch status error:', error);
      res.status(400).json({ error: error.message });
    }
  }
,

  // PUT /api/batches/:id - generic update
  updateBatch: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid batch ID' });

      const batch = await Batch.findByPk(id);
      if (!batch) return res.status(404).json({ error: 'Batch not found' });

      // Accept either camelCase or snake_case field names
      const updatable = {};
      const mapping = {
        weightIn: 'weight_in',
        weightOut: 'weight_out',
        netWeight: 'net_weight',
        numberOfBoxes: 'number_of_boxes',
        numberOfBidons: 'number_of_bidons',
        bidons_brought: 'bidons_brought',  // Add support for bidons_brought field
        boxesLoadedToPressing: 'boxes_loaded_to_pressing',
        unitPrice: 'unit_price',
        totalAmount: 'total_amount',
        operationType: 'operation_type',
        status: 'status',
        isPaid: 'is_paid',
        paymentMethod: 'payment_method',
        paymentReference: 'payment_reference',
        datePaid: 'date_paid',
        notes: 'notes',
        taux: 'taux', // Add support for taux field
      };

      Object.keys(req.body || {}).forEach((key) => {
        const snake = mapping[key] || key;
        updatable[snake] = req.body[key];
      });

      // Validate boxes_loaded_to_pressing doesn't exceed number_of_boxes
      if (updatable.boxes_loaded_to_pressing !== undefined) {
        const currentBoxesLoaded = batch.boxes_loaded_to_pressing || 0;
        const newBoxesLoaded = parseInt(updatable.boxes_loaded_to_pressing);
        const totalBoxes = updatable.number_of_boxes !== undefined 
          ? parseInt(updatable.number_of_boxes) 
          : batch.number_of_boxes || 0;

        if (newBoxesLoaded > totalBoxes) {
          return res.status(400).json({ 
            error: `Cannot load ${newBoxesLoaded} boxes to pressing. Maximum available: ${totalBoxes}` 
          });
        }

        if (newBoxesLoaded < 0) {
          return res.status(400).json({ 
            error: 'Boxes loaded to pressing cannot be negative' 
          });
        }
      }

      await batch.update(updatable);
      const updated = await Batch.findByPk(id, { 
        include: [
          { model: Client, as: 'client' },
          { model: Price, as: 'price' }
        ] 
      });
      res.json(updated);
    } catch (error) {
      console.error('Update batch error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/batches/:id/assign-room
  assignToRoom: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid batch ID' });

      const { pressing_room_id, estimated_time } = req.body;
      if (!pressing_room_id) {
        return res.status(400).json({ error: 'pressing_room_id is required' });
      }

      const batch = await Batch.findByPk(id, {
        include: [
          { model: Client, as: 'client', attributes: ['id', 'firstname', 'lastname'] }
        ]
      });
      
      if (!batch) return res.status(404).json({ error: 'Batch not found' });

      // Check if room is already occupied
      const activeSession = await PressingSession.findOne({
        where: { 
          pressing_roomID: parseInt(pressing_room_id),
          finish: null 
        }
      });

      if (activeSession) {
        return res.status(400).json({ error: 'Pressing room is already occupied' });
      }

      // Create pressing session
      const session = await PressingSession.create({
        pressing_roomID: parseInt(pressing_room_id),
        number_of_boxes: batch.number_of_boxes || 1,
        start: new Date()
      });

      // Update batch with pressing room assignment
      await batch.update({
        pressing_room_id: parseInt(pressing_room_id),
        session_start_time: new Date(),
        estimated_time: estimated_time || 60,
        status: 'in_process'
      });

      // Return updated batch with client info
      const updatedBatch = await Batch.findByPk(id, {
        include: [
          { model: Client, as: 'client', attributes: ['id', 'firstname', 'lastname'] },
          { model: Price, as: 'price' },
          { model: db.PressingRoom, as: 'pressingRoom', attributes: ['id', 'name'] }
        ]
      });

      res.json({ batch: updatedBatch, session });
    } catch (error) {
      console.error('Assign batch to room error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/batches/:id/complete-session
  completeSession: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid batch ID' });

      const batch = await Batch.findByPk(id);
      if (!batch) return res.status(404).json({ error: 'Batch not found' });

      // Find and finish the active pressing session
      if (batch.pressing_room_id) {
        const activeSession = await PressingSession.findOne({
          where: { 
            pressing_roomID: batch.pressing_room_id,
            finish: null 
          }
        });

        if (activeSession) {
          await activeSession.update({ finish: new Date() });
        }
      }

      await batch.update({
        pressing_room_id: null,
        session_start_time: null,
        estimated_time: null,
        status: 'completed'
      });

      res.json(batch);
    } catch (error) {
      console.error('Complete batch session error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/batches/:id/load-boxes
  loadBoxesToPressing: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { boxesToLoad, pressingSessionId, pressingRoomId, operatorId, notes } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
      }

      if (!boxesToLoad || boxesToLoad <= 0) {
        return res.status(400).json({ error: 'Number of boxes to load must be positive' });
      }

      if (!pressingSessionId || !pressingRoomId) {
        return res.status(400).json({ error: 'pressingSessionId and pressingRoomId are required' });
      }

      const batch = await Batch.findByPk(id);
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      const totalBoxes = batch.number_of_boxes || 0;
      const currentlyLoaded = batch.boxes_loaded_to_pressing || 0;
      const newTotalLoaded = currentlyLoaded + parseInt(boxesToLoad);

      if (newTotalLoaded > totalBoxes) {
        return res.status(400).json({ 
          error: `Cannot load ${boxesToLoad} more boxes. Available: ${totalBoxes - currentlyLoaded}, Would exceed total: ${totalBoxes}` 
        });
      }

      // Start a transaction to ensure data consistency
      const transaction = await db.sequelize.transaction();

      try {
        // Update batch with new loaded count
        await batch.update({
          boxes_loaded_to_pressing: newTotalLoaded,
          status: newTotalLoaded > 0 ? 'in_process' : batch.status
        }, { transaction });

        // Create BatchLoading record for history tracking
        const loadingRecord = await db.BatchLoading.create({
          batchId: id,
          pressingSessionId: parseInt(pressingSessionId),
          pressingRoomId: parseInt(pressingRoomId),
          boxesLoaded: parseInt(boxesToLoad),
          operatorId: operatorId ? parseInt(operatorId) : null,
          notes: notes || null,
          loadedAt: new Date()
        }, { transaction });

        await transaction.commit();

        const updatedBatch = await Batch.findByPk(id, {
          include: [
            { model: Client, as: 'client' },
            { model: Price, as: 'price' },
            { model: PressingRoom, as: 'pressingRoom' },
            { model: db.BatchLoading, as: 'batchLoadings', include: [
              { model: PressingRoom, as: 'pressingRoom', attributes: ['id', 'name'] },
              { model: db.User, as: 'operator', attributes: ['id', 'firstname', 'lastname', 'email'] }
            ]}
          ]
        });

        res.json({
          batch: updatedBatch,
          loadingRecord,
          message: `Successfully loaded ${boxesToLoad} boxes to pressing. Total loaded: ${newTotalLoaded}/${totalBoxes}`
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Load boxes to pressing error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/batches/:id
  deleteBatch: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid batch ID' });

      const batch = await Batch.findByPk(id);
      if (!batch) return res.status(404).json({ error: 'Batch not found' });

      await batch.destroy();
      res.json({ success: true, id });
    } catch (error) {
      console.error('Delete batch error:', error);
      res.status(400).json({ error: error.message });
    }
  }
};

export default batchController;
