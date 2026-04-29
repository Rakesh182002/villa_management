import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Avatar, Chip,
  List, ListItem, ListItemAvatar, ListItemText, CircularProgress,
  Divider, Alert, Badge
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { visitorAPI, staffAPI, locationAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';

export default function GuardDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [staffInside, setStaffInside] = useState([]);
  const [sosAlerts, setSOSAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationInterval, setLocationInterval] = useState(null);

  useEffect(() => {
    loadDashboardData();
    socketService.onSOSAlert((alert) => {
      setSOSAlerts((prev) => [alert, ...prev]);
      toast.error(`🆘 SOS from ${alert.apartment_number}!`, { duration: 0 });
    });
    socketService.onVisitorStatusUpdate(() => loadVisitors());
  }, []);

  useEffect(() => { return () => locationInterval && clearInterval(locationInterval); }, [locationInterval]);

  const loadDashboardData = async () => {
    try {
      const [vRes, sRes, sosRes] = await Promise.all([
        visitorAPI.getInside(), staffAPI.getInside(), locationAPI.getSOSAlerts({ status: 'active' })
      ]);
      setVisitors(vRes.data.data);
      setStaffInside(sRes.data.data);
      setSOSAlerts(sosRes.data.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const loadVisitors = async () => {
    const res = await visitorAPI.getInside();
    setVisitors(res.data.data);
  };

  const toggleLocationSharing = () => {
    if (locationSharing) {
      clearInterval(locationInterval);
      setLocationInterval(null);
      setLocationSharing(false);
      toast('Location sharing stopped', { icon: '📍' });
    } else {
      if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
      const shareLocation = () => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            await locationAPI.updateLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            socketService.updateLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          } catch {}
        });
      };
      shareLocation();
      const interval = setInterval(shareLocation, 30000);
      setLocationInterval(interval);
      setLocationSharing(true);
      toast.success('Location sharing started (every 30s)');
    }
  };

  const handleAcknowledgeSOS = async (alertId) => {
    try {
      await locationAPI.acknowledgeSOS(alertId);
      setSOSAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, status: 'acknowledged' } : a));
      toast.success('SOS acknowledged');
    } catch { toast.error('Failed to acknowledge'); }
  };

  const stats = [
    { label: 'Visitors Inside', value: visitors.length, color: '#3b82f6', bg: '#eff6ff', icon: <PeopleIcon />, action: () => navigate('/guard/visitor-entry') },
    { label: 'Staff Inside', value: staffInside.length, color: '#22c55e', bg: '#f0fdf4', icon: <PersonAddIcon />, action: () => navigate('/guard/staff-entry') },
    { label: 'Active SOS', value: sosAlerts.filter(a => a.status === 'active').length, color: '#ef4444', bg: '#fef2f2', icon: <WarningAmberIcon />, action: () => navigate('/guard/sos-alerts') },
  ];

  return (
    <Box>
      <Toaster position="top-right" />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Guard Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Post: {user?.apartment_number} • {format(new Date(), 'EEEE, dd MMM yyyy')}</Typography>
        </Box>
        <Button
          variant={locationSharing ? 'contained' : 'outlined'}
          color={locationSharing ? 'success' : 'primary'}
          startIcon={<LocationOnIcon />}
          onClick={toggleLocationSharing}
          sx={{ borderRadius: 2 }}
        >
          {locationSharing ? 'Sharing Location' : 'Start Location'}
        </Button>
      </Box>

      {sosAlerts.filter(a => a.status === 'active').length > 0 && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }} icon={<WarningAmberIcon />}>
          🆘 {sosAlerts.filter(a => a.status === 'active').length} active SOS alert(s)! Respond immediately.
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Card sx={{ borderRadius: 2, bgcolor: s.bg, border: 'none', boxShadow: 0, cursor: 'pointer', transition: '0.2s', '&:hover': { boxShadow: 2 } }}
              onClick={s.action}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, '&:last-child': { pb: 2 } }}>
                <Avatar sx={{ bgcolor: `${s.color}20`, color: s.color }}>{s.icon}</Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Scan QR Code', icon: <QrCodeScannerIcon />, path: '/guard/qr-scanner', color: '#3b82f6' },
          { label: 'Visitor Entry', icon: <PeopleIcon />, path: '/guard/visitor-entry', color: '#22c55e' },
          { label: 'Staff Entry', icon: <PersonAddIcon />, path: '/guard/staff-entry', color: '#8b5cf6' },
          { label: 'SOS Alerts', icon: <WarningAmberIcon />, path: '/guard/sos-alerts', color: '#ef4444' },
        ].map((a) => (
          <Grid item xs={6} sm={3} key={a.label}>
            <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}
              onClick={() => navigate(a.path)}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Avatar sx={{ bgcolor: `${a.color}15`, color: a.color, mx: 'auto', mb: 1, width: 48, height: 48 }}>
                  {a.icon}
                </Avatar>
                <Typography variant="body2" fontWeight={600} color="text.secondary">{a.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {/* Visitors Inside */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Visitors Inside</Typography>
              {loading ? <CircularProgress size={24} /> : visitors.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No visitors currently inside</Typography>
              ) : (
                <List disablePadding dense>
                  {visitors.slice(0, 5).map((v, i) => (
                    <React.Fragment key={v.id}>
                      <ListItem disablePadding sx={{ py: 0.5 }}>
                        <ListItemAvatar><Avatar sx={{ width: 32, height: 32, bgcolor: '#eff6ff', color: '#3b82f6', fontSize: '0.75rem' }}>{v.visitor_name[0]}</Avatar></ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>{v.visitor_name}</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">
                            {v.apartment_number} • {v.duration_minutes}m inside
                            {v.duration_minutes > 120 && <Chip label="OVERSTAY" size="small" color="error" sx={{ ml: 0.5, height: 14, fontSize: '0.6rem' }} />}
                          </Typography>}
                        />
                      </ListItem>
                      {i < visitors.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* SOS Alerts */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>SOS Alerts</Typography>
              {sosAlerts.length === 0 ? (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">No active SOS alerts</Typography>
                </Box>
              ) : (
                <List disablePadding dense>
                  {sosAlerts.map((alert, i) => (
                    <React.Fragment key={alert.id}>
                      <ListItem disablePadding sx={{ py: 0.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: alert.status === 'active' ? '#fef2f2' : '#f0fdf4', color: alert.status === 'active' ? '#ef4444' : '#22c55e' }}>
                            <WarningAmberIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>{alert.triggered_by_name}</Typography>}
                          secondary={<Typography variant="caption">{alert.apartment_number} • {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</Typography>}
                        />
                        {alert.status === 'active' && (
                          <Button size="small" variant="contained" color="error" sx={{ minWidth: 80, height: 26, fontSize: '0.7rem' }}
                            onClick={() => handleAcknowledgeSOS(alert.id)}>
                            Respond
                          </Button>
                        )}
                        {alert.status === 'acknowledged' && <Chip label="Responded" size="small" color="warning" sx={{ height: 20 }} />}
                      </ListItem>
                      {i < sosAlerts.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}