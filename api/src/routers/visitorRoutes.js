const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  createVisitorRequest,
  getVisitorRequests,
  getPendingVisitors,
  verifyVisitor,
  updateVisitorStatus,
  markVisitorEntry,
  markVisitorExit,
  getVisitorsInside,
  checkOverstay,
  initiateGuardVisitorRequest
} = require('../controllers/visitorController');

// Validation rules
const createVisitorValidation = [
  body('visitor_name').notEmpty().withMessage('Visitor name is required'),
  body('visitor_phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('purpose').notEmpty().withMessage('Purpose is required')
];

const verifyVisitorValidation = [
  body('unique_code').notEmpty().withMessage('Unique code is required')
];

const updateStatusValidation = [
  body('status').isIn(['approved', 'denied']).withMessage('Invalid status')
];

// Routes
router.post('/', auth, authorize('resident'), createVisitorValidation, validate, createVisitorRequest);
router.get('/', auth, authorize('resident'), getVisitorRequests);
router.get('/pending', auth, authorize('guard', 'management'), getPendingVisitors);
router.post('/verify', auth, authorize('guard'), verifyVisitorValidation, validate, verifyVisitor);
router.put('/:id/status', auth, authorize('resident'), updateStatusValidation, validate, updateVisitorStatus);
router.put('/:id/entry', auth, authorize('guard'), markVisitorEntry);
router.put('/:id/exit', auth, authorize('guard'), markVisitorExit);
router.get('/inside', auth, authorize('guard', 'management'), getVisitorsInside);
router.get('/overstay', auth, authorize('guard', 'management'), checkOverstay);
router.post('/guard-initiate', auth, authorize('guard'), createVisitorValidation, validate, initiateGuardVisitorRequest);

module.exports = router;