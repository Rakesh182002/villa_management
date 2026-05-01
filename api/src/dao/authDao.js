const db = require('../config/database');
const logger = require('../utils/Logger');

const authDao = {
  async findUserByEmailOrPhone(email, phone) {
    logger.info(`Checking for existing user with email: ${email} or phone: ${phone}`);
    const [rows] = await db.query(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );
    return rows;
  },

  async createUser(userData) {
    const { email, password_hash, full_name, phone, role, apartment_number } = userData;
    const [result] = await db.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, apartment_number, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, password_hash, full_name, phone, role, apartment_number, true]
    );
    return result;
  },

  async findUserById(id) {
    const [rows] = await db.query(
      'SELECT id, email, full_name, phone, role, apartment_number, profile_pic, is_verified, visitor_auto_approve, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findUserByIdSafe(id) {
    const [rows] = await db.query(
      'SELECT id, email, full_name, phone, role, apartment_number, profile_pic, is_verified, visitor_auto_approve FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findUserByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  async updateUser(id, updates, values) {
    values.push(id);
    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  },

  async getUserPasswordHash(id) {
    const [rows] = await db.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async updatePassword(id, password_hash) {
    await db.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password_hash, id]
    );
  }
};

module.exports = authDao;
