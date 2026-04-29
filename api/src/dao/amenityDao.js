const db = require('../config/database');

const amenityDao = {
  async findAll() {
    const [rows] = await db.query(
      'SELECT * FROM amenities WHERE is_active = TRUE ORDER BY name'
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM amenities WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return rows[0] || null;
  },

  async findBookingConflicts(data) {
    const { amenity_id, booking_date, start_time, end_time } = data;
    const [rows] = await db.query(
      `SELECT * FROM amenity_bookings 
       WHERE amenity_id = ? 
       AND booking_date = ? 
       AND status IN ('confirmed', 'waiting')
       AND (
         (start_time < ? AND end_time > ?)
       )`,
      [amenity_id, booking_date, end_time, start_time]
    );
    return rows;
  },

  async createBooking(data) {
    const { booking_number, amenity_id, resident_id, booking_date, start_time, end_time, total_amount, status } = data;
    const [result] = await db.query(
      `INSERT INTO amenity_bookings 
       (booking_number, amenity_id, resident_id, booking_date, start_time, end_time, total_amount, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking_number, amenity_id, resident_id, booking_date, start_time, end_time, total_amount, status || 'confirmed']
    );
    return result;
  },

  async updateBookingStatus(id, status, remark) {
    await db.query(
      'UPDATE amenity_bookings SET status = ?, admin_remark = ? WHERE id = ?',
      [status, remark || null, id]
    );
  },

  async findBookingWithDetails(bookingId) {
    const [rows] = await db.query(
      `SELECT ab.*, a.name as amenity_name, u.full_name as resident_name, u.apartment_number
       FROM amenity_bookings ab
       JOIN amenities a ON ab.amenity_id = a.id
       JOIN users u ON ab.resident_id = u.id
       WHERE ab.id = ?`,
      [bookingId]
    );
    return rows[0] || null;
  },

  async findMyBookings(residentId, status) {
    let query = `
      SELECT ab.*, a.name as amenity_name
      FROM amenity_bookings ab
      JOIN amenities a ON ab.amenity_id = a.id
      WHERE ab.resident_id = ?
    `;
    const params = [residentId];

    if (status) {
      query += ' AND ab.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ab.booking_date DESC, ab.start_time DESC';
    const [rows] = await db.query(query, params);
    return rows;
  },

  async findAllBookings(filters) {
    const { amenity_id, status, date } = filters;
    let query = `
      SELECT ab.*, 
             a.name as amenity_name,
             u.full_name as resident_name,
             u.apartment_number
      FROM amenity_bookings ab
      JOIN amenities a ON ab.amenity_id = a.id
      JOIN users u ON ab.resident_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (amenity_id) {
      query += ' AND ab.amenity_id = ?';
      params.push(amenity_id);
    }

    if (status) {
      query += ' AND ab.status = ?';
      params.push(status);
    }

    if (date) {
      query += ' AND ab.booking_date = ?';
      params.push(date);
    }

    query += ' ORDER BY ab.booking_date DESC, ab.start_time DESC';
    const [rows] = await db.query(query, params);
    return rows;
  },

  async findBookingByIdAndResident(id, residentId) {
    const [rows] = await db.query(
      'SELECT * FROM amenity_bookings WHERE id = ? AND resident_id = ?',
      [id, residentId]
    );
    return rows[0] || null;
  },

  async cancelBooking(id, remark) {
    await db.query(
      'UPDATE amenity_bookings SET status = ?, cancel_remark = ? WHERE id = ?',
      ['cancelled', remark || null, id]
    );
  },

  async findBookingById(id) {
    const [rows] = await db.query(
      'SELECT * FROM amenity_bookings WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async getAvailability(amenityId, date) {
    const [rows] = await db.query(
      `SELECT start_time, end_time 
       FROM amenity_bookings 
       WHERE amenity_id = ? 
       AND booking_date = ? 
       AND status IN ('confirmed', 'waiting')
       ORDER BY start_time`,
      [amenityId, date]
    );
    return rows;
  },

  async submitFeedback(id, rating, feedback) {
    await db.query(
      'UPDATE amenity_bookings SET rating = ?, feedback = ? WHERE id = ?',
      [rating, feedback, id]
    );
  },

  async getAnalytics() {
    const [usage] = await db.query(`
      SELECT a.name, COUNT(ab.id) as count, SUM(ab.total_amount) as revenue
      FROM amenities a
      LEFT JOIN amenity_bookings ab ON a.id = ab.amenity_id 
      AND ab.status IN ('confirmed', 'completed')
      GROUP BY a.id, a.name
    `);

    const [hourly] = await db.query(`
      SELECT HOUR(start_time) as hour, COUNT(*) as count
      FROM amenity_bookings
      WHERE status IN ('confirmed', 'completed')
      GROUP BY hour
      ORDER BY hour
    `);

    return { usage, hourly };
  },

  // Management Methods
  async findAllWithInactive() {
    const [rows] = await db.query('SELECT * FROM amenities ORDER BY name');
    return rows;
  },

  async create(data) {
    const { name, description, capacity, price_per_hour, opening_time, closing_time } = data;
    const [result] = await db.query(
      `INSERT INTO amenities (name, description, capacity, price_per_hour, opening_time, closing_time) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, capacity, price_per_hour, opening_time, closing_time]
    );
    return result;
  },

  async update(id, data) {
    const { name, description, capacity, price_per_hour, opening_time, closing_time } = data;
    await db.query(
      `UPDATE amenities SET name = ?, description = ?, capacity = ?, price_per_hour = ?, opening_time = ?, closing_time = ? 
       WHERE id = ?`,
      [name, description, capacity, price_per_hour, opening_time, closing_time, id]
    );
  },

  async toggleStatus(id, isActive) {
    await db.query('UPDATE amenities SET is_active = ? WHERE id = ?', [isActive, id]);
  }
};

module.exports = amenityDao;
