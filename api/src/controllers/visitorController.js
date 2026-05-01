const visitorService = require('../services/visitorService');
const logger = require('../utils/Logger');

// @desc    Create visitor request
// @route   POST /api/visitors
// @access  Private (Resident)
const createVisitorRequest = async (req, res) => {
  try {
    const visitor = await visitorService.createVisitorRequest(req.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Visitor invitation created successfully',
      data: visitor
    });
  } catch (error) {
    logger.error('Create visitor error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error creating visitor request'
    });
  }
};

// @desc    Guard initiates visitor request for resident
// @route   POST /api/visitors/guard-initiate
// @access  Private (Guard)
const initiateGuardVisitorRequest = async (req, res) => {
  try {
    const visitor = await visitorService.initiateGuardVisitorRequest(req.userId, req.body);
    res.status(201).json({
      success: true,
      message: visitor.status === 'approved' ? 'Visitor auto-approved' : 'Approval request sent to resident',
      data: visitor
    });
  } catch (error) {
    logger.error('Guard initiate visitor error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error initiating visitor request'
    });
  }
};

// @desc    Get all visitor requests for resident
// @route   GET /api/visitors
// @access  Private (Resident)
const getVisitorRequests = async (req, res) => {
  try {
    const visitors = await visitorService.getVisitorRequests(req.userId);
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    logger.error('Get visitors error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching visitor requests'
    });
  }
};

// @desc    Get all pending visitors (for guards)
// @route   GET /api/visitors/pending
// @access  Private (Guard)
const getPendingVisitors = async (req, res) => {
  try {
    const visitors = await visitorService.getPendingVisitors();
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    logger.error('Get pending visitors error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching pending visitors'
    });
  }
};

// @desc    Verify visitor by QR code
// @route   POST /api/visitors/verify
// @access  Private (Guard)
const verifyVisitor = async (req, res) => {
  try {
    const visitor = await visitorService.verifyVisitor(req.body.unique_code);
    res.json({
      success: true,
      data: visitor
    });
  } catch (error) {
    logger.error('Verify visitor error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error verifying visitor'
    });
  }
};

// @desc    Approve/Deny visitor request
// @route   PUT /api/visitors/:id/status
// @access  Private (Resident)
const updateVisitorStatus = async (req, res) => {
  try {
    const updated = await visitorService.updateVisitorStatus(req.params.id, req.userId, req.body.status);
    res.json({
      success: true,
      message: `Visitor ${req.body.status === 'approved' ? 'approved' : 'denied'} successfully`,
      data: updated
    });
  } catch (error) {
    logger.error('Update visitor status error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error updating visitor status'
    });
  }
};

// @desc    Mark visitor entry
// @route   PUT /api/visitors/:id/entry
// @access  Private (Guard)
const markVisitorEntry = async (req, res) => {
  try {
    const updated = await visitorService.markVisitorEntry(req.params.id);
    res.json({
      success: true,
      message: 'Visitor entry marked successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Mark entry error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error marking visitor entry'
    });
  }
};

// @desc    Mark visitor exit
// @route   PUT /api/visitors/:id/exit
// @access  Private (Guard)
const markVisitorExit = async (req, res) => {
  try {
    const updated = await visitorService.markVisitorExit(req.params.id);
    res.json({
      success: true,
      message: 'Visitor exit marked successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Mark exit error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error marking visitor exit'
    });
  }
};

// @desc    Get visitors currently inside
// @route   GET /api/visitors/inside
// @access  Private (Guard, Management)
const getVisitorsInside = async (req, res) => {
  try {
    const visitors = await visitorService.getVisitorsInside();
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    logger.error('Get visitors inside error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching visitors inside'
    });
  }
};

// @desc    Check for overstay visitors
// @route   GET /api/visitors/overstay
// @access  Private (Guard, Management)
const checkOverstay = async (req, res) => {
  try {
    const visitors = await visitorService.checkOverstay();
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    logger.error('Check overstay error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error checking overstay visitors'
    });
  }
};

module.exports = {
  createVisitorRequest,
  getVisitorRequests,
  getPendingVisitors,
  verifyVisitor,
  updateVisitorStatus,
  markVisitorEntry,
  markVisitorExit,
  getVisitorsInside,
  checkOverstay,
  initiateGuardVisitorRequest
};