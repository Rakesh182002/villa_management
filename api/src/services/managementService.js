const managementDao = require('../dao/managementDao');

const managementService = {
  async getDashboardStats() {
    return await managementDao.getDashboardStats();
  },

  async getAllResidents() {
    return await managementDao.getAllResidents();
  },

  async getAllApartments() {
    return await managementDao.getAllApartments();
  },

  async updateApartment(id, data) {
    const { owner_name, owner_phone, is_occupied } = data;
    const updates = [];
    const values = [];

    if (owner_name !== undefined) {
      updates.push('owner_name = ?');
      values.push(owner_name);
    }
    if (owner_phone !== undefined) {
      updates.push('owner_phone = ?');
      values.push(owner_phone);
    }
    if (is_occupied !== undefined) {
      updates.push('is_occupied = ?');
      values.push(is_occupied);
    }

    if (updates.length === 0) {
      const error = new Error('No updates provided');
      error.status = 400;
      throw error;
    }

    await managementDao.updateApartment(id, updates, values);
    const apartment = await managementDao.findApartmentById(id);

    if (!apartment) {
      const error = new Error('Apartment not found');
      error.status = 404;
      throw error;
    }

    return apartment;
  },

  async getAllTransactions(filters) {
    return await managementDao.getAllTransactions(filters);
  },

  async addTransaction(userId, data) {
    const transaction_number = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await managementDao.addTransaction({
      transaction_number,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      recorded_by: userId,
      transaction_date: data.transaction_date
    });

    const transaction = await managementDao.findTransactionById(result.insertId);
    return transaction;
  },

  async getFinancialSummary() {
    return await managementDao.getFinancialSummary();
  },

  async getVisitorAnalytics() {
    return await managementDao.getVisitorAnalytics();
  }
};

module.exports = managementService;
