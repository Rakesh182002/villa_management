const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');
const { 
  getAmenities, 
  managementGetAmenities,
  createAmenity,
  updateAmenity,
  toggleStatus,
  bookAmenity, 
  getMyBookings, 
  getAllBookings, 
  cancelBooking, 
  getAvailability, 
  updateBookingStatus,
  getAnalytics,
  submitFeedback
} = require('../controllers/amenityController');

// Resident Routes
router.get('/', auth, getAmenities);
router.post('/:id/book', auth, authorize('resident'), bookAmenity);
router.get('/my-bookings', auth, authorize('resident'), getMyBookings);
router.post('/bookings/:id/feedback', auth, authorize('resident'), submitFeedback);
router.put('/bookings/:id/cancel', auth, authorize('resident'), cancelBooking);

// Management Routes
router.get('/management', auth, authorize('management'), managementGetAmenities);
router.post('/', auth, authorize('management'), createAmenity);
router.put('/:id', auth, authorize('management'), updateAmenity);
router.patch('/:id/toggle', auth, authorize('management'), toggleStatus);
router.get('/all-bookings', auth, authorize('management'), getAllBookings);
router.patch('/bookings/:id/status', auth, authorize('management'), updateBookingStatus);
router.get('/analytics', auth, authorize('management'), getAnalytics);

// General
router.get('/:id/availability', auth, getAvailability);

module.exports = router;