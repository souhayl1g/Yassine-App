import db from "../models/index.js"
import { Op } from 'sequelize';

const { Client, Batch, OilBatch, Invoice, Payment, QualityTest, ProcessingDecision, PressingSession, sequelize } = db;

const dashboardController = {
  // GET /api/dashboard/overview
  getOverview: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const dateFilter = startDate && endDate ? {
        createdAt: { [Op.between]: [new Date(startDate), new Date(endDate)] }
      } : {};

      // Compute today range
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get key metrics with error handling for each
      const [
        totalClients,
        activeBatches,
        totalOilProduced,
        pendingInvoices,
        recentQualityTests,
        todayTickets,
        activeRooms,
        currentBoxes
      ] = await Promise.allSettled([
        Client.count().catch(() => 0),
        Batch.count({ where: { status: { [Op.in]: ['received', 'in_process'] } } }).catch(() => 0),
        OilBatch.sum('weight', { where: dateFilter }).catch(() => 0),
        Invoice.count({ where: { status: { [Op.in]: ['draft', 'sent', 'overdue'] } } }).catch(() => 0),
        QualityTest.count({ where: dateFilter }).catch(() => 0),
        Batch.count({ where: { createdAt: { [Op.gte]: startOfToday } } }).catch(() => 0),
        PressingSession.count({ where: { finish: null } }).catch(() => 0),
        PressingSession.sum('number_of_boxes', { where: { finish: null } }).catch(() => 0)
      ]);

      // Revenue calculation - simplified to avoid association issues
      let totalRevenue = 0;
      try {
        const paidInvoices = await Invoice.findAll({
          where: { 
            status: 'paid',
            ...dateFilter
          }
        });
        totalRevenue = paidInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
      } catch (revenueError) {
        console.warn('Revenue calculation failed:', revenueError.message);
      }

      // Extract values from settled promises
      const getValue = (result) => result.status === 'fulfilled' ? result.value : 0;

      res.json({
        metrics: {
          totalClients: getValue(totalClients),
          activeBatches: getValue(activeBatches),
          totalOilProduced: getValue(totalOilProduced) || 0,
          pendingInvoices: getValue(pendingInvoices),
          recentQualityTests: getValue(recentQualityTests),
          totalRevenue,
          todayTickets: getValue(todayTickets) || 0,
          activeRooms: getValue(activeRooms) || 0,
          currentBoxes: getValue(currentBoxes) || 0
        }
      });
    } catch (error) {
      console.error('Get overview error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/dashboard/production-summary
  getProductionSummary: async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const periodDays = parseInt(period);
      if (isNaN(periodDays)) {
        return res.status(400).json({ error: 'Invalid period' });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      // Production by day - Fixed column name
      const productionData = await sequelize.query(`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as batches_processed,
          SUM(weight) as total_oil_produced
        FROM oil_batches 
        WHERE "createdAt" >= :startDate
        GROUP BY DATE("createdAt")
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
      console.error('Get production summary error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/dashboard/financial-summary
  getFinancialSummary: async (req, res) => {
    try {
      const { month, year } = req.query;
      const currentDate = new Date();
      const targetMonth = parseInt(month) || currentDate.getMonth() + 1;
      const targetYear = parseInt(year) || currentDate.getFullYear();

      if (targetMonth < 1 || targetMonth > 12) {
        return res.status(400).json({ error: 'Invalid month' });
      }

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
      console.error('Get financial summary error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/dashboard/activity
  getRecentActivity: async (req, res) => {
    try {
      const { limit = '20' } = req.query;
      const lim = Math.min(parseInt(String(limit)) || 20, 100);

      const [recentBatches, recentSessions, recentClients] = await Promise.all([
        Batch.findAll({ order: [["createdAt", "DESC"]], limit: lim }),
        PressingSession.findAll({ order: [["createdAt", "DESC"]], limit: lim }),
        Client.findAll({ order: [["createdAt", "DESC"]], limit: lim })
      ]);

      const events = [];

      for (const b of recentBatches) {
        events.push({
          id: `batch-${b.id}`,
          type: 'ticket',
          action: 'create',
          description: `Created batch (ticket) #${b.id}`,
          user: 'system',
          timestamp: b.createdAt,
          details: { batchId: b.id, number_of_boxes: b.number_of_boxes }
        });
      }
      for (const s of recentSessions) {
        events.push({
          id: `session-${s.id}`,
          type: 'room',
          action: s.finish ? 'stop_batch' : 'start_batch',
          description: s.finish ? `Ended session #${s.id}` : `Started session #${s.id}`,
          user: 'system',
          timestamp: s.createdAt,
          details: { pressing_roomID: s.pressing_roomID, number_of_boxes: s.number_of_boxes }
        });
      }
      for (const c of recentClients) {
        events.push({
          id: `client-${c.id}`,
          type: 'client',
          action: 'create',
          description: `Registered client: ${c.firstname} ${c.lastname}`,
          user: 'system',
          timestamp: c.createdAt,
          details: { clientId: c.id }
        });
      }

      events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.json(events.slice(0, lim));
    } catch (error) {
      console.error('Get activity error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default dashboardController;
