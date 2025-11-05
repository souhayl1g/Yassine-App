import db from '../models/index.js';
import { Op, Sequelize } from 'sequelize';

const { ExportPayment, Container, OilBatch, sequelize } = db;

// Get all export payments
export const getExportPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, buyerName } = req.query;
    
    const whereClause = {};
    
    if (buyerName) {
      whereClause.buyer_name = {
        [Op.iLike]: `%${buyerName}%`
      };
    }
    
    if (startDate && endDate) {
      whereClause.payment_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const offset = (page - 1) * limit;
    
    const { rows: payments, count } = await ExportPayment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Container,
          as: 'container',
          include: [
            {
              model: OilBatch,
              as: 'oilBatch'
            }
          ]
        }
      ],
      order: [['payment_date', 'DESC'], ['createdAt', 'DESC']],
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
    console.error('Error fetching export payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching export payments',
      error: error.message
    });
  }
};

// Get export payment by ID
export const getExportPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await ExportPayment.findByPk(id, {
      include: [
        {
          model: Container,
          as: 'container',
          include: [
            {
              model: OilBatch,
              as: 'oilBatch'
            }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Export payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching export payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching export payment',
      error: error.message
    });
  }
};

// Create new export payment
export const createExportPayment = async (req, res) => {
  try {
    const {
      containerId,
      amount,
      payment_date,
      payment_method = 'cash',
      buyer_name,
      buyer_contact,
      reference,
      notes
    } = req.body;

    // Validate required fields
    if (!containerId || !amount || !payment_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: containerId, amount, payment_date'
      });
    }

    // Verify container exists
    const container = await Container.findByPk(containerId);
    if (!container) {
      return res.status(404).json({
        success: false,
        message: 'Container not found'
      });
    }

    const payment = await ExportPayment.create({
      containerId,
      amount,
      payment_date,
      payment_method,
      buyer_name,
      buyer_contact,
      reference,
      notes
    });

    // Fetch the created payment with associations
    const createdPayment = await ExportPayment.findByPk(payment.id, {
      include: [
        {
          model: Container,
          as: 'container',
          include: [
            {
              model: OilBatch,
              as: 'oilBatch'
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdPayment,
      message: 'Export payment created successfully'
    });
  } catch (error) {
    console.error('Error creating export payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating export payment',
      error: error.message
    });
  }
};

// Update export payment
export const updateExportPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      payment_date,
      payment_method,
      buyer_name,
      buyer_contact,
      reference,
      notes
    } = req.body;

    const payment = await ExportPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Export payment not found'
      });
    }

    await payment.update({
      amount: amount !== undefined ? amount : payment.amount,
      payment_date: payment_date || payment.payment_date,
      payment_method: payment_method || payment.payment_method,
      buyer_name: buyer_name !== undefined ? buyer_name : payment.buyer_name,
      buyer_contact: buyer_contact !== undefined ? buyer_contact : payment.buyer_contact,
      reference: reference !== undefined ? reference : payment.reference,
      notes: notes !== undefined ? notes : payment.notes
    });

    // Fetch updated payment with associations
    const updatedPayment = await ExportPayment.findByPk(id, {
      include: [
        {
          model: Container,
          as: 'container',
          include: [
            {
              model: OilBatch,
              as: 'oilBatch'
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Export payment updated successfully'
    });
  } catch (error) {
    console.error('Error updating export payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating export payment',
      error: error.message
    });
  }
};

// Delete export payment
export const deleteExportPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await ExportPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Export payment not found'
      });
    }

    await payment.destroy();

    res.json({
      success: true,
      message: 'Export payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting export payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting export payment',
      error: error.message
    });
  }
};

// Get payments for a specific container
export const getPaymentsByContainerId = async (req, res) => {
  try {
    const { containerId } = req.params;

    const payments = await ExportPayment.findAll({
      where: { containerId },
      include: [
        {
          model: Container,
          as: 'container',
          include: [
            {
              model: OilBatch,
              as: 'oilBatch'
            }
          ]
        }
      ],
      order: [['payment_date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments for container:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments for container',
      error: error.message
    });
  }
};

// Get export payment statistics
export const getExportPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.payment_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    // Get total amounts and count
    const stats = await ExportPayment.findAll({
      where: whereClause,
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageAmount']
      ]
    });

    // Get top buyers
    const topBuyers = await ExportPayment.findAll({
      where: {
        ...whereClause,
        buyer_name: {
          [Op.ne]: null
        }
      },
      attributes: [
        'buyer_name',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['buyer_name'],
      order: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'DESC']],
      limit: 10
    });

    const formattedStats = {
      totalAmount: parseFloat(stats[0]?.dataValues?.totalAmount) || 0,
      count: parseInt(stats[0]?.dataValues?.count) || 0,
      averageAmount: parseFloat(stats[0]?.dataValues?.averageAmount) || 0,
      topBuyers: topBuyers.map(buyer => ({
        name: buyer.dataValues.buyer_name,
        totalAmount: parseFloat(buyer.dataValues.totalAmount) || 0,
        count: parseInt(buyer.dataValues.count) || 0
      }))
    };

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Error fetching export payment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching export payment statistics',
      error: error.message
    });
  }
};
