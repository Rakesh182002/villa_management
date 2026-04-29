const db = require('../config/database');

const billDao = {
  async findByResident(residentId, status) {
    let query = 'SELECT * FROM bills WHERE resident_id = ?';
    const params = [residentId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY due_date DESC';
    const [rows] = await db.query(query, params);
    return rows;
  },

  async findAll(filters) {
    const { status, bill_type, month_year } = filters;
    let query = `
      SELECT b.*, u.full_name as resident_name, u.apartment_number, u.phone as resident_phone
      FROM bills b
      JOIN users u ON b.resident_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    if (bill_type) {
      query += ' AND b.bill_type = ?';
      params.push(bill_type);
    }

    if (month_year) {
      query += ' AND b.month_year = ?';
      params.push(month_year);
    }

    query += ' ORDER BY b.due_date DESC';
    const [rows] = await db.query(query, params);
    return rows;
  },

  async findByIdAndResident(id, residentId) {
    const [rows] = await db.query(
      'SELECT * FROM bills WHERE id = ? AND resident_id = ?',
      [id, residentId]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM bills WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async getAllResidents() {
    const [rows] = await db.query(
      "SELECT id FROM users WHERE role = 'resident'"
    );
    return rows;
  },

  async createBill(data) {
    const { bill_number, resident_id, amount, bill_type, month_year, due_date } = data;
    await db.query(
      `INSERT INTO bills (bill_number, resident_id, amount, bill_type, month_year, due_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'unpaid')`,
      [bill_number, resident_id, amount, bill_type, month_year, due_date]
    );
  },

  async updatePayment(id, transactionId) {
    await db.query(
      'UPDATE bills SET status = ?, paid_at = NOW(), transaction_id = ? WHERE id = ?',
      ['paid', transactionId, id]
    );
  },

  async createTransaction(data) {
    const { transaction_number, type, category, amount, description, recorded_by } = data;
    await db.query(
      `INSERT INTO transactions (transaction_number, type, category, amount, description, recorded_by, transaction_date) 
       VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
      [transaction_number, type, category, amount, description, recorded_by]
    );
  },

  async getStats() {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_bills,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as unpaid_amount,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_count
      FROM bills
      WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
    `);
    return rows[0];
  },

  async getStatsByType() {
    const [rows] = await db.query(`
      SELECT bill_type, 
             COUNT(*) as count,
             SUM(amount) as total
      FROM bills
      WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
      GROUP BY bill_type
    `);
    return rows;
  }
};

module.exports = billDao;
