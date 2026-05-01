const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authDao = require('../dao/authDao');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const authService = {
  async register(userData) {
    const { email, phone, password, full_name, role, apartment_number } = userData;

    // Check if user exists
    const existing = await authDao.findUserByEmailOrPhone(email, phone);
    if (existing.length > 0) {
      const error = new Error('User with this email or phone already exists');
      error.status = 400;
      throw error;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const result = await authDao.createUser({ email, password_hash, full_name, phone, role, apartment_number });

    // Get created user
    const user = await authDao.findUserByIdSafe(result.insertId);
    const token = generateToken(user.id);

    return { user, token };
  },

  async login(credentials) {
    const { email, password } = credentials;

    // Check user exists
    const user = await authDao.findUserByEmail(email);
    if (!user) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    // Remove password from response
    // delete user.password_hash;

    const token = generateToken(user.id);

    return { user, token };
    
  },

  async getProfile(userId) {
    const user = await authDao.findUserById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return user;
  },

  async updateProfile(userId, data, file) {
    const { full_name, phone, apartment_number } = data;
    const updates = [];
    const values = [];

    if (full_name) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (apartment_number) {
      updates.push('apartment_number = ?');
      values.push(apartment_number);
    }
    if (file) {
      updates.push('profile_pic = ?');
      values.push(`/uploads/profiles/${file.filename}`);
    }
    if (data.visitor_auto_approve !== undefined) {
      updates.push('visitor_auto_approve = ?');
      values.push(data.visitor_auto_approve ? 1 : 0);
    }

    if (updates.length === 0) {
      const error = new Error('No updates provided');
      error.status = 400;
      throw error;
    }

    await authDao.updateUser(userId, updates, values);
    const user = await authDao.findUserByIdSafe(userId);
    return user;
  },

  async changePassword(userId, passwords) {
    const { currentPassword, newPassword } = passwords;

    // Get user with password
    const userPassword = await authDao.getUserPasswordHash(userId);
    if (!userPassword) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, userPassword.password_hash);
    if (!isMatch) {
      const error = new Error('Current password is incorrect');
      error.status = 401;
      throw error;
    }

    // Hash and update
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    await authDao.updatePassword(userId, password_hash);
  }
};

module.exports = authService;
