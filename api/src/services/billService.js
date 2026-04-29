const billDao = require('../dao/billDao');

const billService = {
  async getBills(residentId, status) {
    return await billDao.findByResident(residentId, status);
  },

  async getAllBills(filters) {
    return await billDao.findAll(filters);
  },

  async generateBills(data) {
    const { bill_type, month_year, amount, due_date } = data;

    // Get all residents
    const residents = await billDao.getAllResidents();

    const billPromises = residents.map(async (resident) => {
      const bill_number = `BILL-${Date.now()}-${resident.id}`;
      return billDao.createBill({
        bill_number,
        resident_id: resident.id,
        amount,
        bill_type,
        month_year,
        due_date
      });
    });

    await Promise.all(billPromises);
    return residents.length;
  },

  async payBill(id, residentId, paymentMethod) {
    const bill = await billDao.findByIdAndResident(id, residentId);
    if (!bill) {
      const error = new Error('Bill not found');
      error.status = 404;
      throw error;
    }

    if (bill.status === 'paid') {
      return { bill, message: 'Bill already marked as paid' };
    }

    // Generate transaction ID
    const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await billDao.updatePayment(id, transaction_id);

    // Record transaction
    await billDao.createTransaction({
      transaction_number: transaction_id,
      type: 'income',
      category: bill.bill_type,
      amount: bill.amount,
      description: `Payment for ${bill.bill_number}`,
      recorded_by: residentId
    });

    const updated = await billDao.findById(id);
    return { bill: updated, transaction_id };
  },

  async getStats() {
    const overview = await billDao.getStats();
    const byType = await billDao.getStatsByType();
    return { overview, byType };
  }
};

module.exports = billService;
