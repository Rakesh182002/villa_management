const db = require('../config/database');

const staffDao = {
  async findAll(staffType) {
    let query = 'SELECT * FROM domestic_staff WHERE is_active = TRUE';
    const params = [];

    if (staffType) {
      query += ' AND staff_type = ?';
      params.push(staffType);
    }

    query += ' ORDER BY full_name';
    const [rows] = await db.query(query, params);
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM domestic_staff WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async create(data) {
    const { full_name, phone, staff_type, gender, address, aadhar_number, photo_url, pass_code } = data;
    const [result] = await db.query(
      'INSERT INTO domestic_staff (full_name, phone, staff_type, gender, address, aadhar_number, photo_url, pass_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [full_name, phone, staff_type, gender, address, aadhar_number, photo_url, pass_code]
    );
    return result;
  },

  async update(id, data) {
    const { full_name, phone, staff_type, gender, address, aadhar_number, photo_url } = data;
    let query = 'UPDATE domestic_staff SET full_name = ?, phone = ?, staff_type = ?, gender = ?, address = ?, aadhar_number = ?';
    const params = [full_name, phone, staff_type, gender, address, aadhar_number];

    if (photo_url) {
      query += ', photo_url = ?';
      params.push(photo_url);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);
  },

  async delete(id) {
    await db.query('UPDATE domestic_staff SET is_active = FALSE WHERE id = ?', [id]);
  },

  async verifyStaff(id) {
    await db.query('UPDATE domestic_staff SET is_verified = TRUE WHERE id = ?', [id]);
  },

  async findCreatedStaff(id) {
    const [rows] = await db.query(
      'SELECT * FROM domestic_staff WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /* ─────────────────────── Attendance ─────────────────────── */

  async findActiveAttendance(staffId) {
    const [rows] = await db.query(
      'SELECT * FROM staff_attendance WHERE staff_id = ? AND status = "checked_in"',
      [staffId]
    );
    return rows[0] || null;
  },

  async createAttendance(data) {
    const { staff_id, resident_id, check_in_method } = data;
    console.log(data);
    const [result] = await db.query(
      'INSERT INTO staff_attendance (staff_id, resident_id, society_entry, date, check_in_method, status) VALUES (?, ?, NOW(), CURDATE(), ?, "checked_in")',
      [staff_id, resident_id, check_in_method]
    );
    return result;
  },

  async markExit(attendanceId) {
    await db.query(
      'UPDATE staff_attendance SET society_exit = NOW(), status = "checked_out" WHERE id = ?',
      [attendanceId]
    );
  },

  async findAttendanceWithDetails(attendanceId) {
    const [rows] = await db.query(
      `SELECT sa.*, ds.full_name as staff_name, ds.staff_type, ds.phone,
              u.full_name as resident_name, u.apartment_number
       FROM staff_attendance sa
       JOIN domestic_staff ds ON sa.staff_id = ds.id
       LEFT JOIN users u ON sa.resident_id = u.id
       WHERE sa.id = ?`,
      [attendanceId]
    );
    return rows[0] || null;
  },

  async findActiveAttendanceById(attendanceId) {
    const [rows] = await db.query(
      'SELECT * FROM staff_attendance WHERE id = ? AND status = "checked_in"',
      [attendanceId]
    );
    return rows[0] || null;
  },

  async findExitAttendanceWithDetails(attendanceId) {
    const [rows] = await db.query(
      `SELECT sa.*, ds.full_name as staff_name, u.full_name as resident_name
       FROM staff_attendance sa
       JOIN domestic_staff ds ON sa.staff_id = ds.id
       LEFT JOIN users u ON sa.resident_id = u.id
       WHERE sa.id = ?`,
      [attendanceId]
    );
    return rows[0] || null;
  },

  async getAttendance(staffId, startDate, endDate) {
    let query = `
      SELECT sa.*, u.full_name as resident_name, u.apartment_number
      FROM staff_attendance sa
      JOIN users u ON sa.resident_id = u.id
      WHERE sa.staff_id = ?
    `;
    const params = [staffId];

    if (startDate && endDate) {
      query += ' AND sa.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY sa.date DESC, sa.society_entry DESC';
    const [rows] = await db.query(query, params);
    return rows;
  },

  async findStaffInside() {
    const [rows] = await db.query(
      `SELECT sa.*, 
              ds.full_name as staff_name,
              ds.staff_type,
              u.full_name as resident_name,
              u.apartment_number,
              TIMESTAMPDIFF(MINUTE, sa.society_entry, NOW()) as duration_minutes
       FROM staff_attendance sa
       JOIN domestic_staff ds ON sa.staff_id = ds.id
       LEFT JOIN users u ON sa.resident_id = u.id
       WHERE sa.status = 'checked_in'
       ORDER BY sa.society_entry DESC`
    );
    return rows;
  },


  /* ─────────────────────── Mapping ─────────────────────── */

  async assignStaff(data) {
    const { staff_id, resident_id, role } = data;
    await db.query(
      'INSERT INTO resident_staff_mapping (staff_id, resident_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = ?, is_active = TRUE',
      [staff_id, resident_id, role, role]
    );
  },

  async unassignStaff(staffId, residentId) {
    await db.query(
      'DELETE FROM resident_staff_mapping WHERE staff_id = ? AND resident_id = ?',
      [staffId, residentId]
    );
  },

  async getFirstMappedResident(staffId) {
    const [rows] = await db.query(
      'SELECT resident_id FROM resident_staff_mapping WHERE staff_id = ? AND is_active = TRUE ORDER BY created_at ASC LIMIT 1',
      [staffId]
    );
    return rows[0] || null;
  },

  async getResidentStaff(residentId) {
    const [rows] = await db.query(
      `SELECT ds.*, rsm.role, rsm.is_active as is_assigned
       FROM resident_staff_mapping rsm
       JOIN domestic_staff ds ON rsm.staff_id = ds.id
       WHERE rsm.resident_id = ? AND ds.is_active = TRUE`,
      [residentId]
    );
    return rows;
  },

  /* ─────────────────────── Reviews ─────────────────────── */

  async createReview(data) {
    const { staff_id, resident_id, rating, review } = data;
    await db.query(
      'INSERT INTO staff_reviews (staff_id, resident_id, rating, review) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = ?, review = ?',
      [staff_id, resident_id, rating, review, rating, review]
    );
  },

  async getAverageRating(staffId) {
    const [rows] = await db.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM staff_reviews WHERE staff_id = ?',
      [staffId]
    );
    return rows[0];
  },

  async updateRating(staffId, avgRating, totalReviews) {
    await db.query(
      'UPDATE domestic_staff SET average_rating = ?, total_reviews = ? WHERE id = ?',
      [avgRating, totalReviews, staffId]
    );
  },

  async getReviews(staffId) {
    const [rows] = await db.query(
      `SELECT sr.*, u.full_name as resident_name, u.apartment_number
       FROM staff_reviews sr
       JOIN users u ON sr.resident_id = u.id
       WHERE sr.staff_id = ?
       ORDER BY sr.created_at DESC`,
      [staffId]
    );
    return rows;
  },

  /* ─────────────────────── Ownership Check ─────────────────────── */

  async checkResidentMapping(staffId, residentId) {
    const [rows] = await db.query(
      'SELECT * FROM resident_staff_mapping WHERE staff_id = ? AND resident_id = ?',
      [staffId, residentId]
    );
    return rows[0] || null;
  }
};

module.exports = staffDao;
