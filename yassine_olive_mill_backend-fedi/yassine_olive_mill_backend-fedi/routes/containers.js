import express from 'express';
const router = express.Router();

import containerController from "../controllers/containerController.js";

// GET /api/containers - list containers with latest content
router.get('/', containerController.getAllContainers);

// POST /api/containers - create new container
router.post('/', containerController.createContainer);

// POST /api/containers/:id/transactions - add or sell oil
router.post('/:id/transactions', containerController.addTransaction);

// Container Contents Routes
// GET /api/containers/:id/contents - Get all content records for a container
router.get('/:id/contents', containerController.getContainerContents);

// POST /api/containers/:id/contents - Create new content record
router.post('/:id/contents', containerController.createContainerContent);

// GET /api/containers/:containerId/contents/:id - Get specific content record
router.get('/:containerId/contents/:id', containerController.getContainerContentById);

// PUT /api/containers/:containerId/contents/:id - Update content record
router.put('/:containerId/contents/:id', containerController.updateContainerContent);

// DELETE /api/containers/:containerId/contents/:id - Delete content record
router.delete('/:containerId/contents/:id', containerController.deleteContainerContent);

export default router;


