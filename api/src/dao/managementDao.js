const db = require('../config/database');

const managementDao = {
  async getDashboardStats() {
    const [residents] = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE role = 'resident'"
    );
    const [guards] = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE role = 'guard'"
    );
    const [apartments] = await db.query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN is_occupied = TRUE THEN 1 ELSE 0 END) as occupied FROM apartments'
    );
    const [complaints] = await db.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count FROM complaints"
    );
    const [high_priority_complaints] = await db.query(
      "SELECT COUNT(*) as total FROM complaints WHERE priority = 'high' AND status != 'resolved'"
    );
    const [visitors] = await db.query(
      "SELECT COUNT(*) as total FROM visitor_requests WHERE status = 'entered'"
    );
    const [today_visitors] = await db.query(
      "SELECT COUNT(*) as total FROM visitor_requests WHERE status = 'entered' AND created_at >= CURDATE()"
    );
    const [bills] = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as collected_amount
      FROM bills
      WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
    `);

    return {
      residents: residents[0].total,
      guards: guards[0].total,
      total_apartments: apartments[0].total,
      occupied_apartments: apartments[0].occupied,
      total_complaints: complaints[0].total,
      open_complaints: complaints[0].open_count,
      visitors_inside: visitors[0].total,
      pending_amount: bills[0].pending_amount || 0,
      collected_amount: bills[0].collected_amount || 0,
      today_visitors: today_visitors[0].total,
      high_priority_complaints: high_priority_complaints[0].total,
    };
  },

  async getAllResidents() {
    const [rows] = await db.query(
      "SELECT id, email, full_name, phone, apartment_number, is_verified, created_at FROM users WHERE role = 'resident' ORDER BY full_name"
    );
    return rows;
  },

  async getAllApartments() {
    const [rows] = await db.query(
      'SELECT * FROM apartments ORDER BY block, apartment_number'
    );
    return rows;
  },

  async updateApartment(id, updates, values) {
    values.push(id);
    await db.query(
      `UPDATE apartments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  },

  async findApartmentById(id) {
    const [rows] = await db.query(
      'SELECT * FROM apartments WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async getAllTransactions(filters) {
    const { type, category, start_date, end_date } = filters;
    let query = `
      SELECT t.*, u.full_name as recorded_by_name
      FROM transactions t
      JOIN users u ON t.recorded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    if (category) {
      query += ' AND t.category = ?';
      params.push(category);
    }

    if (start_date && end_date) {
      query += ' AND t.transaction_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY t.transaction_date DESC';
    const [rows] = await db.query(query, params);
    return rows;
  },

  async addTransaction(data) {
    const { transaction_number, type, category, amount, description, recorded_by, transaction_date } = data;
    const [result] = await db.query(
      `INSERT INTO transactions (transaction_number, type, category, amount, description, recorded_by, transaction_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [transaction_number, type, category, amount, description, recorded_by, transaction_date]
    );
    return result;
  },

  async findTransactionById(id) {
    const [rows] = await db.query(
      `SELECT t.*, u.full_name as recorded_by_name
       FROM transactions t
       JOIN users u ON t.recorded_by = u.id
       WHERE t.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async getFinancialSummary() {
    const [monthly] = await db.query(`
      SELECT 
        DATE_FORMAT(transaction_date, '%Y-%m') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY month DESC
    `);

    const [totals] = await db.query(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE YEAR(transaction_date) = YEAR(CURDATE())
    `);

    return {
      monthly,
      yearly: totals[0]
    };
  },

  async getVisitorAnalytics() {
    const [daily] = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'entered' OR status = 'exited' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied
      FROM visitor_requests
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    const [byPurpose] = await db.query(`
      SELECT purpose, COUNT(*) as count
      FROM visitor_requests
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY purpose
      ORDER BY count DESC
    `);

    return {
      daily,
      byPurpose
    };
  }
};

module.exports = managementDao;
