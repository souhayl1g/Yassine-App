import express from 'express';
const router = express.Router();
import clientController from "../controllers/clientController.js"

// GET /api/clients - Get all clients with pagination and search
router.get('/', clientController.getAllClients);

// GET /api/clients/:id - Get client by ID with related data
router.get('/:id', clientController.getClientById);

// POST /api/clients - Create new client
router.post('/', clientController.createClient);

// PUT /api/clients/:id - Update client
router.put('/:id', clientController.updateClient);

// DELETE /api/clients/:id - Delete client
router.delete('/:id', clientController.deleteClient);

export default router;
