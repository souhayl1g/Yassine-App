import express from 'express';
import { verifyToken } from '../middleware/auth.js';
const router = express.Router();
import db from "../models/index.js"
const { Price } = db;

// Apply authentication middleware to all routes
router.use(verifyToken);

// GET /api/prices - Get current/latest prices
router.get('/', async (req, res) => {
  try {
    const { latest } = req.query;
    
    let options = {
      order: [['createdAt', 'DESC']]
    };
    
    if (latest === 'true') {
      options.limit = 1;
    }

    const prices = await Price.findAll(options);
    
    res.json(latest === 'true' ? (prices[0] || null) : prices);
  } catch (error) {
    console.error('Get prices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/prices - Create new price entry with fallback logic
router.post('/', async (req, res) => {
  try {
    const { 
      date,
      milling_price_per_kg,
      oil_client_selling_price_per_kg,
      oil_export_selling_price_per_kg,
      olive_buying_price_per_kg
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
      oil_client_selling_price_per_kg: oil_client_selling_price_per_kg !== undefined ? 
        oil_client_selling_price_per_kg : (latestPrice?.oil_client_selling_price_per_kg || 0),
      oil_export_selling_price_per_kg: oil_export_selling_price_per_kg !== undefined ? 
        oil_export_selling_price_per_kg : (latestPrice?.oil_export_selling_price_per_kg || 0),
      olive_buying_price_per_kg: olive_buying_price_per_kg !== undefined ? 
        olive_buying_price_per_kg : (latestPrice?.olive_buying_price_per_kg || 0)
    };
    
    const price = await Price.create(newPriceData);

    res.status(201).json(price);
  } catch (error) {
    console.error('Create price error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Price for this date already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// GET /api/prices/all - Get all price records with pagination
router.get('/all', async (req, res) => {
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
});

// PUT /api/prices/:id - Update existing price record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      milling_price_per_kg,
      oil_client_selling_price_per_kg,
      oil_export_selling_price_per_kg,
      olive_buying_price_per_kg
    } = req.body;

    const price = await Price.findByPk(id);
    if (!price) {
      return res.status(404).json({ error: 'Price record not found' });
    }

    // Update only provided fields
    const updateData = {};
    if (date !== undefined) updateData.date = date;
    if (milling_price_per_kg !== undefined) updateData.milling_price_per_kg = milling_price_per_kg;
    if (oil_client_selling_price_per_kg !== undefined) updateData.oil_client_selling_price_per_kg = oil_client_selling_price_per_kg;
    if (oil_export_selling_price_per_kg !== undefined) updateData.oil_export_selling_price_per_kg = oil_export_selling_price_per_kg;
    if (olive_buying_price_per_kg !== undefined) updateData.olive_buying_price_per_kg = olive_buying_price_per_kg;

    await price.update(updateData);

    res.json(price);
  } catch (error) {
    console.error('Update price error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Price for this date already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// GET /api/prices/:date - Get price for specific date
router.get('/:date', async (req, res) => {
  try {
    const price = await Price.findOne({
      where: { date: req.params.date }
    });

    if (!price) {
      return res.status(404).json({ error: 'Price not found for this date' });
    }

    res.json(price);
  } catch (error) {
    console.error('Get price by date error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/prices/:id - Delete price record
router.delete('/:id', async (req, res) => {
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
});

export default router;
