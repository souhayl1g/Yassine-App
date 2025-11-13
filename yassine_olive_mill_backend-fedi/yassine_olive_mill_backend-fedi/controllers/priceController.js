import { Price } from '../models/index.js';
import { Op } from 'sequelize';

const priceController = {
  // GET /api/prices - Get current/latest prices
  getCurrentPrices: async (req, res) => {
    try {
      const latestPrice = await Price.findOne({
        order: [['createdAt', 'DESC']]
      });

      if (!latestPrice) {
        return res.status(404).json({ error: 'No prices found' });
      }

      res.json(latestPrice);
    } catch (error) {
      console.error('Get current prices error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/prices/all - Get all price records
  getAllPrices: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await Price.findAndCountAll({
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        prices: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        totalCount: count
      });
    } catch (error) {
      console.error('Get all prices error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/prices - Create new price record
  createPrice: async (req, res) => {
    try {
      const {
        date,
        milling_price_per_kg,
        oil_export_selling_price_per_kg,
        olive_buying_price_per_kg,
        empty_bidon_price
      } = req.body;

      // Get the most recent price record to fill missing fields
      const latestPrice = await Price.findOne({
        order: [['createdAt', 'DESC']]
      });

      // Create new price record with provided fields or fallback to latest values
      const newPriceData = {
        date: date || new Date().toISOString().split('T')[0], // Today's date if not provided
        milling_price_per_kg: milling_price_per_kg !== undefined ? 
          milling_price_per_kg : (latestPrice?.milling_price_per_kg || 0),
        oil_export_selling_price_per_kg: oil_export_selling_price_per_kg !== undefined ? 
          oil_export_selling_price_per_kg : (latestPrice?.oil_export_selling_price_per_kg || 0),
        olive_buying_price_per_kg: olive_buying_price_per_kg !== undefined ? 
          olive_buying_price_per_kg : (latestPrice?.olive_buying_price_per_kg || 0),
        empty_bidon_price: empty_bidon_price !== undefined ? 
          empty_bidon_price : (latestPrice?.empty_bidon_price || 0)
      };

      const newPrice = await Price.create(newPriceData);

      res.status(201).json(newPrice);
    } catch (error) {
      console.error('Create price error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/prices/:id - Update existing price record
  updatePrice: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        date,
        milling_price_per_kg,
        oil_export_selling_price_per_kg,
        olive_buying_price_per_kg,
        empty_bidon_price
      } = req.body;

      const price = await Price.findByPk(id);
      if (!price) {
        return res.status(404).json({ error: 'Price record not found' });
      }

      // Update only provided fields
      const updateData = {};
      if (date !== undefined) updateData.date = date;
      if (milling_price_per_kg !== undefined) updateData.milling_price_per_kg = milling_price_per_kg;
      if (oil_export_selling_price_per_kg !== undefined) updateData.oil_export_selling_price_per_kg = oil_export_selling_price_per_kg;
      if (olive_buying_price_per_kg !== undefined) updateData.olive_buying_price_per_kg = olive_buying_price_per_kg;
      if (empty_bidon_price !== undefined) updateData.empty_bidon_price = empty_bidon_price;

      await price.update(updateData);

      res.json(price);
    } catch (error) {
      console.error('Update price error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/prices/:id - Delete price record
  deletePrice: async (req, res) => {
    try {
      const { id } = req.params;

      const price = await Price.findByPk(id);
      if (!price) {
        return res.status(404).json({ error: 'Price record not found' });
      }

      await price.destroy();

      res.json({ message: 'Price record deleted successfully' });
    } catch (error) {
      console.error('Delete price error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default priceController;
