import { body, validationResult } from 'express-validator';

// Generic validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Client validation rules
const validateClient = [
  body('firstname').trim().notEmpty().withMessage('First name is required'),
  body('lastname').trim().notEmpty().withMessage('Last name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('address').optional().trim(),
  handleValidationErrors
];

// Batch validation rules
const validateBatch = [
  body('clientId').isInt().withMessage('Client ID must be a valid integer'),
  body('net_weight').isInt({ min: 1 }).withMessage('Net weight must be a positive integer'),
  body('number_of_boxes').isInt({ min: 1 }).withMessage('Number of boxes must be a positive integer'),
  body('weight_in').optional().isInt({ min: 0 }),
  body('weight_out').optional().isInt({ min: 0 }),
  handleValidationErrors
];

// Quality test validation rules
const validateQualityTest = [
  body('oil_batchId').isInt().withMessage('Oil batch ID must be a valid integer'),
  body('grade').isIn(['extra_virgin', 'virgin', 'ordinary']).withMessage('Invalid grade'),
  body('acidity_level').optional().isDecimal().withMessage('Acidity level must be a decimal'),
  body('tested_by_employeeId').optional().isInt(),
  handleValidationErrors
];

export default {
  validateClient,
  validateBatch,
  validateQualityTest,
  handleValidationErrors
};
