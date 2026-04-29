const billService = require('../services/billService');
const logger = require('../utils/Logger');

// @desc    Get all bills for resident
// @route   GET /api/bills
// @access  Private (Resident)
const getBills = async (req, res) => {
  try {
    const bills = await billService.getBills(req.userId, req.query.status);
    res.json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error) {
    logger.error('Get bills error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching bills'
    });
  }
};

// @desc    Get all society bills (for management)
// @route   GET /api/bills/all
// @access  Private (Management)
const getAllBills = async (req, res) => {
  try {
    const bills = await billService.getAllBills(req.query);
    res.json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error) {
    logger.error('Get all bills error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching bills'
    });
  }
};

// @desc    Generate bills for all residents
// @route   POST /api/bills/generate
// @access  Private (Management)
const generateBills = async (req, res) => {
  try {
    const count = await billService.generateBills(req.body);
    res.status(201).json({
      success: true,
      message: `Bills generated for ${count} residents`,
      count
    });
  } catch (error) {
    logger.error('Generate bills error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error generating bills'
    });
  }
};

// @desc    Pay bill
// @route   POST /api/bills/:id/pay
// @access  Private (Resident)
const payBill = async (req, res) => {
  try {
    const result = await billService.payBill(req.params.id, req.userId, req.body.payment_method);
    res.json({
      success: true,
      message: 'Payment successful',
      data: result
    });
  } catch (error) {
    logger.error('Pay bill error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error processing payment'
    });
  }
};

// @desc    Get bill statistics
// @route   GET /api/bills/stats
// @access  Private (Management)
const getBillStats = async (req, res) => {
  try {
    const stats = await billService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get bill stats error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching bill statistics'
    });
  }
};

module.exports = { getBills, getAllBills, generateBills, payBill, getBillStats };