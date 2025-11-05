import express from 'express';
const router = express.Router();
import employeeController from '../controllers/employeeController.js';
import { verifyToken } from '../middleware/auth.js';

// Apply authentication middleware to all employee routes
router.use(verifyToken);

// GET routes
router.get('/batch/:id/details', employeeController.getBatchForEmployee);
router.get('/containers', employeeController.getContainers);
router.get('/pressing-queue', employeeController.getPressingQueue);
router.get('/rooms/display-data', employeeController.getRoomsDisplayData);

// POST routes
router.post('/pressing-session', employeeController.createPressingSession);
router.post('/oil-batch/with-container', employeeController.createOilBatchWithContainer);

// PUT routes
router.put('/pressing-session/:id/complete', employeeController.completePressingSession);
router.put('/batch/:id', employeeController.updateBatch);

// DELETE routes
router.delete('/queue/:id', employeeController.removeFromQueue);

export default router;
