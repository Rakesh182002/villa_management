const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validation');
const {
  createComplaint,
  getComplaints,
  getComplaint,
  updateComplaintStatus,
  rateComplaint,
  getComplaintStats
} = require('../controllers/complaintController');

// Validation rules
const createComplaintValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').isIn(['infrastructure', 'electrical', 'plumbing', 'parking', 'noise', 'security', 'other']).withMessage('Invalid category'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority')
];

const updateStatusValidation = [
  body('status').isIn(['open', 'in-progress', 'resolved', 'closed']).withMessage('Invalid status')
];

const rateComplaintValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
];

// Routes
router.post('/', auth, authorize('resident'), upload.array('images', 5), createComplaintValidation, validate, createComplaint);
router.get('/', auth, getComplaints);
router.get('/stats', auth, authorize('management'), getComplaintStats);
router.get('/:id', auth, getComplaint);
router.put('/:id/status', auth, authorize('management', 'guard'), updateStatusValidation, validate, updateComplaintStatus);
router.put('/:id/rate', auth, authorize('resident'), rateComplaintValidation, validate, rateComplaint);

module.exports = router;