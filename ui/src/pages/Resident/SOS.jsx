import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert, CircularProgress,
  Grid, Chip, Avatar, Divider, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { locationAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';

export default function SOS() {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    getLocation();
    loadActiveAlerts();
    socketService.onSOSAcknowledged((data) => {
      toast.success(`Help is on the way! Acknowledged by ${data.acknowledged_by_name}`);
      setActiveAlerts((prev) => prev.map((a) => a.id === data.id ? data : a));
    });
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setLocationError('Location access denied. SOS will still alert guards.')
    );
  };

  const loadActiveAlerts = async () => {
    try {
      const res = await locationAPI.getSOSAlerts({ status: 'active' });
      setActiveAlerts(res.data.data.filter((a) => a.triggered_by === user.id));
    } catch { }
  };

  const handleSOS = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const coords = location || { latitude: 0, longitude: 0 };
      const res = await locationAPI.triggerSOS(coords);
      setTriggered(true);
      setActiveAlerts((prev) => [res.data.data, ...prev]);
      setCountdown(30);
      toast.error('🆘 SOS ALERT TRIGGERED! Guards have been notified!', { duration: 5000 });
    } catch {
      toast.error('Failed to trigger SOS. Call 112 immediately!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Toaster position="top-right" />
      <Typography variant="h5" fontWeight={700} gutterBottom>SOS Emergency</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        In case of emergency, trigger an alert to notify all security guards immediately.
      </Typography>

      {/* Location Status */}
      <Alert severity={location ? 'success' : locationError ? 'warning' : 'info'} sx={{ mb: 3, borderRadius: 2 }}
        icon={<LocationOnIcon />}>
        {location
          ? `Location acquired: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
          : locationError || 'Getting your location…'}
      </Alert>

      {/* SOS Button */}
      <Card sx={{ borderRadius: 3, mb: 3, background: triggered ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : 'linear-gradient(135deg, #fff1f2, #ffe4e6)', border: '2px solid #fca5a5' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmberIcon sx={{ fontSize: 48, color: '#ef4444', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>Emergency SOS</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            Press this button ONLY in a real emergency. All security guards will be immediately alerted with your location.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleSOS}
            disabled={loading || countdown > 0}
            sx={{
              bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' },
              width: 160, height: 160, borderRadius: '50%',
              fontSize: '1.4rem', fontWeight: 900, letterSpacing: 1,
              boxShadow: '0 0 0 8px #fca5a540',
              flexDirection: 'column', gap: 0.5,
              '&:disabled': { bgcolor: '#9ca3af' },
            }}
          >
            {loading ? <CircularProgress size={36} color="inherit" /> : (
              <>
                {countdown > 0 ? countdown : 'SOS'}
                {countdown > 0 && <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>wait…</Typography>}
              </>
            )}
          </Button>
          {triggered && (
            <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }} icon={<WarningAmberIcon />}>
              <strong>Alert sent!</strong> Guards have been notified. Stay calm and stay in a safe place.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Safety Tips */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Fire Emergency', tip: 'Activate fire alarm, evacuate building, call 101', color: '#ef4444' },
          { title: 'Medical Emergency', tip: 'Call 108 immediately, do not move the patient', color: '#3b82f6' },
          { title: 'Security Threat', tip: 'Lock doors, trigger SOS, call 100', color: '#8b5cf6' },
          { title: 'Natural Disaster', tip: 'Stay away from windows, go to safe zone', color: '#f59e0b' },
        ].map((tip) => (
          <Grid item xs={12} sm={6} key={tip.title}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${tip.color}30`, bgcolor: `${tip.color}08` }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: tip.color, mb: 0.5 }}>{tip.title}</Typography>
                <Typography variant="body2" color="text.secondary">{tip.tip}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>My Active Alerts</Typography>
            <List disablePadding>
              {activeAlerts.map((alert, i) => (
                <React.Fragment key={alert.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: alert.status === 'resolved' ? '#22c55e' : '#ef4444' }}>
                        {alert.status === 'resolved' ? <CheckCircleIcon /> : <WarningAmberIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography fontWeight={600}>SOS Alert #{alert.id}</Typography>
                        <Chip label={alert.status} size="small"
                          color={alert.status === 'active' ? 'error' : alert.status === 'acknowledged' ? 'warning' : 'success'}
                          sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Box>}
                      secondary={format(new Date(alert.created_at), 'dd MMM yyyy, hh:mm a')}
                    />
                  </ListItem>
                  {i < activeAlerts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}