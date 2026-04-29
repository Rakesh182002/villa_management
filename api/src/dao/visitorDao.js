const db = require('../config/database');

const visitorDao = {
  async create(data) {
    const { resident_id, visitor_name, visitor_phone, vehicle_number, unique_code, qr_code, purpose, expected_arrival } = data;
    const [result] = await db.query(
      `INSERT INTO visitor_requests 
       (resident_id, visitor_name, visitor_phone, vehicle_number, unique_code, qr_code, purpose, expected_arrival, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
      [resident_id, visitor_name, visitor_phone, vehicle_number, unique_code, qr_code, purpose, expected_arrival]
    );
    return result;
  },

  async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM visitor_requests WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findByResident(residentId) {
    const [rows] = await db.query(
      `SELECT vr.*, u.full_name as resident_name, u.apartment_number 
       FROM visitor_requests vr
       JOIN users u ON vr.resident_id = u.id
       WHERE vr.resident_id = ?
       ORDER BY vr.created_at DESC`,
      [residentId]
    );
    return rows;
  },

  async findPending() {
    const [rows] = await db.query(
      `SELECT vr.*, u.full_name as resident_name, u.apartment_number, u.phone as resident_phone
       FROM visitor_requests vr
       JOIN users u ON vr.resident_id = u.id
       WHERE vr.status IN ('pending', 'approved')
       ORDER BY vr.created_at DESC`
    );
    return rows;
  },

  async findByUniqueCode(uniqueCode) {
    const [rows] = await db.query(
      `SELECT vr.*, u.full_name as resident_name, u.apartment_number, u.phone as resident_phone
       FROM visitor_requests vr
       JOIN users u ON vr.resident_id = u.id
       WHERE vr.unique_code = ?`,
      [uniqueCode]
    );
    return rows[0] || null;
  },

  async findByIdAndResident(id, residentId) {
    const [rows] = await db.query(
      'SELECT * FROM visitor_requests WHERE id = ? AND resident_id = ?',
      [id, residentId]
    );
    return rows[0] || null;
  },

  async updateStatus(id, status) {
    await db.query(
      'UPDATE visitor_requests SET status = ? WHERE id = ?',
      [status, id]
    );
  },

  async markEntry(id) {
    await db.query(
      'UPDATE visitor_requests SET status = ?, actual_entry = NOW() WHERE id = ?',
      ['entered', id]
    );
  },

  async markExit(id) {
    await db.query(
      'UPDATE visitor_requests SET status = ?, actual_exit = NOW() WHERE id = ?',
      ['exited', id]
    );
  },

  async findInside() {
    const [rows] = await db.query(
      `SELECT vr.*, u.full_name as resident_name, u.apartment_number,
       TIMESTAMPDIFF(MINUTE, vr.actual_entry, NOW()) as duration_minutes
       FROM visitor_requests vr
       JOIN users u ON vr.resident_id = u.id
       WHERE vr.status = 'entered'
       ORDER BY vr.actual_entry DESC`
    );
    return rows;
  },

  async findOverstay(limitMinutes) {
    const [rows] = await db.query(
      `SELECT vr.*, u.full_name as resident_name, u.apartment_number, u.phone as resident_phone,
       TIMESTAMPDIFF(MINUTE, vr.actual_entry, NOW()) as duration_minutes
       FROM visitor_requests vr
       JOIN users u ON vr.resident_id = u.id
       WHERE vr.status = 'entered'
       AND TIMESTAMPDIFF(MINUTE, vr.actual_entry, NOW()) > ?`,
      [limitMinutes]
    );
    return rows;
  },

  async markOverstayAlertSent(id) {
    await db.query(
      'UPDATE visitor_requests SET overstay_alert_sent = TRUE WHERE id = ?',
      [id]
    );
  }
};

module.exports = visitorDao;
