import express from 'express';
const router = express.Router();
import qualityTestController from "../controllers/qualityTestController.js"

// GET /api/quality-tests - Get all quality tests
router.get('/', qualityTestController.getAllQualityTests);

// GET /api/quality-tests/statistics - Get quality statistics
router.get('/statistics', qualityTestController.getQualityStatistics);

// GET /api/quality-tests/:id - Get quality test by ID
router.get('/:id', qualityTestController.getQualityTestById);

// POST /api/quality-tests - Create new quality test
router.post('/', qualityTestController.createQualityTest);

export default router;
