import db from "../models/index.js";

const { Container, ContainerContent } = db;

function toContainerDto(container, latestContent) {
  return {
    id: container.id,
    label: container.label,
    capacity: container.capacity,
    currentWeight: latestContent ? latestContent.total_weight : 0,
    buyPrice: 0,
    sellPrice: 0,
    lastUpdated: latestContent ? latestContent.recorded_at : container.updatedAt,
  };
}

const containerController = {
  // GET /api/containers
  getAllContainers: async (req, res) => {
    try {
      const containers = await Container.findAll({ order: [["createdAt", "ASC"]] });
      const containerIds = containers.map((c) => c.id);
      const latestByContainer = {};
      if (containerIds.length > 0) {
        // Exclude sold contents when calculating current weight
        const contents = await ContainerContent.findAll({
          where: { 
            containerId: containerIds,
            sold: false  // Only consider unsold contents
          },
          order: [["containerId", "ASC"], ["recorded_at", "DESC"]],
        });
        for (const c of contents) {
          if (!latestByContainer[c.containerId]) latestByContainer[c.containerId] = c;
        }
      }
      const data = containers.map((c) => toContainerDto(c, latestByContainer[c.id]));
      res.json(data);
    } catch (error) {
      console.error("Get all containers error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/containers
  createContainer: async (req, res) => {
    try {
      const { label, capacity } = req.body;
      if (!label || capacity === undefined || capacity === null) {
        return res.status(400).json({ error: 'label and capacity are required' });
      }
      const container = await Container.create({ label, capacity: parseInt(capacity) });
      res.status(201).json(toContainerDto(container, null));
    } catch (error) {
      console.error('Create container error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // POST /api/containers/:id/transactions
  addTransaction: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid container ID' });

      const { type, weight, pricePerKg } = req.body;
      if (!type || !['add', 'sell'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
      }
      if (weight === undefined || weight === null) {
        return res.status(400).json({ error: 'weight is required' });
      }

      const container = await Container.findByPk(id);
      if (!container) return res.status(404).json({ error: 'Container not found' });

      // find latest unsold content
      const latest = await ContainerContent.findOne({
        where: { 
          containerId: id,
          sold: false  // Only consider unsold contents
        },
        order: [["recorded_at", "DESC"]],
      });
      const currentWeight = latest ? latest.total_weight : 0;
      const delta = parseFloat(weight);
      let nextWeight = currentWeight;
      if (type === 'add') nextWeight = currentWeight + delta;
      else nextWeight = Math.max(0, currentWeight - delta);

      const value = pricePerKg !== undefined && pricePerKg !== null ? parseFloat(pricePerKg) * parseFloat(weight) : null;

      const entry = await ContainerContent.create({
        containerId: id,
        total_weight: Math.round(nextWeight),
        value,
        currency: value !== null ? 'SAR' : null,
        recorded_at: new Date(),
      });

      const updated = await Container.findByPk(id);
      res.status(201).json(toContainerDto(updated, entry));
    } catch (error) {
      console.error('Container transaction error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // GET /api/containers/:id/contents - Get all content records for a container
  getContainerContents: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid container ID' });

      const container = await Container.findByPk(id);
      if (!container) return res.status(404).json({ error: 'Container not found' });

      // By default, exclude sold contents. Allow includeSold query param to show all
      const includeSold = req.query.includeSold === 'true';
      const whereClause = { containerId: id };
      if (!includeSold) {
        whereClause.sold = false;
      }

      const contents = await ContainerContent.findAll({
        where: whereClause,
        order: [['recorded_at', 'DESC']]
      });

      res.json(contents);
    } catch (error) {
      console.error('Get container contents error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/containers/:id/contents - Create new content record
  createContainerContent: async (req, res) => {
    try {
      const containerId = parseInt(req.params.id);
      if (isNaN(containerId)) return res.status(400).json({ error: 'Invalid container ID' });

      const { total_weight, value, currency } = req.body;
      if (total_weight === undefined || total_weight === null) {
        return res.status(400).json({ error: 'total_weight is required' });
      }

      const container = await Container.findByPk(containerId);
      if (!container) return res.status(404).json({ error: 'Container not found' });

      const content = await ContainerContent.create({
        containerId,
        total_weight: parseInt(total_weight),
        value: value ? parseInt(value) : null,
        currency: currency || null,
        recorded_at: new Date()
      });

      res.status(201).json(content);
    } catch (error) {
      console.error('Create container content error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // GET /api/containers/:containerId/contents/:id - Get specific content record
  getContainerContentById: async (req, res) => {
    try {
      const containerId = parseInt(req.params.containerId);
      const contentId = parseInt(req.params.id);
      
      if (isNaN(containerId)) return res.status(400).json({ error: 'Invalid container ID' });
      if (isNaN(contentId)) return res.status(400).json({ error: 'Invalid content ID' });

      const content = await ContainerContent.findOne({
        where: { 
          id: contentId,
          containerId: containerId 
        },
        include: [
          { model: Container, as: 'container' }
        ]
      });

      if (!content) return res.status(404).json({ error: 'Container content not found' });

      res.json(content);
    } catch (error) {
      console.error('Get container content by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // PUT /api/containers/:containerId/contents/:id - Update content record
  updateContainerContent: async (req, res) => {
    try {
      const containerId = parseInt(req.params.containerId);
      const contentId = parseInt(req.params.id);
      
      if (isNaN(containerId)) return res.status(400).json({ error: 'Invalid container ID' });
      if (isNaN(contentId)) return res.status(400).json({ error: 'Invalid content ID' });

      const { total_weight, value, currency } = req.body;

      const content = await ContainerContent.findOne({
        where: { 
          id: contentId,
          containerId: containerId 
        }
      });

      if (!content) return res.status(404).json({ error: 'Container content not found' });

      const updateData = {};
      if (total_weight !== undefined) updateData.total_weight = parseInt(total_weight);
      if (value !== undefined) updateData.value = value ? parseInt(value) : null;
      if (currency !== undefined) updateData.currency = currency || null;

      await content.update(updateData);

      const updatedContent = await ContainerContent.findByPk(contentId, {
        include: [
          { model: Container, as: 'container' }
        ]
      });

      res.json(updatedContent);
    } catch (error) {
      console.error('Update container content error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/containers/:containerId/contents/:id - Delete content record
  deleteContainerContent: async (req, res) => {
    try {
      const containerId = parseInt(req.params.containerId);
      const contentId = parseInt(req.params.id);
      
      if (isNaN(containerId)) return res.status(400).json({ error: 'Invalid container ID' });
      if (isNaN(contentId)) return res.status(400).json({ error: 'Invalid content ID' });

      const content = await ContainerContent.findOne({
        where: { 
          id: contentId,
          containerId: containerId 
        }
      });

      if (!content) return res.status(404).json({ error: 'Container content not found' });

      await content.destroy();

      res.status(204).send();
    } catch (error) {
      console.error('Delete container content error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default containerController;


