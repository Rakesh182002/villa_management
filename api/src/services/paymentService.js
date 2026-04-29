const Razorpay = require('razorpay');
const crypto = require('crypto');
const paymentDao = require('../dao/paymentDao');
const logger = require('../utils/Logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  async createOrder(data) {
    const { amount, currency, receipt, notes } = data;

    const options = {
      amount, // Amount in paise
      currency,
      receipt,
      notes,
    };

    try {
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      logger.error('Razorpay Create Order Error:', error);
      throw new Error('Failed to create Razorpay order');
    }
  }

  async verifyPayment(data) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billId, bills } = data;

    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    if (billId) {
      // Single bill payment
      const bill = await paymentDao.findBillById(billId);
      if (!bill) throw new Error('Bill not found');

      await paymentDao.updateBillStatus(billId, 'paid', razorpay_payment_id);
      await paymentDao.createTransaction({
        transaction_number: razorpay_payment_id,
        type: 'income',
        category: bill.bill_type,
        amount: bill.amount,
        description: `Payment for ${bill.bill_number} (Razorpay ID: ${razorpay_payment_id})`,
        recorded_by: bill.resident_id
      });
    } else if (bills && Array.isArray(bills)) {
      // Bulk bill payment
      const billRecords = await paymentDao.findBillsByIds(bills);
      for (const bill of billRecords) {
        await paymentDao.updateBillStatus(bill.id, 'paid', `${razorpay_payment_id}_${bill.id}`);
        await paymentDao.createTransaction({
          transaction_number: `${razorpay_payment_id}_${bill.id}`,
          type: 'income',
          category: bill.bill_type,
          amount: bill.amount,
          description: `Bulk Payment for ${bill.bill_number} (Razorpay ID: ${razorpay_payment_id})`,
          recorded_by: bill.resident_id
        });
      }
    } else {
      throw new Error('No bill information provided for verification');
    }

    return { success: true, message: 'Payment verified and recorded' };
  }

  async createBulkOrder(data) {
    const { amount, bills } = data; // amount in paise

    const options = {
      amount,
      currency: 'INR',
      receipt: `bulk_${Date.now()}`,
      notes: {
        billIds: bills.join(','),
      },
    };

    try {
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      logger.error('Razorpay Create Bulk Order Error:', error);
      throw new Error('Failed to create Razorpay bulk order');
    }
  }

  async getHistory(residentId) {
    return await paymentDao.getTransactionHistory(residentId);
  }
}

module.exports = new PaymentService();
