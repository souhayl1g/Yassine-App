import db from "../models/index.js"
import { Op } from 'sequelize';


const { Client, Batch, Invoice } = db;
const clientController = {
  // GET /api/clients
  getAllClients: async (req, res) => {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = search ? {
        [Op.or]: [
          { firstname: { [Op.iLike]: `%${search}%` } },
          { lastname: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } }
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
          pages: Math.ceil(clients.count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/clients/:id
  getClientById: async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id, {
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
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/clients
  createClient: async (req, res) => {
    try {
      const { firstname, lastname, phone, address } = req.body;
      
      const client = await Client.create({
        firstname,
        lastname, 
        phone,
        address
      });

      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/clients/:id
  updateClient: async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await client.update(req.body);
      res.json(client);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/clients/:id
  deleteClient: async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await client.destroy();
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

export default clientController;
