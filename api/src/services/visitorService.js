const QRCode = require('qrcode');
const visitorDao = require('../dao/visitorDao');
const { getIO } = require('../config/socket');

const visitorService = {
  async createVisitorRequest(residentId, data) {
    const { visitor_name, visitor_phone, vehicle_number, purpose, expected_arrival } = data;

    // Generate unique code
    const unique_code = `V${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`;

    // Generate QR code
    const qr_code = await QRCode.toDataURL(JSON.stringify({
      code: unique_code,
      visitor: visitor_name,
      resident_id: residentId,
      timestamp: Date.now()
    }));

    const result = await visitorDao.create({
      resident_id: residentId,
      visitor_name,
      visitor_phone,
      vehicle_number,
      unique_code,
      qr_code,
      purpose,
      expected_arrival
    });

    const visitor = await visitorDao.findById(result.insertId);
    return visitor;
  },

  async getVisitorRequests(residentId) {
    return await visitorDao.findByResident(residentId);
  },

  async getPendingVisitors() {
    return await visitorDao.findPending();
  },

  async verifyVisitor(uniqueCode) {
    const visitor = await visitorDao.findByUniqueCode(uniqueCode);
    if (!visitor) {
      const error = new Error('Visitor not found or invalid code');
      error.status = 404;
      throw error;
    }
    return visitor;
  },

  async updateVisitorStatus(id, residentId, status) {
    const visitor = await visitorDao.findByIdAndResident(id, residentId);
    if (!visitor) {
      const error = new Error('Visitor request not found');
      error.status = 404;
      throw error;
    }

    await visitorDao.updateStatus(id, status);
    const updated = await visitorDao.findById(id);

    // Emit real-time update to guards
    try {
      const io = getIO();
      io.emit('visitor:statusUpdate', {
        visitorId: id,
        status,
        visitor: updated
      });
    } catch (e) { /* socket not initialized */ }

    return updated;
  },

  async markVisitorEntry(id) {
    const visitor = await visitorDao.findById(id);
    if (!visitor) {
      const error = new Error('Visitor not found');
      error.status = 404;
      throw error;
    }

    if (visitor.status !== 'approved') {
      const error = new Error('Visitor not approved for entry');
      error.status = 400;
      throw error;
    }

    await visitorDao.markEntry(id);
    const updated = await visitorDao.findById(id);

    // Emit real-time notification to resident
    try {
      const io = getIO();
      io.to(`user:${visitor.resident_id}`).emit('visitor:entered', { visitor: updated });
    } catch (e) { /* socket not initialized */ }

    return updated;
  },

  async markVisitorExit(id) {
    const visitor = await visitorDao.findById(id);
    if (!visitor) {
      const error = new Error('Visitor not found');
      error.status = 404;
      throw error;
    }

    await visitorDao.markExit(id);
    const updated = await visitorDao.findById(id);

    // Emit real-time notification to resident
    try {
      const io = getIO();
      io.to(`user:${visitor.resident_id}`).emit('visitor:exited', { visitor: updated });
    } catch (e) { /* socket not initialized */ }

    return updated;
  },

  async getVisitorsInside() {
    return await visitorDao.findInside();
  },

  async checkOverstay() {
    const overstayLimit = 120; // 2 hours in minutes
    const visitors = await visitorDao.findOverstay(overstayLimit);

    // Send alerts for new overstays
    try {
      const io = getIO();
      for (const visitor of visitors) {
        if (!visitor.overstay_alert_sent) {
          await visitorDao.markOverstayAlertSent(visitor.id);
          io.emit('visitor:overstayAlert', {
            visitor,
            duration_minutes: visitor.duration_minutes
          });
        }
      }
    } catch (e) { /* socket not initialized */ }

    return visitors;
  }
};

module.exports = visitorService;
