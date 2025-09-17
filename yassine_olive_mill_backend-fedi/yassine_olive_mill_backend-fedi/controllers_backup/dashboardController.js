import db from "../models/index.js"
import { Op } from 'sequelize';


const { Client, Batch, OilBatch, Invoice, Payment, QualityTest, ProcessingDecision, sequelize } = db;
const dashboardController = {
  // GET /api/dashboard/overview
  getOverview: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const dateFilter = startDate && endDate ? {
        createdAt: { [Op.between]: [new Date(startDate), new Date(endDate)] }
      } : {};

      // Get key metrics
      const [
        totalClients,
        activeBatches,
        totalOilProduced,
        pendingInvoices,
        recentQualityTests
      ] = await Promise.all([
        Client.count(),
        Batch.count({ where: { status: { [Op.in]: ['received', 'in_process'] } } }),
        OilBatch.sum('weight', { where: dateFilter }),
        Invoice.count({ where: { status: { [Op.in]: ['draft', 'sent', 'overdue'] } } }),
        QualityTest.count({ where: dateFilter })
      ]);

      // Revenue calculation
      const paidInvoices = await Invoice.findAll({
        where: { 
          status: 'paid',
          ...dateFilter
        },
        include: [{ model: Payment, as: 'payments' }]
      });
      
      const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

      res.json({
        metrics: {
          totalClients,
          activeBatches,
          totalOilProduced: totalOilProduced || 0,
          pendingInvoices,
          recentQualityTests,
          totalRevenue
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/dashboard/production-summary
  getProductionSummary: async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      // Production by day
      const productionData = await sequelize.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as batches_processed,
          SUM(weight) as total_oil_produced
        FROM oil_batches 
        WHERE created_at >= :startDate
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Quality distribution
      const qualityDistribution = await QualityTest.findAll({
        where: { test_date: { [Op.gte]: startDate } },
        attributes: [
          'grade',
          [sequelize.fn('COUNT', sequelize.col('grade')), 'count']
        ],
        group: ['grade'],
        raw: true
      });

      res.json({
        productionData,
        qualityDistribution,
        period: `${period} days`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/dashboard/financial-summary
  getFinancialSummary: async (req, res) => {
    try {
      const { month, year } = req.query;
      const currentDate = new Date();
      const targetMonth = month || currentDate.getMonth() + 1;
      const targetYear = year || currentDate.getFullYear();

      // Monthly revenue
      const monthlyRevenue = await Invoice.sum('amount', {
        where: {
          status: 'paid',
          createdAt: {
            [Op.between]: [
              new Date(targetYear, targetMonth - 1, 1),
              new Date(targetYear, targetMonth, 0)
            ]
          }
        }
      });

      // Outstanding invoices
      const outstandingAmount = await Invoice.sum('amount', {
        where: { status: { [Op.in]: ['sent', 'overdue'] } }
      });

      // Processing type breakdown
      const processingBreakdown = await ProcessingDecision.findAll({
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('type')), 'count'],
          [sequelize.fn('AVG', sequelize.col('unit_price')), 'avg_price']
        ],
        group: ['type'],
        raw: true
      });

      res.json({
        monthlyRevenue: monthlyRevenue || 0,
        outstandingAmount: outstandingAmount || 0,
        processingBreakdown,
        period: `${targetMonth}/${targetYear}`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

export default dashboardController;
