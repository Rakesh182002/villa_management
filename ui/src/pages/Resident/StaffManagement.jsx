import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, Avatar, Chip, Rating,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Tabs, Tab, Divider, List, ListItem,
  ListItemAvatar, ListItemText, IconButton, Tooltip, Paper, Stack,
  Grid, FormControl, InputLabel, Select, MenuItem, Stepper, Step, StepLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Star as StarIcon,
  Phone as PhoneIcon,
  CloudUpload as UploadIcon,
  QrCode2 as QrCodeIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { format, differenceInMinutes } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { staffAPI, getSocket } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const T = {
  primary: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
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

const STAFF_TYPES = ['maid', 'cook', 'driver', 'gardener', 'security', 'babysitter', 'other'];
const GENDERS = ['male', 'female', 'other'];

export default function StaffManagement() {
  const { user } = useAuth();
  const [myStaff, setMyStaff] = useState([]);
  const [insideStaff, setInsideStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState(0);
  const [pendingId, setPendingId] = useState(null);
  const [pendingPassCode, setPendingPassCode] = useState(null);
  const [addOTP, setAddOTP] = useState('');
  const [addForm, setAddForm] = useState({ 
    full_name: '', phone: '', staff_type: 'maid', gender: 'male', aadhar_number: '', address: '' 
  });
  const [addPhoto, setAddPhoto] = useState(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState(null);

  const [passCodeDialog, setPassCodeDialog] = useState({ open: false, passCode: '', staffName: '', staffId: null });
  const [qrStaff, setQrStaff] = useState(null);
  const [attOpen, setAttOpen] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [ratingVal, setRatingVal] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const errors = {
    full_name: !addForm.full_name,
    phone: !addForm.phone || !/^\d{10}$/.test(addForm.phone),
    aadhar_number: !addForm.aadhar_number || !/^\d{12}$/.test(addForm.aadhar_number),
    address: !addForm.address,
  };

  const fetchData = useCallback(async () => {
    try {
      const [myRes, insideRes] = await Promise.all([
        staffAPI.getMyStaff(),
        staffAPI.getInside(),
      ]);
      setMyStaff(myRes.data.data || []);
      setInsideStaff(insideRes.data.data || []);
    } catch { toast.error('Connection error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    socket.on('staff:entered', fetchData);
    socket.on('staff:exited', fetchData);
    return () => { socket.off('staff:entered'); socket.off('staff:exited'); };
  }, [fetchData]);

  const handleAddInitiate = async () => {
    setTriedSubmit(true);
    if (Object.values(errors).some(v => v)) return toast.error('Please fix form errors');
    setSubmitting(true);
    const fd = new FormData();
    Object.keys(addForm).forEach(k => fd.append(k, addForm[k]));
    if (addPhoto) fd.append('photo', addPhoto);
    if (user?.id) fd.append('resident_id', user.id);
    try {
      const res = await staffAPI.add(fd);
      setPendingId(res.data.data.staff_id);
      setPendingPassCode(res.data.data.pass_code);
      setAddStep(1);
    } catch { toast.error('Error initiating registration'); }
    finally { setSubmitting(false); }
  };

  const handleAddVerify = async () => {
    setSubmitting(true);
    try {
      await staffAPI.verifyOnboarding(pendingId, addOTP);
      setAddOpen(false); setAddStep(0);
      setPassCodeDialog({ open: true, passCode: pendingPassCode, staffName: addForm.full_name, staffId: pendingId });
      fetchData();
    } catch { toast.error('Invalid OTP'); }
    finally { setSubmitting(false); }
  };

  const openAtt = async (s) => {
    setSelectedStaff(s); setAttOpen(true);
    try { const r = await staffAPI.getAttendance(s.id); setAttendance(r.data.data); } catch {}
  };

  const openReview = async (s) => {
    setSelectedStaff(s); setReviewOpen(true);
    try { const r = await staffAPI.getReviews(s.id); setReviews(r.data.data); } catch {}
  };

  const submitReview = async () => {
    try {
      await staffAPI.addReview(selectedStaff.id, { rating: ratingVal, review: reviewText });
      toast.success('Feedback saved'); setRatingVal(0); setReviewText('');
      const r = await staffAPI.getReviews(selectedStaff.id); setReviews(r.data.data);
      fetchData();
    } catch { toast.error('Error saving review'); }
  };

  const insideIds = new Set(insideStaff.map(s => s.staff_id));

  return (
    <Box sx={{ p: { xs: 1, sm: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Toaster position="top-right" />

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={900} color={T.text}>My Staff</Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">HOUSEHOLD MANAGEMENT</Typography>
        </Box>
        <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ bgcolor: T.primary, borderRadius: 2, fontWeight: 800 }}>Add Staff</Button>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={compactHeader}>
              <TableRow>
                <TableCell>Person</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress size={20} /></TableCell></TableRow>
              ) : myStaff.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><Typography variant="body2" color="text.disabled">No staff registered</Typography></TableCell></TableRow>
              ) : myStaff.map((s) => (
                <TableRow key={s.id} hover sx={{ '& td': { py: 1, borderBottom: `1px solid ${T.border}` } }}>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar src={s.photo_url} sx={{ width: 32, height: 32, borderRadius: 1.5, fontSize: '0.8rem' }}>{s.full_name[0]}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{s.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{s.phone}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell><Chip label={s.staff_type} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} /></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: insideIds.has(s.id) ? T.success : T.muted }} />
                      <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.65rem' }}>{insideIds.has(s.id) ? 'INSIDE' : 'OUT'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.3} alignItems="center">
                      <StarIcon sx={{ fontSize: 14, color: T.warning }} />
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>{parseFloat(s.average_rating || 0).toFixed(1)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Pass"><IconButton size="small" onClick={() => setQrStaff(s)}><QrCodeIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="History"><IconButton size="small" onClick={() => openAtt(s)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Rate"><IconButton size="small" onClick={() => openReview(s)}><StarIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Remove"><IconButton size="small" color="error" onClick={() => { if(window.confirm('Remove?')) staffAPI.unassign(s.id).then(fetchData); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>New Staff Registration</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {addStep === 0 ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sx={{ textAlign: 'center', mb: 1 }}>
                <Avatar src={addPhotoPreview} sx={{ width: 70, height: 70, mx: 'auto', borderRadius: 2, mb: 1 }} />
                <Button component="label" size="small">Upload Photo<input type="file" hidden onChange={e => { const f = e.target.files[0]; if(f) { setAddPhoto(f); setAddPhotoPreview(URL.createObjectURL(f)); } }} /></Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth label="Full Name" size="small" 
                  value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} 
                  error={triedSubmit && errors.full_name}
                  helperText={triedSubmit && errors.full_name && "Name required"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth label="Phone" size="small" 
                  value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} 
                  error={triedSubmit && errors.phone}
                  helperText={triedSubmit && errors.phone && "10-digit number required"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Gender</InputLabel>
                  <Select label="Gender" value={addForm.gender} onChange={e => setAddForm({...addForm, gender: e.target.value})}>
                    {GENDERS.map(g => <MenuItem key={g} value={g}>{g.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select label="Role" value={addForm.staff_type} onChange={e => setAddForm({...addForm, staff_type: e.target.value})}>
                    {STAFF_TYPES.map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth label="Aadhar Number" size="small" 
                  value={addForm.aadhar_number} onChange={e => setAddForm({...addForm, aadhar_number: e.target.value})} 
                  error={triedSubmit && errors.aadhar_number}
                  helperText={triedSubmit && errors.aadhar_number && "12-digit Aadhar required"}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth multiline rows={2} label="Current Address" size="small" 
                  value={addForm.address} onChange={e => setAddForm({...addForm, address: e.target.value})} 
                  error={triedSubmit && errors.address}
                  helperText={triedSubmit && errors.address && "Address is required"}
                />
              </Grid>
              <Grid item xs={12}><Button fullWidth variant="contained" disableElevation onClick={handleAddInitiate} disabled={submitting} sx={{ bgcolor: T.primary, py: 1.5, fontWeight: 800 }}>Initiate Registration</Button></Grid>
            </Grid>
          ) : (
            <Box textAlign="center" py={2}>
              <Typography variant="body2" mb={2}>Enter OTP sent to {addForm.phone}</Typography>
              <TextField fullWidth placeholder="OTP" size="small" value={addOTP} onChange={e => setAddOTP(e.target.value)} inputProps={{ style: { textAlign: 'center', fontSize: '1.2rem', fontWeight: 800 } }} />
              <Button fullWidth variant="contained" disableElevation sx={{ mt: 3, bgcolor: T.success, py: 1.5, fontWeight: 800 }} onClick={handleAddVerify}>Finalize Registration</Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrStaff} onClose={() => setQrStaff(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 4, mb: 3 }}>
            <QRCodeSVG value={JSON.stringify({ staff_id: qrStaff?.id, pass_code: qrStaff?.pass_code, name: qrStaff?.full_name })} size={180} />
          </Box>
          <Typography variant="body2" fontWeight={800}>{qrStaff?.full_name}</Typography>
          <Typography variant="caption" color="text.secondary">Gate Entry Pass</Typography>
        </DialogContent>
      </Dialog>

      <Dialog open={attOpen} onClose={() => setAttOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Attendance Logs</DialogTitle>
        <DialogContent>
          <List dense>
            {attendance.map((a, i) => (
              <ListItem key={i} divider sx={{ px: 0 }}>
                <ListItemText 
                  primary={format(new Date(a.date), 'MMM dd')} 
                  secondary={`${format(new Date(a.society_entry), 'hh:mm a')} - ${a.society_exit ? format(new Date(a.society_exit), 'hh:mm a') : 'Inside'}`} 
                  primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}