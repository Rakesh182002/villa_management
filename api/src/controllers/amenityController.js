const amenityService = require('../services/amenityService');
const logger = require('../utils/Logger');

// @desc    Get all active amenities (for residents)
const getAmenities = async (req, res) => {
  try {
    const amenities = await amenityService.getAmenities();
    res.json({ success: true, count: amenities.length, data: amenities });
  } catch (error) {
    logger.error('Get amenities error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Get all amenities including inactive (for management)
const managementGetAmenities = async (req, res) => {
  try {
    const amenities = await amenityService.managementGetAmenities();
    res.json({ success: true, count: amenities.length, data: amenities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new amenity
const createAmenity = async (req, res) => {
  try {
    const result = await amenityService.createAmenity(req.body);
    res.status(201).json({ success: true, message: 'Amenity created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update amenity
const updateAmenity = async (req, res) => {
  try {
    await amenityService.updateAmenity(req.params.id, req.body);
    res.json({ success: true, message: 'Amenity updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle amenity status
const toggleStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    await amenityService.toggleAmenityStatus(req.params.id, is_active);
    res.json({ success: true, message: `Amenity ${is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bookAmenity = async (req, res) => {
  try {
    const booking = await amenityService.bookAmenity(req.params.id, req.userId, req.body);
    res.status(201).json({ success: true, message: 'Amenity booked successfully', data: booking });
  } catch (error) {
    logger.error('Book amenity error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await amenityService.getMyBookings(req.userId, req.query.status);
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await amenityService.getAllBookings(req.query);
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const updated = await amenityService.cancelBooking(req.params.id, req.userId, req.body.remark);
    res.json({ success: true, message: 'Booking cancelled successfully', data: updated });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getAvailability = async (req, res) => {
  try {
    const availability = await amenityService.getAvailability(req.params.id, req.query.date);
    res.json({ success: true, data: availability });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status, admin_remark } = req.body;
    const updated = await amenityService.updateBookingStatus(req.params.id, status, admin_remark);
    res.json({ success: true, message: `Booking ${status} successfully`, data: updated });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const analytics = await amenityService.getAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const submitFeedback = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    await amenityService.submitFeedback(req.params.id, req.userId, rating, feedback);
    res.json({ success: true, message: 'Feedback submitted' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};