import express from 'express';
const router = express.Router();
import processingDecisionController from "../controllers/processingDecisionController.js"

// GET /api/processing-decisions - Get all processing decisions
router.get('/', processingDecisionController.getAllProcessingDecisions);

// GET /api/processing-decisions/:id - Get processing decision by ID
router.get('/:id', processingDecisionController.getProcessingDecisionById);

// POST /api/processing-decisions - Create new processing decision
router.post('/', processingDecisionController.createProcessingDecision);

export default router;
