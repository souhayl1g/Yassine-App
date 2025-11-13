import db from '../models/index.js';
import { Op, Sequelize } from 'sequelize';

const { OwnerFund, Container, OwnerFundContainer, TicketPayment, sequelize } = db;

// Helper to calculate spending from outgoing ticket payments for a specific date
const calculateSpendingFromTicketPayments = async (date) => {
  try {
    const outgoingPayments = await TicketPayment.findAll({
      where: {
        payment_date: date,
        payment_type: 'outgoing'
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount']
      ]
    });

    const totalAmount = outgoingPayments[0]?.dataValues?.totalAmount || 0;
    return parseFloat(totalAmount) || 0;
  } catch (error) {
    console.error('Error calculating spending from ticket payments:', error);
    return 0;
  }
};

// Helper to format owner fund response
const formatOwnerFund = (fund) => {
  const json = fund.toJSON ? fund.toJSON() : fund;
  return {
    ...json,
    allocatedContainers: fund.containers?.map(afc => {
      const container = afc.container || afc;
      return typeof container === 'object' && container.id 
        ? { id: container.id, label: container.label }
        : container;
    }) || [],
    relatedSales: []
  };
};

// Get all owner funds
export const getOwnerFunds = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const offset = (page - 1) * limit;
    
    const { rows: funds, count } = await OwnerFund.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: OwnerFundContainer,
          as: 'containers',
          include: [
            {
              model: Container,
              as: 'container',
              attributes: ['id', 'label']
            }
          ]
        }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Recalculate spending for each fund from outgoing ticket payments
    const formattedFunds = await Promise.all(
      funds.map(async (fund) => {
        const amountSpent = await calculateSpendingFromTicketPayments(fund.date);
        // Update the fund in database if spending has changed
        if (amountSpent !== parseFloat(fund.amountSpent || 0)) {
          await fund.update({
            amountSpent,
            balance: parseFloat(fund.startingFunds || 0) - amountSpent
          });
          // Reload to get updated data
          await fund.reload();
        }
        return formatOwnerFund(fund);
      })
    );

    res.json({
      success: true,
      data: {
        funds: formattedFunds,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching owner funds:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching owner funds',
      error: error.message
    });
  }
};

// Get owner fund by ID
export const getOwnerFundById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const fund = await OwnerFund.findByPk(id, {
      include: [
        {
          model: OwnerFundContainer,
          as: 'containers',
          include: [
            {
              model: Container,
              as: 'container',
              attributes: ['id', 'label']
            }
          ]
        }
      ]
    });

    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Owner fund not found'
      });
    }

    // Recalculate spending from outgoing ticket payments
    const amountSpent = await calculateSpendingFromTicketPayments(fund.date);
    // Update the fund if spending has changed
    if (amountSpent !== parseFloat(fund.amountSpent || 0)) {
      await fund.update({
        amountSpent,
        balance: parseFloat(fund.startingFunds || 0) - amountSpent
      });
      // Reload to get updated associations
      await fund.reload({
        include: [
          {
            model: OwnerFundContainer,
            as: 'containers',
            include: [
              {
                model: Container,
                as: 'container',
                attributes: ['id', 'label']
              }
            ]
          }
        ]
      });
    }

    const formattedFund = formatOwnerFund(fund);

    res.json({
      success: true,
      data: formattedFund
    });
  } catch (error) {
    console.error('Error fetching owner fund:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching owner fund',
      error: error.message
    });
  }
};

// Create new owner fund
export const createOwnerFund = async (req, res) => {
  try {
    const {
      date,
      startingFunds,
      notes,
      allocatedContainers = []
    } = req.body;

    // Validate required fields
    if (!date || startingFunds === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date, startingFunds'
      });
    }

    // Check if fund for this date already exists
    const existing = await OwnerFund.findOne({ where: { date } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Owner fund for this date already exists'
      });
    }

    // Calculate spending from outgoing ticket payments for this date
    const amountSpent = await calculateSpendingFromTicketPayments(date);
    const balance = Number(startingFunds) - amountSpent;

    const fund = await OwnerFund.create({
      date,
      startingFunds,
      amountSpent,
      balance,
      notes
    });

    // Add allocated containers
    if (allocatedContainers && allocatedContainers.length > 0) {
      await OwnerFundContainer.bulkCreate(
        allocatedContainers.map(containerId => ({
          ownerFundId: fund.id,
          containerId
        }))
      );
    }

    // Fetch the created fund with associations
    const createdFund = await OwnerFund.findByPk(fund.id, {
      include: [
        {
          model: OwnerFundContainer,
          as: 'containers',
          include: [
            {
              model: Container,
              as: 'container',
              attributes: ['id', 'label']
            }
          ]
        }
      ]
    });

    const formattedFund = formatOwnerFund(createdFund);

    res.status(201).json({
      success: true,
      data: formattedFund,
      message: 'Owner fund created successfully'
    });
  } catch (error) {
    console.error('Error creating owner fund:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating owner fund',
      error: error.message
    });
  }
};

// Update owner fund
export const updateOwnerFund = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startingFunds,
      notes,
      allocatedContainers
    } = req.body;

    const fund = await OwnerFund.findByPk(id);
    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Owner fund not found'
      });
    }

    const updateData = {};
    if (startingFunds !== undefined) updateData.startingFunds = startingFunds;
    if (notes !== undefined) updateData.notes = notes;

    // Recalculate spending from outgoing ticket payments (always recalculate, don't accept from request)
    const amountSpent = await calculateSpendingFromTicketPayments(fund.date);
    updateData.amountSpent = amountSpent;

    // Recalculate balance
    const newStartingFunds = updateData.startingFunds !== undefined ? updateData.startingFunds : fund.startingFunds;
    updateData.balance = Number(newStartingFunds) - amountSpent;

    await fund.update(updateData);

    // Update allocated containers if provided
    if (allocatedContainers !== undefined) {
      await OwnerFundContainer.destroy({ where: { ownerFundId: id } });
      if (allocatedContainers.length > 0) {
        await OwnerFundContainer.bulkCreate(
          allocatedContainers.map(containerId => ({
            ownerFundId: id,
            containerId
          }))
        );
      }
    }

    // Fetch updated fund with associations
    const updatedFund = await OwnerFund.findByPk(id, {
      include: [
        {
          model: OwnerFundContainer,
          as: 'containers',
          include: [
            {
              model: Container,
              as: 'container',
              attributes: ['id', 'label']
            }
          ]
        }
      ]
    });

    const formattedFund = formatOwnerFund(updatedFund);

    res.json({
      success: true,
      data: formattedFund,
      message: 'Owner fund updated successfully'
    });
  } catch (error) {
    console.error('Error updating owner fund:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating owner fund',
      error: error.message
    });
  }
};

// Delete owner fund
export const deleteOwnerFund = async (req, res) => {
  try {
    const { id } = req.params;

    const fund = await OwnerFund.findByPk(id);
    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Owner fund not found'
      });
    }

    // Delete associated containers
    await OwnerFundContainer.destroy({ where: { ownerFundId: id } });
    await fund.destroy();

    res.json({
      success: true,
      message: 'Owner fund deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting owner fund:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting owner fund',
      error: error.message
    });
  }
};

