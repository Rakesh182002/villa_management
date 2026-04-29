const complaintService = require('../services/complaintService');
const logger = require('../utils/Logger');

// @desc    Create complaint
// @route   POST /api/complaints
// @access  Private (Resident)
const createComplaint = async (req, res) => {
  try {
    const complaint = await complaintService.create(req.userId, req.body, req.files);
    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully',
      data: complaint
    });
  } catch (error) {
    logger.error('Create complaint error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error creating complaint'
    });
  }
};

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private
const getComplaints = async (req, res) => {
  try {
    const complaints = await complaintService.getAll(req.query, req.user);
    res.json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    logger.error('Get complaints error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching complaints'
    });
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private
const getComplaint = async (req, res) => {
  try {
    const complaint = await complaintService.getById(req.params.id, req.user);
    res.json({
      success: true,
      data: complaint
    });
  } catch (error) {
    logger.error('Get complaint error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching complaint'
    });
  }
};

// @desc    Update complaint status
// @route   PUT /api/complaints/:id/status
// @access  Private (Management, Guard)
const updateComplaintStatus = async (req, res) => {
  try {
    const updated = await complaintService.updateStatus(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Update complaint status error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error updating complaint status'
    });
  }
};

// @desc    Rate resolved complaint
// @route   PUT /api/complaints/:id/rate
// @access  Private (Resident)
const rateComplaint = async (req, res) => {
  try {
    const updated = await complaintService.rate(req.params.id, req.userId, req.body.rating);
    res.json({
      success: true,
      message: 'Complaint rated successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Rate complaint error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error rating complaint'
    });
  }
};

// @desc    Get complaint statistics
// @route   GET /api/complaints/stats
// @access  Private (Management)
const getComplaintStats = async (req, res) => {
  try {
    const stats = await complaintService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get complaint stats error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching complaint statistics'
    });
  }
};

module.exports = { createComplaint, getComplaints, getComplaint, updateComplaintStatus, rateComplaint, getComplaintStats };