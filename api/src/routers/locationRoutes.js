const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  updateLocation,
  getGuardLocations,
  getLocationHistory,
  triggerSOS,
  acknowledgeSOS,
  resolveSOS,
  getSOSAlerts
} = require('../controllers/locationController');

// Validation rules
const updateLocationValidation = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required')
];

const sosValidation = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required')
];

// Routes
router.post('/update', auth, authorize('guard'), updateLocationValidation, validate, updateLocation);
router.get('/guards', auth, authorize('guard', 'management'), getGuardLocations);
router.get('/history', auth, authorize('management'), getLocationHistory);

// SOS routes
router.post('/sos', auth, sosValidation, validate, triggerSOS);
router.get('/sos', auth, authorize('guard', 'management'), getSOSAlerts);
router.put('/sos/:id/acknowledge', auth, authorize('guard'), acknowledgeSOS);
router.put('/sos/:id/resolve', auth, authorize('guard'), resolveSOS);

module.exports = router;