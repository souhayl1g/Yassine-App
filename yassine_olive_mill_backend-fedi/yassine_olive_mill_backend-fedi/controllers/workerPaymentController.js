import db from '../models/index.js';
import { Op, Sequelize } from 'sequelize';

const { WorkerPayment, Worker, sequelize } = db;

// Get all worker payments
export const getWorkerPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, workerId, startDate, endDate, type } = req.query;
    
    const whereClause = {};
    
    if (workerId) {
      whereClause.workerId = workerId;
    }
    
    if (type && type !== 'all') {
      whereClause.type = type;
    }
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const offset = (page - 1) * limit;
    
    const { rows: payments, count } = await WorkerPayment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching worker payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker payments',
      error: error.message
    });
  }
};

// Get worker payment by ID
export const getWorkerPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await WorkerPayment.findByPk(id, {
      include: [
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Worker payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching worker payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker payment',
      error: error.message
    });
  }
};

// Create new worker payment
export const createWorkerPayment = async (req, res) => {
  try {
    const {
      workerId,
      date,
      amount,
      type = 'advance',
      method = 'cash',
      notes
    } = req.body;

    // Validate required fields
    if (!workerId || !date || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: workerId, date, amount'
      });
    }

    // Verify worker exists
    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const payment = await WorkerPayment.create({
      workerId,
      date,
      amount,
      type,
      method,
      notes
    });

    // Fetch the created payment with associations
    const createdPayment = await WorkerPayment.findByPk(payment.id, {
      include: [
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdPayment,
      message: 'Worker payment created successfully'
    });
  } catch (error) {
    console.error('Error creating worker payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating worker payment',
      error: error.message
    });
  }
};

// Update worker payment
export const updateWorkerPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      amount,
      type,
      method,
      notes
    } = req.body;

    const payment = await WorkerPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Worker payment not found'
      });
    }

    const updateData = {};
    if (date !== undefined) updateData.date = date;
    if (amount !== undefined) updateData.amount = amount;
    if (type !== undefined) updateData.type = type;
    if (method !== undefined) updateData.method = method;
    if (notes !== undefined) updateData.notes = notes;

    await payment.update(updateData);

    // Fetch updated payment with associations
    const updatedPayment = await WorkerPayment.findByPk(id, {
      include: [
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Worker payment updated successfully'
    });
  } catch (error) {
    console.error('Error updating worker payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating worker payment',
      error: error.message
    });
  }
};

// Delete worker payment
export const deleteWorkerPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await WorkerPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Worker payment not found'
      });
    }

    await payment.destroy();

    res.json({
      success: true,
      message: 'Worker payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting worker payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting worker payment',
      error: error.message
    });
  }
};

