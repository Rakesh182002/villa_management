// LiveLocation.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, Chip } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import toast, { Toaster } from 'react-hot-toast';
import { locationAPI } from '../../services/api';
import socketService from '../../services/socket';

export default function LiveLocation() {
  const [sharing, setSharing] = useState(false);
  const [location, setLocation] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => { return () => clearInterval(intervalRef.current); }, []);

  const shareLocation = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setLocation(coords);
      setUpdateCount((c) => c + 1);
      try {
        await locationAPI.updateLocation(coords);
        socketService.updateLocation(coords);
      } catch {}
    });
  };

  const toggleSharing = () => {
    if (sharing) {
      clearInterval(intervalRef.current);
      setSharing(false);
      toast('Location sharing stopped', { icon: '📍' });
    } else {
      if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
      shareLocation();
      intervalRef.current = setInterval(shareLocation, 30000);
      setSharing(true);
      toast.success('Sharing location every 30 seconds');
    }
  };

  return (
    <Box>
      <Toaster position="top-right" />
      <Typography variant="h5" fontWeight={700} gutterBottom>Live Location Sharing</Typography>
      <Card sx={{ borderRadius: 3, textAlign: 'center' }}>
        <CardContent sx={{ py: 6 }}>
          <Box sx={{
            width: 120, height: 120, borderRadius: '50%', mx: 'auto', mb: 3,
            bgcolor: sharing ? '#f0fdf4' : '#f9fafb',
            border: `3px solid ${sharing ? '#22c55e' : '#e5e7eb'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: sharing ? '0 0 0 12px #22c55e20' : 'none',
            transition: 'all 0.3s',
          }}>
            <LocationOnIcon sx={{ fontSize: 48, color: sharing ? '#22c55e' : '#9ca3af' }} />
          </Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {sharing ? 'Sharing Location...' : 'Location Sharing Off'}
          </Typography>
          {location && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </Typography>
          )}
          {sharing && (
            <Chip label={`Updated ${updateCount} times`} color="success" size="small" sx={{ mb: 2 }} />
          )}
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2, textAlign: 'left' }}>
            Your location is shared with management every 30 seconds during patrol.
          </Alert>
          <Button variant="contained" size="large" onClick={toggleSharing}
            color={sharing ? 'error' : 'success'}
            sx={{ borderRadius: 2, px: 4 }}>
            {sharing ? 'Stop Sharing' : 'Start Sharing'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}