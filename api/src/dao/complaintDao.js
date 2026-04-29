const db = require('../config/database');

const complaintDao = {
  async create(data) {
    const { complaint_number, resident_id, title, description, image_urls, category, priority } = data;
    const [result] = await db.query(
      `INSERT INTO complaints (complaint_number, resident_id, title, description, image_urls, category, priority, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
      [complaint_number, resident_id, title, description, image_urls, category, priority]
    );
    return result;
  },

  async findByIdWithDetails(id) {
    const [rows] = await db.query(
      `SELECT c.*, u.full_name as resident_name, u.apartment_number 
       FROM complaints c
       JOIN users u ON c.resident_id = u.id
       WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll(filters) {
    const { role, userId, status, category, priority } = filters;
    let query = `
      SELECT c.*, 
             u.full_name as resident_name, 
             u.apartment_number,
             a.full_name as assigned_to_name
      FROM complaints c
      JOIN users u ON c.resident_id = u.id
      LEFT JOIN users a ON c.assigned_to = a.id
    `;
    
    const conditions = [];
    const params = [];

    // Residents see only their complaints
    if (role === 'resident') {
      conditions.push('c.resident_id = ?');
      params.push(userId);
    }

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }

    if (category) {
      conditions.push('c.category = ?');
      params.push(category);
    }

    if (priority) {
      conditions.push('c.priority = ?');
      params.push(priority);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  },

  async findByIdFull(id) {
    const [rows] = await db.query(
      `SELECT c.*, 
              u.full_name as resident_name, 
              u.apartment_number, 
              u.phone as resident_phone,
              a.full_name as assigned_to_name
       FROM complaints c
       JOIN users u ON c.resident_id = u.id
       LEFT JOIN users a ON c.assigned_to = a.id
       WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM complaints WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async updateStatus(id, updates, params) {
    params.push(id);
    await db.query(
      `UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  },

  async findByIdAndResident(id, residentId) {
    const [rows] = await db.query(
      'SELECT * FROM complaints WHERE id = ? AND resident_id = ?',
      [id, residentId]
    );
    return rows[0] || null;
  },

  async rate(id, rating) {
    await db.query(
      'UPDATE complaints SET rating = ? WHERE id = ?',
      [rating, id]
    );
  },

  async getStats() {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as highpriority,
        AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END) as avg_rating,
        AVG(CASE WHEN resolved_at IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
            ELSE NULL END) as avg_resolution_hours
      FROM complaints
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    return rows[0];
  },

  async getStatsByCategory() {
    const [rows] = await db.query(`
      SELECT category, COUNT(*) as count
      FROM complaints
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY category
      ORDER BY count DESC
    `);
    return rows;
  }
};

module.exports = complaintDao;
