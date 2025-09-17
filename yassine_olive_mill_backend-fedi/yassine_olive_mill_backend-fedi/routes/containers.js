import express from 'express';
const router = express.Router();

import containerController from "../controllers/containerController.js";

// GET /api/containers - list containers with latest content
router.get('/', containerController.getAllContainers);

// POST /api/containers - create new container
router.post('/', containerController.createContainer);

// POST /api/containers/:id/transactions - add or sell oil
router.post('/:id/transactions', containerController.addTransaction);

export default router;


