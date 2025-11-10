import express from 'express';
import { createOilSale, listOilSales } from '../controllers/oilSaleController.js';

const router = express.Router();

// Create a new oil sale
router.post('/', createOilSale);

// List oil sales
router.get('/', listOilSales);

export default router;
