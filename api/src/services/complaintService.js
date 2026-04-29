const complaintDao = require('../dao/complaintDao');
const { getIO } = require('../config/socket');

const complaintService = {
  async create(residentId, data, files) {
    const { title, description, category, priority } = data;

    // Generate complaint number
    const complaint_number = `CMP-${Date.now().toString().slice(-6)}`;

    // Handle multiple image uploads
    let image_urls = null;
    if (files && files.length > 0) {
      image_urls = files.map(file => `/uploads/complaints/${file.filename}`).join(',');
    }

    const result = await complaintDao.create({
      complaint_number,
      resident_id: residentId,
      title,
      description,
      image_urls,
      category,
      priority
    });

    const complaint = await complaintDao.findByIdWithDetails(result.insertId);

    // Emit to management
    try {
      const io = getIO();
      io.emit('complaint:new', complaint);
    } catch (e) { /* socket not initialized */ }

    return complaint;
  },

  async getAll(filters, user) {
    return await complaintDao.findAll({
      role: user.role,
      userId: user.id,
      status: filters.status,
      category: filters.category,
      priority: filters.priority
    });
  },

  async getById(id, user) {
    const complaint = await complaintDao.findByIdFull(id);
    if (!complaint) {
      const error = new Error('Complaint not found');
      error.status = 404;
      throw error;
    }

    // Check authorization for residents
    if (user.role === 'resident' && complaint.resident_id !== user.id) {
      const error = new Error('Not authorized to view this complaint');
      error.status = 403;
      throw error;
    }

    return complaint;
  },

  async updateStatus(id, data) {
    const { status, assigned_to } = data;

    const complaint = await complaintDao.findById(id);
    if (!complaint) {
      const error = new Error('Complaint not found');
      error.status = 404;
      throw error;
    }

    const updates = ['status = ?'];
    const params = [status];

    if (assigned_to) {
      updates.push('assigned_to = ?');
      params.push(assigned_to);
    }

    if (status === 'resolved') {
      updates.push('resolved_at = NOW()');
    }

    await complaintDao.updateStatus(id, updates, params);
    const updated = await complaintDao.findByIdWithDetails(id);

    // Emit to resident
    try {
      const io = getIO();
      io.to(`user:${complaint.resident_id}`).emit('complaint:statusChanged', {
        complaintId: id,
        status,
        complaint: updated
      });
    } catch (e) { /* socket not initialized */ }

    return updated;
  },

  async rate(id, residentId, rating) {
    if (rating < 1 || rating > 5) {
      const error = new Error('Rating must be between 1 and 5');
      error.status = 400;
      throw error;
    }

    const complaint = await complaintDao.findByIdAndResident(id, residentId);
    if (!complaint) {
      const error = new Error('Complaint not found');
      error.status = 404;
      throw error;
    }

    if (complaint.status !== 'resolved') {
      const error = new Error('Can only rate resolved complaints');
      error.status = 400;
      throw error;
    }

    await complaintDao.rate(id, rating);
    const updated = await complaintDao.findById(id);
    return updated;
  },

  async getStats() {
    const overview = await complaintDao.getStats();
    const byCategory = await complaintDao.getStatsByCategory();
    return { overview, byCategory };
  }
};

module.exports = complaintService;
