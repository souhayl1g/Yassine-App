import express from 'express';
const router = express.Router();
import db from "../models/index.js"
const { Price } = db;

// GET /api/prices - Get all prices
router.get('/', async (req, res) => {
  try {
    const { latest } = req.query;
    
    let options = {
      order: [['date', 'DESC']]
    };
    
    if (latest === 'true') {
      options.limit = 1;
    }

    const prices = await Price.findAll(options);
    
    res.json(latest === 'true' ? prices[0] : prices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/prices - Create new price entry
router.post('/', async (req, res) => {
  try {
    const { 
      date,
      milling_price_per_kg,
      oil_client_selling_price_per_kg,
      oil_export_selling_price_per_kg,
      olive_buying_price_per_kg
    } = req.body;
    
    const price = await Price.create({
      date,
      milling_price_per_kg,
      oil_client_selling_price_per_kg,
      oil_export_selling_price_per_kg,
      olive_buying_price_per_kg
    });

    res.status(201).json(price);
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

export default router;
