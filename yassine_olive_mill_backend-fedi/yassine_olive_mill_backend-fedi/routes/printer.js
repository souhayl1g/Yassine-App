import express from 'express';
import { testPrinter, printReceipt, printRawText } from '../controllers/printerController.js';

const router = express.Router();

/**
 * @route   POST /api/printer/test
 * @desc    Test printer connection
 * @access  Public (add auth if needed)
 * @body    { printerIP: string, port?: number }
 */
router.post('/test', testPrinter);

/**
 * @route   POST /api/printer/receipt
 * @desc    Print a formatted receipt
 * @access  Public (add auth if needed)
 * @body    { 
 *            printerIP: string, 
 *            port?: number, 
 *            receiptType: 'arrival' | 'exit' | 'general' | 'raw',
 *            receiptData: object 
 *          }
 */
router.post('/receipt', printReceipt);

/**
 * @route   POST /api/printer/raw
 * @desc    Print raw text
 * @access  Public (add auth if needed)
 * @body    { printerIP: string, port?: number, text: string }
 */
router.post('/raw', printRawText);

export default router;
