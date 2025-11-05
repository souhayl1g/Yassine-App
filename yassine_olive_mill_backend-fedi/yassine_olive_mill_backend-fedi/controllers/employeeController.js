import db from '../models/index.js';
import { Op } from 'sequelize';
const { Batch, Client, PressingRoom, PressingSession, Container, OilBatch, QueuerSession } = db;

const employeeController = {
  // Get batch details for employee scanner
  getBatchForEmployee: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Try to parse as number first, fallback to string search
      let whereCondition;
      const numericId = parseInt(id, 10);
      
      if (!isNaN(numericId)) {
        whereCondition = { id: numericId };
      } else {
        whereCondition = { ticket_number: id };
      }

      const batch = await Batch.findOne({
        where: whereCondition,
        include: [
          {
            model: Client,
            as: 'client',
            attributes: ['id', 'firstname', 'lastname']
          }
        ]
      });

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      res.json(batch);
    } catch (error) {
      console.error('Error fetching batch for employee:', error);
      res.status(500).json({ error: 'Failed to fetch batch details' });
    }
  },

  // Get containers for oil storage selection
  getContainers: async (req, res) => {
    try {
      const containers = await Container.findAll({
        order: [['label', 'ASC']]
      });

      res.json(containers);
    } catch (error) {
      console.error('Error fetching containers:', error);
      res.status(500).json({ error: 'Failed to fetch containers' });
    }
  },

  // Get pressing queue items for processing
  getPressingQueue: async (req, res) => {
    try {
      const queueItems = await QueuerSession.findAll({
        where: {
          remaining_boxes: {
            [Op.gt]: 0
          }
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
        ],
        order: [
          ['priority', 'DESC'],
          ['created_at', 'ASC']
        ]
      });

      res.json(queueItems);
    } catch (error) {
      console.error('Error fetching pressing queue for employee:', error);
      res.status(500).json({ error: 'Failed to fetch pressing queue' });
    }
  },

  // Get pressing rooms display data for finding batch locations
  getRoomsDisplayData: async (req, res) => {
    try {
      const rooms = await PressingRoom.findAll({
        include: [
          {
            model: PressingSession,
            as: 'sessions',
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
                    attributes: ['id', 'firstname', 'lastname']
                  }
                ]
              }
            ]
          }
        ]
      });

      // Transform data to match expected format
      const transformedRooms = rooms.map(room => {
        const activeSession = room.sessions && room.sessions.length > 0 ? room.sessions[0] : null;
        
        return {
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          status: activeSession ? 'busy' : 'available',
          currentBatch: activeSession ? {
            sessionId: activeSession.id,
            batchId: activeSession.batch_id,
            id: activeSession.batch.ticket_number || activeSession.batch_id,
            clientName: activeSession.batch.client 
              ? `${activeSession.batch.client.firstname || ''} ${activeSession.batch.client.lastname || ''}`.trim()
              : `Client #${activeSession.batch.clientId}`,
            weightIn: activeSession.batch.weight_in,
            numberOfBatches: activeSession.number_of_boxes,
            sessionStartTime: activeSession.start,
            operationType: activeSession.batch.operation_type || 'milling'
          } : null
        };
      });

      res.json(transformedRooms);
    } catch (error) {
      console.error('Error fetching rooms display data for employee:', error);
      res.status(500).json({ error: 'Failed to fetch rooms display data' });
    }
  },

  // Create pressing session (for processing next queue item)
  createPressingSession: async (req, res) => {
    try {
      const {
        batch_id,
        pressing_roomID,
        number_of_boxes,
        operator_id,
        start,
        status
      } = req.body;

      // Validate required fields
      if (!batch_id || !pressing_roomID || !number_of_boxes) {
        return res.status(400).json({ 
          error: 'Missing required fields: batch_id, pressing_roomID, number_of_boxes' 
        });
      }

      const session = await PressingSession.create({
        batch_id,
        pressing_roomID,
        number_of_boxes,
        operator_id: operator_id || 1,
        start: start || new Date(),
        status: status || 'active'
      });

      res.json(session);
    } catch (error) {
      console.error('Error creating pressing session for employee:', error);
      res.status(500).json({ error: 'Failed to create pressing session' });
    }
  },

  // Complete pressing session
  completePressingSession: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        finish,
        status,
        oil_bidons_produced
      } = req.body;

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
      console.error('Error completing pressing session for employee:', error);
      res.status(500).json({ error: 'Failed to complete pressing session' });
    }
  },

  // Update batch status and details
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
      console.error('Error updating batch for employee:', error);
      res.status(500).json({ error: 'Failed to update batch' });
    }
  },

  // Remove queue item
  removeFromQueue: async (req, res) => {
    try {
      const { id } = req.params;

      const queueItem = await QueuerSession.findByPk(id);
      if (!queueItem) {
        return res.status(404).json({ error: 'Queue item not found' });
      }

      await queueItem.destroy();
      res.json({ message: 'Queue item removed successfully' });
    } catch (error) {
      console.error('Error removing queue item for employee:', error);
      res.status(500).json({ error: 'Failed to remove queue item' });
    }
  },

  // Create oil batch with container assignment
  createOilBatchWithContainer: async (req, res) => {
    try {
      const {
        weight,
        batchId,
        pressing_sessionId,
        containerId
      } = req.body;

      // Validate required fields
      if (!weight || !batchId || !pressing_sessionId || !containerId) {
        return res.status(400).json({ 
          error: 'Missing required fields: weight, batchId, pressing_sessionId, containerId' 
        });
      }

      // Check if container exists
      const container = await Container.findByPk(containerId);
      if (!container) {
        return res.status(404).json({ error: 'Container not found' });
      }

      // Create oil batch
      const oilBatch = await OilBatch.create({
        weight: parseInt(weight),
        batchId,
        pressing_sessionId,
        containerId
      });

      // Update container weight
      const newWeight = (container.currentWeight || 0) + parseInt(weight);
      await container.update({ currentWeight: newWeight });

      res.json(oilBatch);
    } catch (error) {
      console.error('Error creating oil batch with container for employee:', error);
      res.status(500).json({ error: 'Failed to create oil batch with container' });
    }
  }
};

export default employeeController;
