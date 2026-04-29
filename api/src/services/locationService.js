const locationDao = require('../dao/locationDao');
const { getIO } = require('../config/socket');

const locationService = {
  async updateLocation(guardId, data) {
    const { latitude, longitude, is_sos } = data;

    await locationDao.addLocation({
      guard_id: guardId,
      latitude,
      longitude,
      is_sos
    });

    // Emit to management and other guards
    try {
      const io = getIO();
      io.emit('location:guardUpdate', {
        guardId,
        latitude,
        longitude,
        timestamp: new Date()
      });
    } catch (e) { /* socket not initialized */ }
  },

  async getGuardLocations() {
    return await locationDao.getLatestGuardLocations();
  },

  async getLocationHistory(filters) {
    return await locationDao.getHistory(filters);
  },

  async triggerSOS(userId, data) {
    const { latitude, longitude } = data;

    const result = await locationDao.createSOS({
      triggered_by: userId,
      latitude,
      longitude
    });

    const alert = await locationDao.findSOSWithUser(result.insertId);

    // Emit to all guards and management
    try {
      const io = getIO();
      io.emit('sos:alert', {
        ...alert,
        timestamp: new Date()
      });
    } catch (e) { /* socket not initialized */ }

    return alert;
  },

  async acknowledgeSOS(id, guardId) {
    const alert = await locationDao.findActiveSOSById(id);
    if (!alert) {
      const error = new Error('Active SOS alert not found');
      error.status = 404;
      throw error;
    }

    await locationDao.acknowledgeSOS(id, guardId);
    const updated = await locationDao.findSOSWithAcknowledgement(id);

    // Emit acknowledgment
    try {
      const io = getIO();
      io.emit('sos:acknowledged', updated);
    } catch (e) { /* socket not initialized */ }

    return updated;
  },

  async resolveSOS(id) {
    const alert = await locationDao.findSOSById(id);
    if (!alert) {
      const error = new Error('SOS alert not found');
      error.status = 404;
      throw error;
    }

    await locationDao.resolveSOS(id);
    const updated = await locationDao.findSOSById(id);
    return updated;
  },

  async getSOSAlerts(status) {
    return await locationDao.getSOSAlerts(status);
  }
};

module.exports = locationService;
