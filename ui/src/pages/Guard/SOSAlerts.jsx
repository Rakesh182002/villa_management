import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Button, Avatar, Chip,
  List, ListItem, ListItemAvatar, ListItemText, Divider, Alert, CircularProgress
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format, formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { locationAPI } from '../../services/api';
import socketService from '../../services/socket';

export default function SOSAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    socketService.onSOSAlert((alert) => {
      setAlerts((prev) => [alert, ...prev]);
      toast.error(`🆘 SOS from ${alert.apartment_number}!`, { duration: 0 });
    });
    socketService.onSOSAcknowledged((data) => {
      setAlerts((prev) => prev.map((a) => a.id === data.id ? { ...a, ...data } : a));
    });
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await locationAPI.getSOSAlerts();
      setAlerts(res.data.data);
    } catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  };

  const handleAcknowledge = async (id) => {
    try {
      await locationAPI.acknowledgeSOS(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'acknowledged' } : a));
      toast.success('SOS acknowledged — respond to location!');
    } catch { toast.error('Failed to acknowledge'); }
  };

  const handleResolve = async (id) => {
    try {
      await locationAPI.resolveSOS(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'resolved' } : a));
      toast.success('SOS resolved');
    } catch { toast.error('Failed to resolve'); }
  };

  const active = alerts.filter((a) => a.status === 'active');

  return (
    <Box>
      <Toaster position="top-right" />
      <Typography variant="h5" fontWeight={700} gutterBottom>SOS Alerts</Typography>

      {active.length > 0 && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 700 }}>
          🆘 {active.length} ACTIVE SOS ALERT{active.length > 1 ? 'S' : ''}! Respond immediately!
        </Alert>
      )}

      {loading ? <Box sx={{ textAlign: 'center', p: 4 }}><CircularProgress /></Box> : (
        <Card sx={{ borderRadius: 2 }}>
          <List disablePadding>
            {alerts.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
                <Typography color="text.secondary">No SOS alerts — all clear!</Typography>
              </Box>
            ) : alerts.map((alert, i) => (
              <React.Fragment key={alert.id}>
                <ListItem sx={{ px: 3, py: 2, bgcolor: alert.status === 'active' ? '#fef2f2' : 'transparent' }}>
                  <ListItemAvatar>
                    <Avatar sx={{
                      bgcolor: alert.status === 'active' ? '#ef4444' : alert.status === 'acknowledged' ? '#f59e0b' : '#22c55e',
                      width: 48, height: 48
                    }}>
                      {alert.status === 'resolved' ? <CheckCircleIcon /> : <WarningAmberIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography fontWeight={700}>{alert.triggered_by_name}</Typography>
                      <Chip label={alert.apartment_number} size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
                      <Chip label={alert.status} size="small"
                        color={alert.status === 'active' ? 'error' : alert.status === 'acknowledged' ? 'warning' : 'success'}
                        sx={{ height: 18, fontSize: '0.65rem', textTransform: 'capitalize' }} />
                    </Box>}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {format(new Date(alert.created_at), 'dd MMM yyyy, hh:mm a')} • {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          📍 {alert.latitude != null ? parseFloat(alert.latitude).toFixed(4) : '—'}, {alert.longitude != null ? parseFloat(alert.longitude).toFixed(4) : '—'}
                        </Typography>
                        {alert.acknowledged_by_name && (
                          <Typography variant="caption" color="success.main" display="block">
                            ✅ Acknowledged by {alert.acknowledged_by_name}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 1 }}>
                    {alert.status === 'active' && (
                      <Button size="small" variant="contained" color="error" onClick={() => handleAcknowledge(alert.id)}
                        sx={{ fontSize: '0.7rem', py: 0.3 }}>
                        Respond
                      </Button>
                    )}
                    {alert.status === 'acknowledged' && (
                      <Button size="small" variant="contained" color="success" onClick={() => handleResolve(alert.id)}
                        sx={{ fontSize: '0.7rem', py: 0.3 }}>
                        Resolve
                      </Button>
                    )}
                  </Box>
                </ListItem>
                {i < alerts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
}