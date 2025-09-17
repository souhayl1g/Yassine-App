import db from "../models/index.js"
import { Op } from 'sequelize';

const { Client, Batch, Invoice, ProcessingDecision } = db;

const clientController = {
  // GET /api/clients
  getAllClients: async (req, res) => {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const whereClause = search ? {
        [Op.or]: [
          { firstname: { [Op.like]: `%${search}%` } },
          { lastname: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ]
      } : {};

      const clients = await Client.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          { model: Batch, as: 'batches', attributes: ['id', 'date_received', 'status'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        clients: clients.rows,
        pagination: {
          total: clients.count,
          page: parseInt(page),
          pages: Math.ceil(clients.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get all clients error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/clients/:id
  getClientById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }

      const client = await Client.findByPk(id, {
        include: [
          { 
            model: Batch, 
            as: 'batches',
            include: [{ model: ProcessingDecision, as: 'processingDecisions' }]
          },
          { model: Invoice, as: 'invoices' }
        ]
      });

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      res.json(client);
    } catch (error) {
      console.error('Get client by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/clients
  createClient: async (req, res) => {
    try {
      const { firstname, lastname, phone, address } = req.body;
      
      if (!firstname || !lastname || !phone) {
        return res.status(400).json({ error: 'firstname, lastname, and phone are required' });
      }

      const client = await Client.create({
        firstname,
        lastname, 
        phone,
        address
      });

      res.status(201).json(client);
    } catch (error) {
      console.error('Create client error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/clients/:id
  updateClient: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }

      const client = await Client.findByPk(id);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await client.update(req.body);
      res.json(client);
    } catch (error) {
      console.error('Update client error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/clients/:id
  deleteClient: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }

      const client = await Client.findByPk(id);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await client.destroy();
      res.status(204).send();
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(400).json({ error: error.message });
    }
  }
};

export default clientController;
