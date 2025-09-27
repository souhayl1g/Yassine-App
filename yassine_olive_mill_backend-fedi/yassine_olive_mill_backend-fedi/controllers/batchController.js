import db from "../models/index.js"
import { Op } from 'sequelize';


const { Batch, Client, Price, OilBatch, QualityTest, PressingSession, PressingRoom } = db;


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

          { model: OilBatch, as: 'oilBatches' }
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

      const batch = await Batch.findByPk(id, {
        include: [
          { model: Client, as: 'client' },
          { model: Price, as: 'price' },
          { 
            model: OilBatch, 
            as: 'oilBatches',
            include: [{ model: QualityTest, as: 'qualityTests' }]
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
      const { clientId, weight_in, weight_out, net_weight, number_of_boxes, operation_type, ticket_number, notes, status } = req.body;
      
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
        status: status || 'received'
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
        unitPrice: 'unit_price',
        totalAmount: 'total_amount',
        operationType: 'operation_type',
        status: 'status',
        isPaid: 'is_paid',
        paymentMethod: 'payment_method',
        paymentReference: 'payment_reference',
        datePaid: 'date_paid',
        notes: 'notes',
      };

      Object.keys(req.body || {}).forEach((key) => {
        const snake = mapping[key] || key;
        updatable[snake] = req.body[key];
      });

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
