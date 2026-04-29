const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validation');
const {
  getAllStaff,
  addStaff,
  verifyOnboarding,
  updateStaff,
  deleteStaff,
  requestEntryOTP,
  assignStaff,
  unassignStaff,
  getMyStaff,
  markStaffEntry,
  markStaffExit,
  getStaffAttendance,
  addStaffReview,
  getStaffReviews,
  getStaffInside
} = require('../controllers/staffController');

// Validation rules
const staffValidation = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('staff_type').isIn(['maid', 'cook', 'driver', 'gardener', 'security', 'babysitter', 'other'])
    .withMessage('Invalid staff type')
];

const markEntryValidation = [
  body('resident_id').optional({ nullable: true }).isInt().withMessage('Resident ID must be a valid integer if provided'),
  body('pass_code').notEmpty().withMessage('Staff permanent pass code is required'),
];

const reviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isString()
];

/* ─────────── 1. Staff Directory & CRUD ─────────── */

// GET all staff — all authenticated roles can browse the directory
router.get('/', auth, getAllStaff);

// POST — Management adds society-wide staff; Resident adds staff for their household
// Both get OTP sent to staff's phone; resident also auto-assigned
router.post(
  '/',
  auth, authorize('management', 'resident'),
  upload.single('photo'),
  staffValidation, validate,
  addStaff
);

// OTP verification step (Phase 2 of onboarding) — both roles
router.post('/:id/verify', auth, authorize('management', 'resident'), verifyOnboarding);

// PUT — Management can edit any; Resident can only edit their own assigned staff
router.put(
  '/:id',
  auth, authorize('management', 'resident'),
  upload.single('photo'),
  staffValidation, validate,
  updateStaff
);

// DELETE (soft) — Management only; Residents use unassign instead
router.delete('/:id', auth, authorize('management'), deleteStaff);

/* ─────────── 2. Resident-Staff Assignment ─────────── */

// Assign: Management picks resident; Resident self-assigns
router.post('/:id/assign', auth, authorize('resident', 'management'), assignStaff);

// Unassign: Resident removes staff from their own roster
router.delete('/:id/unassign', auth, authorize('resident', 'management'), unassignStaff);

// My Staff: resident-scoped list
router.get('/my-staff', auth, authorize('resident'), getMyStaff);

/* ─────────── 3. Gate Operations (Guards only) ─────────── */
// Note: request-otp route removed. Daily entry now uses permanent pass_code.
router.post('/:id/entry', auth, authorize('guard'), markEntryValidation, validate, markStaffEntry);
router.put('/attendance/:id/exit', auth, authorize('guard'), markStaffExit);
router.get('/inside/all', auth, authorize('guard', 'management', 'resident'), getStaffInside);

/* ─────────── 4. History & Performance ─────────── */

router.get('/:id/attendance', auth, getStaffAttendance);
router.post('/:id/review', auth, authorize('resident'), reviewValidation, validate, addStaffReview);
router.get('/:id/reviews', auth, getStaffReviews);

module.exports = router;