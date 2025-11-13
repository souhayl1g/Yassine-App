import db from '../models/index.js';
import { Op, Sequelize } from 'sequelize';

const { PaymentExpense, sequelize } = db;

// Get all payment expenses
export const getPaymentExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, search } = req.query;
    
    const whereClause = {};
    
    if (category && category !== 'all') {
      whereClause.category = category;
    }
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (search) {
      whereClause[Op.or] = [
        { item: { [Op.iLike]: `%${search}%` } },
        { vendor: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    
    const { rows: expenses, count } = await PaymentExpense.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment expenses',
      error: error.message
    });
  }
};

// Get payment expense by ID
export const getPaymentExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await PaymentExpense.findByPk(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Payment expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching payment expense:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment expense',
      error: error.message
    });
  }
};

// Create new payment expense
export const createPaymentExpense = async (req, res) => {
  try {
    const {
      date,
      category = 'other',
      item,
      amount,
      vendor,
      notes,
      receipt_reference
    } = req.body;

    // Validate required fields
    if (!date || !item || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date, item, amount'
      });
    }

    const expense = await PaymentExpense.create({
      date,
      category,
      item,
      amount,
      vendor,
      notes,
      receipt_reference
    });

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Payment expense created successfully'
    });
  } catch (error) {
    console.error('Error creating payment expense:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment expense',
      error: error.message
    });
  }
};

// Update payment expense
export const updatePaymentExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      category,
      item,
      amount,
      vendor,
      notes,
      receipt_reference
    } = req.body;

    const expense = await PaymentExpense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Payment expense not found'
      });
    }

    const updateData = {};
    if (date !== undefined) updateData.date = date;
    if (category !== undefined) updateData.category = category;
    if (item !== undefined) updateData.item = item;
    if (amount !== undefined) updateData.amount = amount;
    if (vendor !== undefined) updateData.vendor = vendor;
    if (notes !== undefined) updateData.notes = notes;
    if (receipt_reference !== undefined) updateData.receipt_reference = receipt_reference;

    await expense.update(updateData);

    res.json({
      success: true,
      data: expense,
      message: 'Payment expense updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment expense:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment expense',
      error: error.message
    });
  }
};

// Delete payment expense
export const deletePaymentExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await PaymentExpense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Payment expense not found'
      });
    }

    await expense.destroy();

    res.json({
      success: true,
      message: 'Payment expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment expense:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment expense',
      error: error.message
    });
  }
};

