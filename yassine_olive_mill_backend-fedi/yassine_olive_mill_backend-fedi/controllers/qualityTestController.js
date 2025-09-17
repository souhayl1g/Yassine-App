import db from "../models/index.js"
import { Op } from 'sequelize';

const { QualityTest, OilBatch, Employee, Batch, Client } = db;

const qualityTestController = {
  // GET /api/quality-tests
  getAllQualityTests: async (req, res) => {
    try {
      const { oil_batchId, grade, tested_by_employeeId } = req.query;
      
      const whereClause = {};
      if (oil_batchId) whereClause.oil_batchId = parseInt(oil_batchId);
      if (grade) whereClause.grade = grade;
      if (tested_by_employeeId) whereClause.tested_by_employeeId = parseInt(tested_by_employeeId);

      const tests = await QualityTest.findAll({
        where: whereClause,
        include: [
          { model: OilBatch, as: 'oilBatch' },
          { model: Employee, as: 'testedBy' }
        ],
        order: [['test_date', 'DESC']]
      });

      res.json(tests);
    } catch (error) {
      console.error('Get all quality tests error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/quality-tests
  createQualityTest: async (req, res) => {
    try {
      const { oil_batchId, acidity_level, grade, tested_by_employeeId } = req.body;
      
      if (!oil_batchId || !grade) {
        return res.status(400).json({ error: 'oil_batchId and grade are required' });
      }

      if (!['extra_virgin', 'virgin', 'ordinary'].includes(grade)) {
        return res.status(400).json({ error: 'Invalid grade. Must be extra_virgin, virgin, or ordinary' });
      }

      // Verify oil batch exists
      const oilBatch = await OilBatch.findByPk(parseInt(oil_batchId));
      if (!oilBatch) {
        return res.status(404).json({ error: 'Oil batch not found' });
      }

      const test = await QualityTest.create({
        oil_batchId: parseInt(oil_batchId),
        acidity_level: acidity_level ? parseFloat(acidity_level) : null,
        grade,
        tested_by_employeeId: tested_by_employeeId ? parseInt(tested_by_employeeId) : null,
        test_date: new Date()
      });

      const fullTest = await QualityTest.findByPk(test.id, {
        include: [
          { model: OilBatch, as: 'oilBatch' },
          { model: Employee, as: 'testedBy' }
        ]
      });

      res.status(201).json(fullTest);
    } catch (error) {
      console.error('Create quality test error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // GET /api/quality-tests/:id
  getQualityTestById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid quality test ID' });
      }

      const test = await QualityTest.findByPk(id, {
        include: [
          { 
            model: OilBatch, 
            as: 'oilBatch',
            include: [{ model: Batch, as: 'batch', include: [{ model: Client, as: 'client' }] }]
          },
          { model: Employee, as: 'testedBy' }
        ]
      });

      if (!test) {
        return res.status(404).json({ error: 'Quality test not found' });
      }

      res.json(test);
    } catch (error) {
      console.error('Get quality test by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/quality-tests/statistics
  getQualityStatistics: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const whereClause = {};
      if (startDate && endDate) {
        whereClause.test_date = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const tests = await QualityTest.findAll({
        where: whereClause,
        include: [{ model: OilBatch, as: 'oilBatch' }]
      });

      // Calculate statistics
      const validAcidityTests = tests.filter(t => t.acidity_level !== null);
      const stats = {
        totalTests: tests.length,
        gradeDistribution: {
          extra_virgin: tests.filter(t => t.grade === 'extra_virgin').length,
          virgin: tests.filter(t => t.grade === 'virgin').length,
          ordinary: tests.filter(t => t.grade === 'ordinary').length
        },
        averageAcidity: validAcidityTests.length > 0 
          ? validAcidityTests.reduce((sum, t) => sum + parseFloat(t.acidity_level), 0) / validAcidityTests.length 
          : 0,
        totalOilTested: tests.reduce((sum, t) => sum + (t.oilBatch?.weight || 0), 0)
      };

      res.json(stats);
    } catch (error) {
      console.error('Get quality statistics error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default qualityTestController;
