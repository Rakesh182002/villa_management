const db = require('../config/database');

const paymentDao = {
  async findBillById(id) {
    const [rows] = await db.query('SELECT * FROM bills WHERE id = ?', [id]);
    return rows[0];
  },

  async findBillsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const [rows] = await db.query('SELECT * FROM bills WHERE id IN (?)', [ids]);
    return rows;
  },

  async updateBillStatus(id, status, transactionId, paidAt = new Date()) {
    await db.query(
      'UPDATE bills SET status = ?, transaction_id = ?, paid_at = ? WHERE id = ?',
      [status, transactionId, paidAt, id]
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

  async getTransactionHistory(residentId) {
    const [rows] = await db.query(
      'SELECT * FROM transactions WHERE recorded_by = ? ORDER BY created_at DESC',
      [residentId]
    );
    return rows;
  },

  async findTransactionByNumber(transactionNumber) {
    const [rows] = await db.query(
      'SELECT * FROM transactions WHERE transaction_number = ?',
      [transactionNumber]
    );
    return rows[0];
  }
};

module.exports = paymentDao;
