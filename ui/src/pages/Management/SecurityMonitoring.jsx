import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Avatar,
  List, ListItem, ListItemAvatar, ListItemText, Button,
  Tab, Tabs, LinearProgress, Alert, IconButton,
} from '@mui/material';
import {
  LocationOn, Warning, People, Security, Refresh,
  CheckCircle, DirectionsWalk,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { useNotification } from '../../contexts/NotificationContext';
import { locationAPI, visitorAPI } from '../../services/api';
import socketService from '../../services/socket';
import PageHeader from '../../components/Common/PageHeader';
import { formatDateTime, getDuration } from '../../utils/helpers';

// Fix Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const guardIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const sosIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bangalore

const SecurityMonitoring = () => {
  const { showSnackbar } = useNotification();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [guardLocations, setGuardLocations] = useState([]);
  const [sosAlerts, setSOSAlerts] = useState([]);
  const [visitorsInside, setVisitorsInside] = useState([]);
  const [overstayVisitors, setOverstayVisitors] = useState([]);

  useEffect(() => {
    fetchData();

    // Real-time updates
    socketService.onGuardLocationUpdate((data) => {
      setGuardLocations((prev) => {
        const existing = prev.findIndex((g) => g.guard_id === data.guardId);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], latitude: data.latitude, longitude: data.longitude };
          return updated;
        }
        return prev;
      });
    });

    socketService.onSOSAlert((data) => {
      setSOSAlerts((prev) => [data, ...prev]);
      showSnackbar('🆘 SOS Alert received!', 'error');
    });

    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => {
      clearInterval(interval);
      socketService.removeAllListeners();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [guardsRes, sosRes, insideRes, overstayRes] = await Promise.all([
        locationAPI.getGuardLocations(),
        locationAPI.getSOSAlerts({ status: 'active' }),
        visitorAPI.getInside(),
        visitorAPI.checkOverstay(),
      ]);
      setGuardLocations(guardsRes.data.data);
      setSOSAlerts(sosRes.data.data);
      setVisitorsInside(insideRes.data.data);
      setOverstayVisitors(overstayRes.data.data);
    } catch { }
    finally { setLoading(false); }
  };

  const handleAcknowledgeSOS = async (id) => {
    try {
      await locationAPI.acknowledgeSOS(id);
      setSOSAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'acknowledged' } : a));
      showSnackbar('SOS acknowledged', 'success');
    } catch { showSnackbar('Error acknowledging SOS', 'error'); }
  };

  const handleResolveSOS = async (id) => {
    try {
      await locationAPI.resolveSOS(id);
      setSOSAlerts((prev) => prev.filter((a) => a.id !== id));
      showSnackbar('SOS resolved', 'success');
    } catch { showSnackbar('Error resolving SOS', 'error'); }
  };

  return (
    <>
      <Helmet><title>Security Monitoring</title></Helmet>
      <Box>
        <PageHeader
          title="Security Monitoring"
          subtitle="Live tracking and security overview"
          actions={<Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>}
        />

        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: 'Guards On Duty', value: guardLocations.length, color: 'primary.main', icon: <Security /> },
            { label: 'Visitors Inside', value: visitorsInside.length, color: 'info.main', icon: <People /> },
            { label: 'Overstay Alerts', value: overstayVisitors.length, color: 'warning.main', icon: <Warning /> },
            { label: 'Active SOS', value: sosAlerts.filter(a => a.status === 'active').length, color: 'error.main', icon: <Warning /> },
          ].map((s) => (
            <Grid item xs={6} md={3} key={s.label}>
              <Card sx={{ border: s.color === 'error.main' && s.value > 0 ? '2px solid' : 'none', borderColor: 'error.main' }}>
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: s.color }}>{s.icon}</Box>
                    <Box>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                        {loading ? '—' : s.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* SOS Alerts Banner */}
        {sosAlerts.filter(a => a.status === 'active').length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography fontWeight="bold">
              🆘 {sosAlerts.filter(a => a.status === 'active').length} ACTIVE SOS ALERT(S)
            </Typography>
          </Alert>
        )}

        {/* Main Tabs */}
        <Card>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Guard Map" icon={<LocationOn />} iconPosition="start" />
            <Tab label={`SOS Alerts (${sosAlerts.length})`} icon={<Warning />} iconPosition="start" />
            <Tab label={`Visitors Inside (${visitorsInside.length})`} icon={<People />} iconPosition="start" />
          </Tabs>

          {/* Guard Map Tab */}
          {tabValue === 0 && (
            <Box>
              <Box sx={{ height: 480 }}>
                <MapContainer center={DEFAULT_CENTER} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {guardLocations.map((guard) => (
                    <Marker
                      key={guard.guard_id}
                      position={[guard.latitude, guard.longitude]}
                      icon={guardIcon}
                    >
                      <Popup>
                        <Typography variant="body2" fontWeight="bold">{guard.guard_name}</Typography>
                        <Typography variant="caption">Post: {guard.post}</Typography><br />
                        <Typography variant="caption">
                          Last updated: {formatDateTime(guard.recorded_at)}
                        </Typography>
                      </Popup>
                    </Marker>
                  ))}
                  {sosAlerts.filter(a => a.status === 'active').map((alert) => (
                    <Marker
                      key={alert.id}
                      position={[alert.latitude, alert.longitude]}
                      icon={sosIcon}
                    >
                      <Popup>
                        <Typography variant="body2" fontWeight="bold" color="error">
                          🆘 SOS ALERT
                        </Typography>
                        <Typography variant="caption">By: {alert.triggered_by_name}</Typography><br />
                        <Typography variant="caption">{alert.apartment_number}</Typography>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </Box>
              {loading && <LinearProgress />}
              <Box sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Map updates automatically every 30 seconds. Blue markers = Guards, Red markers = SOS
                </Typography>
              </Box>
            </Box>
          )}

          {/* SOS Alerts Tab */}
          {tabValue === 1 && (
            <Box>
              {loading ? (
                <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
              ) : sosAlerts.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 60, color: 'success.light', mb: 1 }} />
                  <Typography color="text.secondary">No active SOS alerts</Typography>
                </Box>
              ) : (
                <List>
                  {sosAlerts.map((alert) => (
                    <ListItem key={alert.id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alert.status === 'active' ? 'error.main' : 'warning.main' }}>
                          <Warning />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight="bold">{alert.triggered_by_name}</Typography>
                            <Chip label={alert.status} size="small"
                              color={alert.status === 'active' ? 'error' : alert.status === 'acknowledged' ? 'warning' : 'success'} />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              Apt: {alert.apartment_number} · {formatDateTime(alert.created_at)}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Location: {alert.latitude != null ? parseFloat(alert.latitude).toFixed(4) : '—'}, {alert.longitude != null ? parseFloat(alert.longitude).toFixed(4) : '—'}
                            </Typography>
                          </>
                        }
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {alert.status === 'active' && (
                          <Button size="small" variant="contained" color="warning"
                            onClick={() => handleAcknowledgeSOS(alert.id)}>
                            Acknowledge
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button size="small" variant="outlined" color="success"
                            onClick={() => handleResolveSOS(alert.id)}>
                            Resolve
                          </Button>
                        )}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Visitors Inside Tab */}
          {tabValue === 2 && (
            <Box>
              {loading ? (
                <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
              ) : visitorsInside.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <DirectionsWalk sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No visitors inside</Typography>
                </Box>
              ) : (
                <List>
                  {visitorsInside.map((v) => (
                    <ListItem key={v.id} divider>
                      <ListItemAvatar>
                        <Avatar>{v.visitor_name.charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight="bold">{v.visitor_name}</Typography>
                            {v.duration_minutes > 120 && (
                              <Chip label="OVERSTAY" size="small" color="error" icon={<Warning />} />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              Visiting: {v.resident_name} · {v.apartment_number}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Entry: {formatDateTime(v.actual_entry)} · Duration: {getDuration(v.actual_entry)}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Card>
      </Box>
    </>
  );
};

export default SecurityMonitoring;

// Fix missing import
import { CircularProgress } from '@mui/material';