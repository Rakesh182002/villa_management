const staffService = require('../services/staffService');
const logger = require('../utils/Logger');

/**
 * Domestic Staff Controller
 */

// @desc    Get all active staff
const getAllStaff = async (req, res) => {
  try {
    const staff = await staffService.getAllStaff(req.query.staff_type);
    res.json({ success: true, data: staff });
  } catch (error) {
    logger.error('Get staff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Initiate Onboard — Management (optional resident_id in body) or Resident (auto from session)
const addStaff = async (req, res) => {
  try {
    let residentId;
    if (req.user.role === 'resident') {
      // Resident: always assign to themselves — no field needed in form
      residentId = req.userId;
    } else if (req.user.role === 'management' && req.body.resident_id) {
      // Management: optionally assign to a specific resident
      residentId = parseInt(req.body.resident_id, 10);
    } else {
      residentId = null; // Management registers globally, assign later
    }
    const result = await staffService.initiateStaffOnboarding(req.body, req.file, residentId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Add staff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Onboard (Phase 2)
const verifyOnboarding = async (req, res) => {
  try {
    const staff = await staffService.verifyStaffOnboarding(req.params.id, req.body.otp);
    res.json({ success: true, data: staff });
  } catch (error) {
    logger.error('Verify onboarding error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Update staff profile — Management (any) or Resident (own staff only)
const updateStaff = async (req, res) => {
  try {
    const staff = await staffService.updateStaff(
      req.params.id, req.body, req.file, req.userId, req.user.role
    );
    res.json({ success: true, data: staff });
  } catch (error) {
    logger.error('Update staff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Terminate staff (Soft delete) — Management only
const deleteStaff = async (req, res) => {
  try {
    await staffService.deleteStaff(req.params.id);
    res.json({ success: true, message: 'Staff off-boarded successfully' });
  } catch (error) {
    logger.error('Delete staff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────── OTP Verification (Gate Security) ─────────────────────── */

// @desc    Request OTP for staff gate entry
const requestEntryOTP = async (req, res) => {
  try {
    const result = await staffService.requestEntryOTP(req.params.id, req.body.resident_id);
    res.json(result);
  } catch (error) {
    logger.error('OTP Request error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────── Resident Operations ─────────────────────── */

// @desc    Assign staff to resident — Management assigns any, Resident self-assigns
const assignStaff = async (req, res) => {
  try {
    const targetResidentId = req.user.role === 'management' ? req.body.resident_id : req.userId;
    if (!targetResidentId) throw new Error('Target resident required');

    await staffService.assignToResident(targetResidentId, req.params.id, req.body.role);
    res.json({ success: true, message: 'Roster updated' });
  } catch (error) {
    logger.error('Assign staff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Unassign staff from resident's roster
const unassignStaff = async (req, res) => {
  try {
    await staffService.unassignFromResident(req.userId, req.params.id);
    res.json({ success: true, message: 'Staff removed from roster' });
  } catch (error) {
    logger.error('Unassign staff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Get resident's own assigned staff
const getMyStaff = async (req, res) => {
  try {
    const staff = await staffService.getMyStaff(req.userId);
    res.json({ success: true, data: staff });
  } catch (error) {
    logger.error('Get my staff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────── Gate Operations ─────────────────────── */

const markStaffEntry = async (req, res) => {
  try {
    console.log(req.params.id, req.body);
    const attendance = await staffService.markStaffEntry(req.params.id, req.body);
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Entry error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const markStaffExit = async (req, res) => {
  try {
    const updated = await staffService.markStaffExit(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Exit error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getStaffInside = async (req, res) => {
  try {
    const staff = await staffService.getStaffInside();
    res.json({ success: true, data: staff });
  } catch (error) {
    logger.error('Fetch inside error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────── Analytics & Performance ─────────────────────── */

const addStaffReview = async (req, res) => {
  try {
    const result = await staffService.addStaffReview(req.params.id, req.userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Review error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getStaffReviews = async (req, res) => {
  try {
    const reviews = await staffService.getStaffReviews(req.params.id);
    res.json({ success: true, data: reviews });
  } catch (error) {
    logger.error('Fetch reviews error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getStaffAttendance = async (req, res) => {
  try {
    const history = await staffService.getStaffAttendance(req.params.id, req.query.start_date, req.query.end_date);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Fetch history error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllStaff, addStaff, verifyOnboarding, updateStaff, deleteStaff,
  requestEntryOTP, assignStaff, unassignStaff, getMyStaff,
  markStaffEntry, markStaffExit, getStaffInside,
  addStaffReview, getStaffReviews, getStaffAttendance
};