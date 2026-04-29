const db = require('../config/database');

const locationDao = {
  async addLocation(data) {
    const { guard_id, latitude, longitude, is_sos } = data;
    await db.query(
      'INSERT INTO location_history (guard_id, latitude, longitude, is_sos) VALUES (?, ?, ?, ?)',
      [guard_id, latitude, longitude, is_sos || false]
    );
  },

  async getLatestGuardLocations() {
    const [rows] = await db.query(`
      SELECT lh.*, u.full_name as guard_name, u.apartment_number as post
      FROM location_history lh
      INNER JOIN (
        SELECT guard_id, MAX(recorded_at) as max_time
        FROM location_history
        WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        GROUP BY guard_id
      ) latest ON lh.guard_id = latest.guard_id AND lh.recorded_at = latest.max_time
      JOIN users u ON lh.guard_id = u.id
      WHERE u.role = 'guard'
    `);
    return rows;
  },

  async getHistory(filters) {
    const { guard_id, start_date, end_date } = filters;
    let query = `
      SELECT lh.*, u.full_name as guard_name
      FROM location_history lh
      JOIN users u ON lh.guard_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (guard_id) {
      query += ' AND lh.guard_id = ?';
      params.push(guard_id);
    }

    if (start_date && end_date) {
      query += ' AND lh.recorded_at BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY lh.recorded_at DESC LIMIT 1000';

    const [rows] = await db.query(query, params);
    return rows;
  },

  async createSOS(data) {
    const { triggered_by, latitude, longitude } = data;
    const [result] = await db.query(
      'INSERT INTO sos_alerts (triggered_by, latitude, longitude, status) VALUES (?, ?, ?, ?)',
      [triggered_by, latitude, longitude, 'active']
    );
    return result;
  },

  async findSOSWithUser(id) {
    const [rows] = await db.query(
      `SELECT s.*, u.full_name, u.apartment_number, u.phone
       FROM sos_alerts s
       JOIN users u ON s.triggered_by = u.id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findActiveSOSById(id) {
    const [rows] = await db.query(
      'SELECT * FROM sos_alerts WHERE id = ? AND status = ?',
      [id, 'active']
    );
    return rows[0] || null;
  },

  async acknowledgeSOS(id, userId) {
    await db.query(
      'UPDATE sos_alerts SET status = ?, acknowledged_by = ? WHERE id = ?',
      ['acknowledged', userId, id]
    );
  },

  async findSOSWithAcknowledgement(id) {
    const [rows] = await db.query(
      `SELECT s.*, 
              t.full_name as triggered_by_name,
              a.full_name as acknowledged_by_name
       FROM sos_alerts s
       JOIN users t ON s.triggered_by = t.id
       LEFT JOIN users a ON s.acknowledged_by = a.id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findSOSById(id) {
    const [rows] = await db.query(
      'SELECT * FROM sos_alerts WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async resolveSOS(id) {
    await db.query(
      'UPDATE sos_alerts SET status = ?, resolved_at = NOW() WHERE id = ?',
      ['resolved', id]
    );
  },

  async getSOSAlerts(status) {
    let query = `
      SELECT s.*,
             t.full_name as triggered_by_name,
             t.apartment_number,
             t.phone as triggered_by_phone,
             a.full_name as acknowledged_by_name
      FROM sos_alerts s
      JOIN users t ON s.triggered_by = t.id
      LEFT JOIN users a ON s.acknowledged_by = a.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }
};

module.exports = locationDao;
