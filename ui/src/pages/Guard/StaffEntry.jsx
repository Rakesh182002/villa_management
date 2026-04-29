import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Avatar, Chip,
  IconButton, Tooltip, Dialog, DialogContent, CircularProgress,
  Stack, Divider, TextField,
} from '@mui/material';
import {
  QrCodeScanner as QrIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  CameraAlt as CameraIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { format, differenceInMinutes } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { staffAPI, getSocket } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const T = {
  primary: '#4f46e5',
  success: '#059669',
  danger: '#dc2626',
  border: '#e2e8f0',
  header: '#f8fafc',
  text: '#1e293b',
  muted: '#64748b',
};

const compactHeader = {
  bgcolor: T.header,
  '& .MuiTableCell-root': {
    fontWeight: 800,
    color: T.muted,
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    py: 1,
    borderBottom: `1px solid ${T.border}`,
  }
};

export default function StaffEntry() {
  const [insideStaff, setInsideStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [staffDetails, setStaffDetails] = useState(null);
  const [scannedData, setScannedData] = useState(null);
  const scannerRef = useRef(null);

  const fetchInside = useCallback(async () => {
    try {
      const r = await staffAPI.getInside();
      setInsideStaff(r.data.data || []);
    } catch { toast.error('Connection error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchInside();
    const socket = getSocket();
    socket.on('staff:entered', fetchInside);
    socket.on('staff:exited', fetchInside);
    return () => { socket.off('staff:entered'); socket.off('staff:exited'); };
  }, [fetchInside]);

  const startScanner = () => {
    setScanning(true);
    setTimeout(() => {
      const s = new Html5QrcodeScanner('staff-entry-qr', { fps: 15, qrbox: 250 }, false);
      s.render(async (text) => {
        s.clear(); setScanning(false);
        try {
          const parsed = JSON.parse(text);
          setScannedData(parsed);
          const all = await staffAPI.getAll();
          const found = all.data.data.find(x => x.id === parsed.staff_id);
          if (found) setStaffDetails({ ...found, resident_id: parsed.resident_id });
          else toast.error('Unknown personnel');
        } catch { toast.error('Invalid QR'); }
      }, () => {});
      scannerRef.current = s;
    }, 100);
  };

  const handleCheckIn = async () => {
    if (!scannedData) return;
    setSubmitting(true);
    try {
      await staffAPI.markEntry(scannedData.staff_id, scannedData.resident_id, scannedData.pass_code);
      toast.success('Done');
      setScanOpen(false); setScannedData(null); setStaffDetails(null);
      fetchInside();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const filtered = insideStaff.filter(s => 
    s.staff_name.toLowerCase().includes(search.toLowerCase()) || 
    s.apartment_number?.toString().includes(search)
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Toaster position="top-center" />

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900} color={T.text}>Staff Log</Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">GATE TERMINAL · LIVE</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button 
            variant="contained" disableElevation startIcon={<QrIcon />}
            onClick={() => setScanOpen(true)}
            sx={{ bgcolor: T.primary, borderRadius: 2, fontWeight: 800, px: 3 }}
          >
            Scan QR
          </Button>
          <IconButton onClick={fetchInside} sx={{ border: `1px solid ${T.border}`, borderRadius: 2 }}><RefreshIcon fontSize="small" /></IconButton>
        </Stack>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${T.border}`, bgcolor: 'white' }}>
            <Typography variant="caption" fontWeight={800} color="text.secondary">WORKING NOW</Typography>
            <Typography variant="h4" fontWeight={900} color={T.success}>{insideStaff.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={9}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden' }}>
            <Box sx={{ p: 1.5, borderBottom: `1px solid ${T.border}`, bgcolor: '#fcfdfe' }}>
              <TextField 
                placeholder="Search..." size="small" fullWidth value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} />, sx: { fontSize: '0.85rem' } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
              />
            </Box>
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader size="small">
                <TableHead sx={compactHeader}>
                  <TableRow>
                    <TableCell>Person</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>In Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress size={20} /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><Typography variant="body2" color="text.disabled">No records</Typography></TableCell></TableRow>
                  ) : filtered.map((s) => (
                    <TableRow key={s.id} hover sx={{ '& td': { py: 0.8, px: 1.5, borderBottom: `1px solid ${T.border}` } }}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar src={s.photo_url} sx={{ width: 28, height: 28, borderRadius: 1, fontSize: '0.7rem', fontWeight: 800 }}>{s.staff_name?.[0]}</Avatar>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>{s.staff_name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>{s.apartment_number || 'Gen'}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: -0.5, fontSize: '0.65rem' }}>{s.resident_name}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{format(new Date(s.society_entry), 'hh:mm a')}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={800} color={T.primary} sx={{ fontSize: '0.8rem' }}>
                          {Math.floor((s.duration_minutes || differenceInMinutes(new Date(), new Date(s.society_entry))) / 60)}h { (s.duration_minutes || differenceInMinutes(new Date(), new Date(s.society_entry))) % 60}m
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" color="error" 
                          onClick={() => { if(window.confirm('Exit?')) staffAPI.markExit(s.id).then(fetchInside); }}
                          sx={{ py: 0, px: 1, minWidth: 0, fontSize: '0.7rem', fontWeight: 800, borderRadius: 1.5 }}
                        >
                          OUT
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={scanOpen} onClose={() => { setScanOpen(false); setScanning(false); }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          {!scanning && !staffDetails && (
            <Box py={1}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>Scan Staff QR</Typography>
              <Button fullWidth variant="contained" disableElevation onClick={startScanner} sx={{ mt: 2, bgcolor: T.primary, borderRadius: 2, fontWeight: 800 }}>Open Camera</Button>
            </Box>
          )}
          {scanning && <Box id="staff-entry-qr" sx={{ width: '100%', borderRadius: 3, overflow: 'hidden' }} />}
          {staffDetails && (
            <Box py={1}>
              <Avatar src={staffDetails.photo_url} sx={{ width: 60, height: 60, mx: 'auto', mb: 2, borderRadius: 2 }} />
              <Typography variant="body1" fontWeight={800}>{staffDetails.full_name}</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={3}>Unit {staffDetails.apartment_number || 'General'}</Typography>
              <Button fullWidth variant="contained" onClick={handleCheckIn} disabled={submitting} sx={{ bgcolor: T.success, borderRadius: 2, fontWeight: 800 }}>Confirm Check-In</Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}