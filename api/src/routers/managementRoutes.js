const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  getDashboardStats,
  getAllResidents,
  getAllApartments,
  getAllTransactions,
  addTransaction,
  getFinancialSummary,
  getVisitorAnalytics,
  updateApartment
} = require('../controllers/managementController');

// Validation rules
const addTransactionValidation = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').notEmpty().withMessage('Category is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('description').optional().isString(),
  body('transaction_date').isDate().withMessage('Valid transaction date is required')
];

const updateApartmentValidation = [
  body('owner_name').optional().isString(),
  body('owner_phone').optional().isMobilePhone(),
  body('is_occupied').optional().isBoolean()
];

// Routes - all require management role
// Routes - Role based authorization
router.use(auth);

// Resource access mapping
router.get('/dashboard', authorize('management'), getDashboardStats);
router.get('/residents', authorize('management', 'guard'), getAllResidents);
router.get('/apartments', authorize('management', 'guard'), getAllApartments);
router.put('/apartments/:id', authorize('management'), updateApartmentValidation, validate, updateApartment);
router.get('/transactions', authorize('management'), getAllTransactions);
router.post('/transactions', authorize('management'), addTransactionValidation, validate, addTransaction);
router.get('/financials', authorize('management'), getFinancialSummary);
router.get('/visitor-analytics', authorize('management'), getVisitorAnalytics);

module.exports = router;