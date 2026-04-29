const amenityDao = require('../dao/amenityDao');
const { getIO } = require('../config/socket');

function generateAmenityBookingId() {
  const now = new Date();

  // Format: YYYYMMDD
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');

  
  // 6-digit random number (better than 4-digit)
 const randomPart = Date.now().toString().slice(-6);
  return `AM-${datePart}-${randomPart}`;
}

const amenityService = {
  async getAmenities() {
    return await amenityDao.findAll();
  },

  async bookAmenity(amenityId, residentId, data) {
    const { booking_date, start_time, end_time, duration_hours } = data;

    // Get amenity details
    const amenity = await amenityDao.findById(amenityId);
    if (!amenity) {
      const error = new Error('Amenity not found or not active');
      error.status = 404;
      throw error;
    }

    // [VALIDATION] Check if booking is in the past
    const now = new Date();
    const bookingStart = new Date(`${booking_date.split('T')[0]}T${start_time}`);
    if (bookingStart < now) {
      const error = new Error('Cannot book a slot in the past');
      error.status = 400;
      throw error;
    }

    // Check for existing bookings to see if we reached capacity
    const overlaps = await amenityDao.findBookingConflicts({
      amenity_id: amenityId,
      booking_date,
      start_time,
      end_time
    });

    // [CAPACITY CHECK] Strictly block if capacity is reached
    if (overlaps.length >= (amenity.capacity || 1)) {
      const error = new Error('This slot is full. Please choose another time.');
      error.status = 400;
      throw error;
    }

    let status = 'confirmed';

    // Calculate total amount
    const total_amount = amenity.price_per_hour * (duration_hours || 1);

    
    // Generate booking number
    const booking_number = generateAmenityBookingId();

    // Create booking
    const result = await amenityDao.createBooking({
      booking_number,
      amenity_id: amenityId,
      resident_id: residentId,
      booking_date,
      start_time,
      end_time,
      total_amount,
      status
    });

    const booking = await amenityDao.findBookingWithDetails(result.insertId);

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.emit('amenity:booked', {
        amenityId,
        date: booking_date,
        booking
      });
      // If waiting, maybe notify admins separately (optional)
    } catch (e) { /* socket not initialized */ }

    return booking;
  },

  async getMyBookings(residentId, status) {
    return await amenityDao.findMyBookings(residentId, status);
  },

  async getAllBookings(filters) {
    return await amenityDao.findAllBookings(filters);
  },

  async updateBookingStatus(id, status, remark) {
    const booking = await amenityDao.findBookingById(id);
    if (!booking) {
      const error = new Error('Booking not found');
      error.status = 404;
      throw error;
    }

    await amenityDao.updateBookingStatus(id, status, remark);
    const updated = await amenityDao.findBookingById(id);

    // Emit socket event
    try {
      const io = getIO();
      io.emit('amenity:status_updated', {
        bookingId: id,
        status: updated.status,
        admin_remark: remark,
        resident_id: updated.resident_id,
        amenityId: updated.amenity_id,
        date: updated.booking_date
      });
    } catch (e) { }

    return updated;
  },

  async cancelBooking(id, residentId, remark) {
    const booking = await amenityDao.findBookingByIdAndResident(id, residentId);
    if (!booking) {
      const error = new Error('Booking not found');
      error.status = 404;
      throw error;
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      const error = new Error('Cannot cancel this booking');
      error.status = 400;
      throw error;
    }

    // [TIME CHECK] Prevent cancellation of present/past bookings
    const now = new Date();
    const d = booking.booking_date;
    const bookingDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const startTime = new Date(`${bookingDate}T${booking.start_time}`);

    if (startTime <= now) {
      const error = new Error('Present or past bookings cannot be cancelled');
      error.status = 400;
      throw error;
    }

    await amenityDao.cancelBooking(id, remark);
    const updated = await amenityDao.findBookingById(id);

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.emit('amenity:cancelled', {
        amenityId: updated.amenity_id,
        date: updated.booking_date,
        bookingId: id,
        remark: remark
      });
    } catch (e) { /* socket not initialized */ }

    return updated;
  },

  async getAvailability(amenityId, date) {
    if (!date) {
      const error = new Error('Date is required');
      error.status = 400;
      throw error;
    }

    const bookings = await amenityDao.getAvailability(amenityId, date);
    return { date, booked_slots: bookings };
  },

  async getAnalytics() {
    return await amenityDao.getAnalytics();
  },

  async submitFeedback(id, residentId, rating, feedback) {
    const booking = await amenityDao.findBookingByIdAndResident(id, residentId);
    if (!booking) {
      const error = new Error('Booking not found');
      error.status = 404;
      throw error;
    }
    return await amenityDao.submitFeedback(id, rating, feedback);
  },

  async managementGetAmenities() {
    return await amenityDao.findAllWithInactive();
  },

  async createAmenity(data) {
    return await amenityDao.create(data);
  },

  async updateAmenity(id, data) {
    return await amenityDao.update(id, data);
  },

  async toggleAmenityStatus(id, isActive) {
    return await amenityDao.toggleStatus(id, isActive);
  }
};

module.exports = amenityService;
