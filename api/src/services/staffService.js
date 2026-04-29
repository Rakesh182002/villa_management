const staffDao = require('../dao/staffDao');
const { getIO } = require('../config/socket');
const logger = require('../utils/Logger');

/**
 * PRODUCTION-GRADE SERVICE
 * Permanent Pass Code architecture — no repeated OTPs for daily gate entry.
 */

// ─── Pass Code Generator ─────────────────────────────────────────
// Uses unambiguous characters (no 0/O, 1/I/L) for human readability
const PASS_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generatePassCode = () =>
  Array.from({ length: 6 }, () => PASS_CHARS[Math.floor(Math.random() * PASS_CHARS.length)]).join('');

// ─── One-time Onboarding OTPs (only for registration, not daily entry) ───
const onboardingOTPs = new Map();

const sendSMS = async (phone, message) => {
  try {
    logger.info(`[SMS GATEWAY] Dispatching to ${phone}`);
    console.log(`\n📱 ───── SMS TO: ${phone} ─────`);
    console.log(`💬 ${message}`);
    console.log(`📱 ──────────────────────────────\n`);
    return true;
  } catch (e) {
    logger.error(`[SMS ERROR] ${e.message}`);
    return false;
  }
};

const staffService = {

  async getAllStaff(staffType) {
    return await staffDao.findAll(staffType);
  },

  /* ═══════════════════════════════════════════════════════════
     1. ONBOARDING — generates permanent pass_code
        residentId: auto from req.userId for residents,
                    from req.body.resident_id for management (optional)
     ═══════════════════════════════════════════════════════════ */
  async initiateStaffOnboarding(data, file, residentId = null) {
    let photo_url = null;
    if (file) photo_url = `/uploads/staff/${file.filename}`;

    // Generate ONE permanent gate pass code (stored in DB forever)
    const pass_code = generatePassCode();

    const result = await staffDao.create({
      full_name:    data.full_name,
      phone:        data.phone,
      staff_type:   data.staff_type,
      gender:       data.gender,
      address:      data.address,
      aadhar_number: data.aadhar_number,
      photo_url,
      pass_code,
    });

    const staffId = result.insertId;

    // One-time onboarding OTP (10 min window — identity verification ONLY)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    onboardingOTPs.set(staffId, { otp, expires: Date.now() + 10 * 60 * 1000 });

    // Auto-assign to resident when resident registers, or management selects one
    if (residentId) {
      await staffDao.assignStaff({
        staff_id: staffId, resident_id: residentId, role: data.staff_type,
      });
    }

    // SMS: onboarding OTP + permanent pass code in one message
    await sendSMS(
      data.phone,
      `Society registration OTP: ${otp} (valid 10 min). Permanent gate pass code: ${pass_code} — keep this safe!`
    );

    return {
      staff_id: staffId,
      pass_code,   // returned to frontend to display to user
      message: 'Onboarding OTP dispatched. Permanent pass code generated.',
    };
  },

  /* ═══════════════════════════════════════════════════════════
     2. OTP VERIFY (onboarding identity check — one time)
     ═══════════════════════════════════════════════════════════ */
  async verifyStaffOnboarding(staffId, otp) {
    const stored = onboardingOTPs.get(parseInt(staffId));
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      const err = new Error('Verification failed: Invalid or expired OTP');
      err.status = 400;
      throw err;
    }
    await staffDao.verifyStaff(staffId);
    onboardingOTPs.delete(parseInt(staffId));
    return await staffDao.findById(staffId);
  },

  /* ═══════════════════════════════════════════════════════════
     3. UPDATE (with ownership check for residents)
     ═══════════════════════════════════════════════════════════ */
  async updateStaff(id, data, file, userId = null, userRole = null) {
    const staff = await staffDao.findById(id);
    if (!staff) {
      const err = new Error('Record not found'); err.status = 404; throw err;
    }
    if (userRole === 'resident') {
      const mapping = await staffDao.checkResidentMapping(id, userId);
      if (!mapping) {
        const err = new Error('Forbidden: You can only edit your own staff'); err.status = 403; throw err;
      }
    }
    let photo_url = staff.photo_url;
    if (file) photo_url = `/uploads/staff/${file.filename}`;
    await staffDao.update(id, {
      full_name: data.full_name, phone: data.phone,
      staff_type: data.staff_type, gender: data.gender,
      address: data.address, aadhar_number: data.aadhar_number, photo_url,
    });
    return await staffDao.findById(id);
  },

  async deleteStaff(id) {
    await staffDao.delete(id);
  },

  /* ═══════════════════════════════════════════════════════════
     4. ASSIGNMENT
     ═══════════════════════════════════════════════════════════ */
  async assignToResident(residentId, staffId, role) {
    const staff = await staffDao.findById(staffId);
    if (!staff || !staff.is_verified) {
      throw new Error('Only verified staff can be assigned to residents');
    }
    await staffDao.assignStaff({ resident_id: residentId, staff_id: staffId, role });
    return { success: true };
  },

  async unassignFromResident(residentId, staffId) {
    await staffDao.unassignStaff(staffId, residentId);
    return { success: true };
  },

  async getMyStaff(residentId) {
    return await staffDao.getResidentStaff(residentId);
  },

  /* ═══════════════════════════════════════════════════════════
     5. GATE ENTRY — uses PERMANENT PASS CODE (no daily OTP)
        Guard selects staff + resident, then enters the
        staff's permanent pass_code stored in domestic_staff.
     ═══════════════════════════════════════════════════════════ */
  async markStaffEntry(staffId, data) {
    const { resident_id, pass_code } = data;

    const staff = await staffDao.findById(staffId);
    if (!staff || !staff.is_verified) {
      const err = new Error('Security: Staff is not verified'); err.status = 403; throw err;
    }

    // ── Permanent pass code verification ──────────────────
    if (!staff.pass_code || staff.pass_code !== (pass_code || '').trim().toUpperCase()) {
      const err = new Error('Invalid pass code — entry denied'); err.status = 401; throw err;
    }

    // Prevent double clock-in
    const existing = await staffDao.findActiveAttendance(staffId);
    if (existing) {
      const err = new Error('Staff is already clocked in'); err.status = 409; throw err;
    }

    // resident_id is optional — if missing, auto-lookup from mapping table
    let resolvedResidentId = resident_id ? parseInt(resident_id, 10) : null;
    if (!resolvedResidentId) {
      const mapped = await staffDao.getFirstMappedResident(staffId);
      resolvedResidentId = mapped ? mapped.resident_id : null;
    }

    if (!resolvedResidentId) {
      const err = new Error('No resident association found. This person must be assigned to a resident unit before entry.');
      err.status = 400;
      throw err;
    }

    const result = await staffDao.createAttendance({
      staff_id: staffId, resident_id: resolvedResidentId, check_in_method: 'permanent_pass',
    });

    const attendance = await staffDao.findAttendanceWithDetails(result.insertId);

    // Real-time notification to resident (only if resolved)
    try {
      if (resolvedResidentId) {
        getIO().to(`user:${resolvedResidentId}`).emit('staff:entered', { staff: attendance });
      }
    } catch {}

    return attendance;
  },


  async markStaffExit(attendanceId) {
    const attendance = await staffDao.findActiveAttendanceById(attendanceId);
    if (!attendance) {
      const err = new Error('No active clock-in found'); err.status = 404; throw err;
    }
    await staffDao.markExit(attendanceId);
    const updated = await staffDao.findExitAttendanceWithDetails(attendanceId);
    try { getIO().to(`user:${attendance.resident_id}`).emit('staff:exited', { staff: updated }); } catch {}
    return updated;
  },

  async getStaffInside() {
    return await staffDao.findStaffInside();
  },

  /* ═══════════════════════════════════════════════════════════
     6. ANALYTICS
     ═══════════════════════════════════════════════════════════ */
  async getStaffAttendance(staffId, startDate, endDate) {
    return await staffDao.getAttendance(staffId, startDate, endDate);
  },

  async addStaffReview(staffId, residentId, data) {
    const { rating, review } = data;
    await staffDao.createReview({ staff_id: staffId, resident_id: residentId, rating, review });
    const stats = await staffDao.getAverageRating(staffId);
    await staffDao.updateRating(staffId, stats.avg_rating || 0, stats.total || 0);
    return { success: true };
  },

  async getStaffReviews(staffId) {
    return await staffDao.getReviews(staffId);
  },
};

module.exports = staffService;
