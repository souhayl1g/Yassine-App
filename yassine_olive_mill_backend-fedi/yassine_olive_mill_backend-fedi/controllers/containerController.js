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
        const contents = await ContainerContent.findAll({
          where: { containerId: containerIds },
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

      // find latest content
      const latest = await ContainerContent.findOne({
        where: { containerId: id },
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
  }
};

export default containerController;


