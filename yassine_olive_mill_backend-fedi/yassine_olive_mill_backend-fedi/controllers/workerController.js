import db from '../models/index.js';
import { Op, Sequelize } from 'sequelize';

const { Worker, WorkerPayment, sequelize } = db;

// Get all workers
export const getWorkers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    
    const whereClause = {};
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    
    const { rows: workers, count } = await Worker.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: WorkerPayment,
          as: 'payments',
          attributes: ['amount'],
          required: false
        }
      ],
      order: [['createdOn', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate totals for each worker
    const formattedWorkers = workers.map(worker => {
      const totalPaid = worker.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
      return {
        ...worker.toJSON(),
        totalPaid,
        outstandingBalance: 0 // Placeholder - can be calculated based on salary logic
      };
    });

    res.json({
      success: true,
      data: {
        workers: formattedWorkers,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workers',
      error: error.message
    });
  }
};

// Get worker by ID
export const getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const worker = await Worker.findByPk(id, {
      include: [
        {
          model: WorkerPayment,
          as: 'payments',
          required: false
        }
      ]
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const totalPaid = worker.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        ...worker.toJSON(),
        totalPaid,
        outstandingBalance: 0
      }
    });
  } catch (error) {
    console.error('Error fetching worker:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker',
      error: error.message
    });
  }
};

// Create new worker
export const createWorker = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName'
      });
    }

    const worker = await Worker.create({
      firstName,
      lastName,
      phone,
      status,
      createdOn: new Date().toISOString().slice(0, 10)
    });

    res.status(201).json({
      success: true,
      data: worker,
      message: 'Worker created successfully'
    });
  } catch (error) {
    console.error('Error creating worker:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating worker',
      error: error.message
    });
  }
};

// Update worker
export const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      status
    } = req.body;

    const worker = await Worker.findByPk(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;

    await worker.update(updateData);

    res.json({
      success: true,
      data: worker,
      message: 'Worker updated successfully'
    });
  } catch (error) {
    console.error('Error updating worker:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating worker',
      error: error.message
    });
  }
};

// Delete worker
export const deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await Worker.findByPk(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    await worker.destroy();

    res.json({
      success: true,
      message: 'Worker deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting worker:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting worker',
      error: error.message
    });
  }
};

