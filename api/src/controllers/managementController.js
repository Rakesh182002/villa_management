const managementService = require('../services/managementService');
const logger = require('../utils/Logger');

// @desc    Get dashboard statistics
// @route   GET /api/management/dashboard
// @access  Private (Management)
const getDashboardStats = async (req, res) => {
  try {
    const stats = await managementService.getDashboardStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching dashboard statistics'
    });
  }
};

// @desc    Get all residents
// @route   GET /api/management/residents
// @access  Private (Management)
const getAllResidents = async (req, res) => {
  try {
    const residents = await managementService.getAllResidents();
    res.json({
      success: true,
      count: residents.length,
      data: residents
    });
  } catch (error) {
    logger.error('Get all residents error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching residents'
    });
  }
};

// @desc    Get all apartments
// @route   GET /api/management/apartments
// @access  Private (Management)
const getAllApartments = async (req, res) => {
  try {
    const apartments = await managementService.getAllApartments();
    res.json({
      success: true,
      count: apartments.length,
      data: apartments
    });
  } catch (error) {
    logger.error('Get all apartments error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching apartments'
    });
  }
};

// @desc    Update apartment details
// @route   PUT /api/management/apartments/:id
// @access  Private (Management)
const updateApartment = async (req, res) => {
  try {
    const apartment = await managementService.updateApartment(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Apartment updated successfully',
      data: apartment
    });
  } catch (error) {
    logger.error('Update apartment error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error updating apartment'
    });
  }
};

// @desc    Get all transactions
// @route   GET /api/management/transactions
// @access  Private (Management)
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await managementService.getAllTransactions(req.query);
    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    logger.error('Get all transactions error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching transactions'
    });
  }
};

// @desc    Add new transaction
// @route   POST /api/management/transactions
// @access  Private (Management)
const addTransaction = async (req, res) => {
  try {
    const transaction = await managementService.addTransaction(req.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Add transaction error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error recording transaction'
    });
  }
};

// @desc    Get financial summary
// @route   GET /api/management/financials
// @access  Private (Management)
const getFinancialSummary = async (req, res) => {
  try {
    const summary = await managementService.getFinancialSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get financial summary error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching financial summary'
    });
  }
};

// @desc    Get visitor analytics
// @route   GET /api/management/visitor-analytics
// @access  Private (Management)
const getVisitorAnalytics = async (req, res) => {
  try {
    const analytics = await managementService.getVisitorAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get visitor analytics error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching visitor analytics'
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllResidents,
  getAllApartments,
  getAllTransactions,
  addTransaction,
  getFinancialSummary,
  getVisitorAnalytics,
  updateApartment
};
