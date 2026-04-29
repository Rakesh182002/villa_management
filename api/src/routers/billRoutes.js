const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  getBills,
  getAllBills,
  generateBills,
  payBill,
  getBillStats
} = require('../controllers/billController');

// Validation rules
const generateBillsValidation = [
  body('bill_type').isIn(['maintenance', 'water', 'electricity', 'amenity', 'penalty', 'other']).withMessage('Invalid bill type'),
  body('month_year').notEmpty().withMessage('Month and year is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('due_date').isDate().withMessage('Valid due date is required')
];

const payBillValidation = [
  body('payment_method').optional().isString()
];

// Routes
router.get('/', auth, authorize('resident'), getBills);
router.get('/all', auth, authorize('management'), getAllBills);
router.get('/stats', auth, authorize('management'), getBillStats);
router.post('/generate', auth, authorize('management'), generateBillsValidation, validate, generateBills);
router.post('/:id/pay', auth, authorize('resident'), payBillValidation, validate, payBill);

module.exports = router;