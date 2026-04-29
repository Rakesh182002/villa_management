const locationService = require('../services/locationService');
const logger = require('../utils/Logger');

// @desc    Update guard location
// @route   POST /api/location/update
// @access  Private (Guard)
const updateLocation = async (req, res) => {
  try {
    await locationService.updateLocation(req.userId, req.body);
    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    logger.error('Update location error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error updating location'
    });
  }
};

// @desc    Get all guard locations
// @route   GET /api/location/guards
// @access  Private (Management, Guard)
const getGuardLocations = async (req, res) => {
  try {
    const locations = await locationService.getGuardLocations();
    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    logger.error('Get guard locations error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching guard locations'
    });
  }
};

// @desc    Get location history
// @route   GET /api/location/history
// @access  Private (Management)
const getLocationHistory = async (req, res) => {
  try {
    const history = await locationService.getLocationHistory(req.query);
    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    logger.error('Get location history error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching location history'
    });
  }
};

// @desc    Trigger SOS alert
// @route   POST /api/location/sos
// @access  Private (Resident, Guard)
const triggerSOS = async (req, res) => {
  try {
    const alert = await locationService.triggerSOS(req.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'SOS alert triggered',
      data: alert
    });
  } catch (error) {
    logger.error('Trigger SOS error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error triggering SOS'
    });
  }
};

// @desc    Acknowledge SOS alert
// @route   PUT /api/location/sos/:id/acknowledge
// @access  Private (Guard)
const acknowledgeSOS = async (req, res) => {
  try {
    const updated = await locationService.acknowledgeSOS(req.params.id, req.userId);
    res.json({
      success: true,
      message: 'SOS alert acknowledged',
      data: updated
    });
  } catch (error) {
    logger.error('Acknowledge SOS error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error acknowledging SOS'
    });
  }
};

// @desc    Resolve SOS alert
// @route   PUT /api/location/sos/:id/resolve
// @access  Private (Guard)
const resolveSOS = async (req, res) => {
  try {
    const updated = await locationService.resolveSOS(req.params.id);
    res.json({
      success: true,
      message: 'SOS alert resolved',
      data: updated
    });
  } catch (error) {
    logger.error('Resolve SOS error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error resolving SOS'
    });
  }
};

// @desc    Get all SOS alerts
// @route   GET /api/location/sos
// @access  Private (Guard, Management)
const getSOSAlerts = async (req, res) => {
  try {
    const alerts = await locationService.getSOSAlerts(req.query.status);
    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    logger.error('Get SOS alerts error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error fetching SOS alerts'
    });
  }
};

module.exports = { updateLocation, getGuardLocations, getLocationHistory, triggerSOS, acknowledgeSOS, resolveSOS, getSOSAlerts };