import express from 'express';
import {
  getOwnerFunds,
  getOwnerFundById,
  createOwnerFund,
  updateOwnerFund,
  deleteOwnerFund
} from '../controllers/ownerFundController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Owner fund routes
router.get('/', getOwnerFunds);
router.get('/:id', getOwnerFundById);
router.post('/', createOwnerFund);
router.put('/:id', updateOwnerFund);
router.delete('/:id', deleteOwnerFund);

export default router;

