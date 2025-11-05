import db from '../models/index.js';
import { Op, Sequelize } from 'sequelize';

const { TicketPayment, Batch, Client, sequelize } = db;

// Get all ticket payments
export const getTicketPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, operationType, paymentType, startDate, endDate } = req.query;
    
    const whereClause = {};
    
    if (operationType) {
      whereClause.operation_type = operationType;
    }
    
    if (paymentType) {
      whereClause.payment_type = paymentType;
    }
    
    if (startDate && endDate) {
      whereClause.payment_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const offset = (page - 1) * limit;
    
    const { rows: payments, count } = await TicketPayment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Batch,
          as: 'ticket',
          include: [
            {
              model: Client,
              as: 'client',
              attributes: ['id', 'name', 'phone']
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
    console.error('Error fetching ticket payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket payments',
      error: error.message
    });
  }
};

// Get ticket payment by ID
export const getTicketPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await TicketPayment.findByPk(id, {
      include: [
        {
          model: Batch,
          as: 'ticket',
          include: [
            {
              model: Client,
              as: 'client',
              attributes: ['id', 'name', 'phone']
            }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ticket payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching ticket payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket payment',
      error: error.message
    });
  }
};

// Create new ticket payment
export const createTicketPayment = async (req, res) => {
  try {
    const {
      ticketId,
      amount,
      payment_date,
      payment_method = 'cash',
      operation_type,
      reference,
      notes
    } = req.body;

    // Validate required fields
    if (!ticketId || !amount || !payment_date || !operation_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: ticketId, amount, payment_date, operation_type'
      });
    }

    // Validate operation_type
    if (!['sale', 'pressing'].includes(operation_type)) {
      return res.status(400).json({
        success: false,
        message: 'operation_type must be either "sale" or "pressing"'
      });
    }

    // Determine payment_type based on operation_type
    const payment_type = operation_type === 'sale' ? 'outgoing' : 'incoming';

    // Verify ticket exists
    const ticket = await Batch.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const payment = await TicketPayment.create({
      ticketId,
      amount,
      payment_date,
      payment_method,
      payment_type,
      operation_type,
      reference,
      notes
    });

    // Fetch the created payment with associations
    const createdPayment = await TicketPayment.findByPk(payment.id, {
      include: [
        {
          model: Batch,
          as: 'ticket',
          include: [
            {
              model: Client,
              as: 'client',
              attributes: ['id', 'name', 'phone']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdPayment,
      message: 'Ticket payment created successfully'
    });
  } catch (error) {
    console.error('Error creating ticket payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ticket payment',
      error: error.message
    });
  }
};

// Update ticket payment
export const updateTicketPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      payment_date,
      payment_method,
      reference,
      notes
    } = req.body;

    const payment = await TicketPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ticket payment not found'
      });
    }

    await payment.update({
      amount: amount !== undefined ? amount : payment.amount,
      payment_date: payment_date || payment.payment_date,
      payment_method: payment_method || payment.payment_method,
      reference: reference !== undefined ? reference : payment.reference,
      notes: notes !== undefined ? notes : payment.notes
    });

    // Fetch updated payment with associations
    const updatedPayment = await TicketPayment.findByPk(id, {
      include: [
        {
          model: Batch,
          as: 'ticket',
          include: [
            {
              model: Client,
              as: 'client',
              attributes: ['id', 'name', 'phone']
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Ticket payment updated successfully'
    });
  } catch (error) {
    console.error('Error updating ticket payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket payment',
      error: error.message
    });
  }
};

// Delete ticket payment
export const deleteTicketPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await TicketPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ticket payment not found'
      });
    }

    await payment.destroy();

    res.json({
      success: true,
      message: 'Ticket payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ticket payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting ticket payment',
      error: error.message
    });
  }
};

// Get payments for a specific ticket
export const getPaymentsByTicketId = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const payments = await TicketPayment.findAll({
      where: { ticketId },
      include: [
        {
          model: Batch,
          as: 'ticket',
          include: [
            {
              model: Client,
              as: 'client',
              attributes: ['id', 'name', 'phone']
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
    console.error('Error fetching payments for ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments for ticket',
      error: error.message
    });
  }
};

// Get payment statistics
export const getTicketPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.payment_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    // Get total amounts by payment type and operation type
    const stats = await TicketPayment.findAll({
      where: whereClause,
      attributes: [
        'payment_type',
        'operation_type',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['payment_type', 'operation_type']
    });

    const formattedStats = {
      incoming: {
        pressing: {
          totalAmount: 0,
          count: 0
        }
      },
      outgoing: {
        sale: {
          totalAmount: 0,
          count: 0
        }
      }
    };

    stats.forEach(stat => {
      const paymentType = stat.dataValues.payment_type;
      const operationType = stat.dataValues.operation_type;
      const totalAmount = parseFloat(stat.dataValues.totalAmount) || 0;
      const count = parseInt(stat.dataValues.count) || 0;

      if (formattedStats[paymentType] && formattedStats[paymentType][operationType]) {
        formattedStats[paymentType][operationType] = {
          totalAmount,
          count
        };
      }
    });

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Error fetching ticket payment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket payment statistics',
      error: error.message
    });
  }
};
