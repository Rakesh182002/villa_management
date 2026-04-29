const paymentService = require('../services/paymentService');
const logger = require('../utils/Logger');

const paymentController = {
  createOrder: async (req, res) => {
    try {
      const order = await paymentService.createOrder(req.body);
      res.status(201).json({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Payment Create Order Controller Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment order'
      });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const result = await paymentService.verifyPayment(req.body);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Payment Verification Controller Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Payment verification failed'
      });
    }
  },

  createBulkOrder: async (req, res) => {
    try {
      const order = await paymentService.createBulkOrder(req.body);
      res.status(201).json({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Payment Bulk Order Controller Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create bulk payment order'
      });
    }
  },

  getHistory: async (req, res) => {
    try {
      const history = await paymentService.getHistory(req.userId);
      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Get Payment History Controller Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch payment history'
      });
    }
  }
};

module.exports = paymentController;
