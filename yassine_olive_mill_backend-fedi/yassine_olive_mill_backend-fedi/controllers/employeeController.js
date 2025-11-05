import db from '../models/index.js';
import { Op } from 'sequelize';
const { Batch, Client, PressingRoom, PressingSession, Container, OilBatch, QueuerSession, BatchLoading, PressingQueue, ContainerContent, ContainerOilBatch } = db;

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

      // Calculate currentWeight for each container from latest ContainerContent
      const containersWithWeight = await Promise.all(
        containers.map(async (container) => {
          const latestContent = await ContainerContent.findOne({
            where: { containerId: container.id },
            order: [['recorded_at', 'DESC']]
          });

          return {
            id: container.id,
            label: container.label,
            capacity: container.capacity,
            currentWeight: latestContent ? latestContent.total_weight : 0,
            createdAt: container.createdAt,
            updatedAt: container.updatedAt
          };
        })
      );

      res.json(containersWithWeight);
    } catch (error) {
      console.error('Error fetching containers:', error);
      res.status(500).json({ error: 'Failed to fetch containers' });
    }
  },

  // Get pressing queue items for processing
  getPressingQueue: async (req, res) => {
    try {
      const queueItems = await PressingQueue.findAll({
        where: {
          status: 'queued'
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
          ['createdAt', 'ASC']
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
        const activeSession = room.pressingSessions && room.pressingSessions.length > 0 ? room.pressingSessions[0] : null;
        
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

      // DEQUEUE CHECK: After creating pressing session, check if batch should be dequeued
      try {
        await employeeController.ensureDequeueIfFullyLoaded(batch_id);
      } catch (dequeueError) {
        // Log error but don't fail the main operation
        console.error(`🔄 EMPLOYEE-DEQUEUE ERROR: Failed to check/dequeue batch ${batch_id}:`, dequeueError);
      }

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

      // DEQUEUE CHECK: After completing pressing session, ensure batch is dequeued if needed
      if (session.batch_id) {
        try {
          await employeeController.ensureDequeueIfFullyLoaded(session.batch_id);
        } catch (dequeueError) {
          // Log error but don't fail the main operation
          console.error(`🔄 EMPLOYEE-DEQUEUE ERROR: Failed to check/dequeue batch ${session.batch_id}:`, dequeueError);
        }
      }

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
      
      // DEQUEUE CHECK: After any batch update, check if we should dequeue
      try {
        await employeeController.ensureDequeueIfFullyLoaded(id);
      } catch (dequeueError) {
        // Log error but don't fail the main operation
        console.error(`🔄 EMPLOYEE-DEQUEUE ERROR: Failed to check/dequeue batch ${id}:`, dequeueError);
      }
      
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

      const queueItem = await PressingQueue.findByPk(id);
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

      // Verify container exists
      const container = await Container.findByPk(containerId);
      if (!container) {
        return res.status(404).json({ error: 'Container not found' });
      }

      // Start a transaction to ensure data consistency
      const transaction = await db.sequelize.transaction();

      try {
        // Create the oil batch (without containerId - it doesn't exist in the model)
        const oilBatch = await OilBatch.create({
          weight: parseInt(weight),
          residue: null,
          batchId: batchId ? parseInt(batchId) : null,
          pressing_sessionId: pressing_sessionId ? parseInt(pressing_sessionId) : null
        }, { transaction });

        // Get the current total weight in the container
        const latestContent = await ContainerContent.findOne({
          where: { containerId: containerId },
          order: [['recorded_at', 'DESC']],
          transaction
        });

        const currentWeight = latestContent ? latestContent.total_weight : 0;
        const newTotalWeight = currentWeight + parseInt(weight);

        // Create new container content record
        const containerContent = await ContainerContent.create({
          containerId: parseInt(containerId),
          total_weight: newTotalWeight,
          recorded_at: new Date()
        }, { transaction });

        // Link the oil batch to the container content
        await ContainerOilBatch.create({
          containerContentId: containerContent.id,
          oilBatchId: oilBatch.id,
          weight: parseInt(weight)
        }, { transaction });

        // Commit the transaction
        await transaction.commit();

        // DEQUEUE CHECK: After creating oil batch, check if associated batch should be dequeued
        try {
          await employeeController.ensureDequeueIfFullyLoaded(batchId);
        } catch (dequeueError) {
          // Log error but don't fail the main operation
          console.error(`🔄 EMPLOYEE-DEQUEUE ERROR: Failed to check/dequeue batch ${batchId}:`, dequeueError);
        }

        // Fetch the complete oil batch with all associations
        const fullOilBatch = await OilBatch.findByPk(oilBatch.id, {
          include: [
            { model: Batch, as: 'batch' },
            { model: PressingSession, as: 'pressingSession' },
            { 
              model: ContainerOilBatch, 
              as: 'containerOilBatches',
              include: [
                { 
                  model: ContainerContent, 
                  as: 'containerContent',
                  include: [{ model: Container, as: 'container' }]
                }
              ]
            }
          ]
        });

        res.status(201).json(fullOilBatch);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating oil batch with container for employee:', error);
      res.status(500).json({ error: error.message || 'Failed to create oil batch with container' });
    }
  },

  // UTILITY: Ensure dequeuing happens when batch is fully loaded
  // This is a failsafe that can be called from any employee operation
  ensureDequeueIfFullyLoaded: async (batchId) => {
    try {
      const batch = await Batch.findByPk(batchId);
      if (!batch) {
        console.log(`📝 EMPLOYEE-DEQUEUE: Batch ${batchId} not found, skipping dequeue check`);
        return false;
      }

      // Calculate total loaded boxes from BatchLoading table (most accurate source)
      const loadings = await BatchLoading.findAll({
        where: { batchId: parseInt(batchId) }
      });

      const totalLoadedBoxes = loadings.reduce((sum, loading) => {
        return sum + (loading.boxesLoaded || 0);
      }, 0);

      const totalBatchBoxes = batch.number_of_boxes || 0;

      // If all boxes are loaded, force dequeue
      if (totalLoadedBoxes >= totalBatchBoxes && totalBatchBoxes > 0) {
        try {
          const deletedRows = await QueuerSession.destroy({
            where: { currentBatchId: parseInt(batchId) }
          });
          
          if (deletedRows > 0) {
            console.log(`🔄 EMPLOYEE-FORCE-DEQUEUE: Removed batch ${batchId} from queue - ${totalLoadedBoxes}/${totalBatchBoxes} boxes loaded`);
            
            // Update batch status to reflect full loading
            await batch.update({ 
              status: 'fully_loaded',
              boxes_loaded_to_pressing: totalLoadedBoxes 
            });
            
            return true;
          } else {
            console.log(`ℹ️ EMPLOYEE-DEQUEUE-SKIP: Batch ${batchId} not in queue or already removed`);
            return false;
          }
        } catch (dequeueError) {
          console.error(`❌ EMPLOYEE-FORCE-DEQUEUE ERROR for batch ${batchId}:`, dequeueError);
          return false;
        }
      } else {
        console.log(`📊 EMPLOYEE-DEQUEUE-CHECK: Batch ${batchId} not fully loaded yet (${totalLoadedBoxes}/${totalBatchBoxes})`);
        return false;
      }
    } catch (error) {
      console.error(`❌ EMPLOYEE-ENSURE-DEQUEUE ERROR for batch ${batchId}:`, error);
      return false;
    }
  },

  // ADMIN ENDPOINT: Manual dequeue check for a specific batch (employee version)
  forceDequeueCheck: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await employeeController.ensureDequeueIfFullyLoaded(id);
      
      res.json({
        batchId: id,
        dequeued: result,
        message: result ? 'Batch successfully dequeued by employee controller' : 'Batch not eligible for dequeuing or already dequeued',
        controller: 'employee'
      });
    } catch (error) {
      console.error('Employee force dequeue check error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default employeeController;
