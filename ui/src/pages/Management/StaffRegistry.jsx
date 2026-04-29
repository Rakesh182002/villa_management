import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, Grid, Avatar, Chip, Rating,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Tabs, Tab, Divider, List, ListItem,
  ListItemAvatar, ListItemText, IconButton, Tooltip, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, InputAdornment, Autocomplete,
  Stepper, Step, StepLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
  Phone as PhoneIcon,
  Login as LoginIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  VerifiedUser as VerifiedIcon,
  AssignmentInd as AssignIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  QrCode2 as QrCodeIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { staffAPI, managementAPI, getSocket } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const T = {
  primary: '#2563eb',
  success: '#059669',
  warning: '#f59e0b',
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

const INPUT_STYLE = { 
  '& .MuiOutlinedInput-root': { 
    borderRadius: 2,
    bgcolor: 'white',
    fontSize: '0.85rem',
    '&:hover': { bgcolor: '#f8fafc' },
  } 
};

const STAFF_TYPES = ['maid', 'cook', 'driver', 'gardener', 'security', 'babysitter', 'other'];
const GENDERS = ['male', 'female', 'other'];

export default function StaffRegistry() {
  const [staffList,   setStaffList]   = useState([]);
  const [insideStaff, setInsideStaff] = useState([]);
  const [residents,   setResidents]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState(0);
  const [search,      setSearch]      = useState('');

  const [openAdd, setOpenAdd] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [pendingStaffId, setPendingStaffId] = useState(null);
  const [pendingPassCode, setPendingPassCode] = useState(null);
  const [onboardingOTP, setOnboardingOTP] = useState('');
  const [formData, setFormData] = useState({ 
    full_name: '', phone: '', staff_type: 'maid', gender: 'male', aadhar_number: '', address: '' 
  });
  const [addResident, setAddResident] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [passCodeDialog, setPassCodeDialog] = useState({ open: false, passCode: '', staffName: '', staffId: null });
  const [qrStaff, setQrStaff] = useState(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ 
    full_name: '', phone: '', staff_type: 'maid', gender: 'male', aadhar_number: '', address: '' 
  });

  const [openAssign, setOpenAssign] = useState(false);
  const [targetStaff, setTargetStaff] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const errors = {
    full_name: !formData.full_name,
    phone: !formData.phone || !/^\d{10}$/.test(formData.phone),
    aadhar_number: !formData.aadhar_number || !/^\d{12}$/.test(formData.aadhar_number),
    address: !formData.address,
    resident: !addResident
  };

  const fetchData = useCallback(async () => {
    try {
      const [allRes, insideRes, resRes] = await Promise.all([
        staffAPI.getAll(),
        staffAPI.getInside(),
        managementAPI.getResidents(),
      ]);
      setStaffList(allRes.data.data || []);
      setInsideStaff(insideRes.data.data || []);
      setResidents(resRes.data.data || []);
    } catch { toast.error('Sync error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    socket.on('staff:entered', fetchData);
    socket.on('staff:exited', fetchData);
    return () => { socket.off('staff:entered'); socket.off('staff:exited'); };
  }, [fetchData]);

  const handleOnboardInitiate = async () => {
    setTriedSubmit(true);
    if (Object.values(errors).some(v => v)) return toast.error('Please fix the errors in the form');
    setSubmitting(true);
    const data = new FormData();
    Object.keys(formData).forEach(k => data.append(k, formData[k]));
    if (photo) data.append('photo', photo);
    if (addResident) data.append('resident_id', addResident.id);
    try {
      const res = await staffAPI.add(data);
      setPendingStaffId(res.data.data.staff_id);
      setPendingPassCode(res.data.data.pass_code);
      setActiveStep(1);
    } catch { toast.error('Registration error'); }
    finally { setSubmitting(false); }
  };

  const handleOnboardVerify = async () => {
    setSubmitting(true);
    try {
      await staffAPI.verifyOnboarding(pendingStaffId, onboardingOTP);
      setOpenAdd(false); setActiveStep(0);
      setPassCodeDialog({ open: true, passCode: pendingPassCode, staffName: formData.full_name, staffId: pendingStaffId });
      fetchData();
    } catch { toast.error('Invalid OTP'); }
    finally { setSubmitting(false); }
  };

  const handleEditSave = async () => {
    setSubmitting(true);
    const fd = new FormData();
    Object.keys(editForm).forEach(k => fd.append(k, editForm[k]));
    try {
      await staffAPI.update(editTarget.id, fd);
      toast.success('Updated'); setOpenEdit(false); fetchData();
    } catch { toast.error('Update failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove?')) return;
    try { await staffAPI.delete(id); fetchData(); } catch { toast.error('Error'); }
  };

  const filtered = staffList.filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search));
  const insideIds = new Set(insideStaff.map(s => s.staff_id));

  return (
    <Box sx={{ p: { xs: 1, sm: 4 }, bgcolor: '#f1f5f9', minHeight: '100vh' }}>
      <Toaster position="top-right" />

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900} color={T.text}>Registry</Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">ADMIN PANEL</Typography>
        </Box>
        <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => { setOpenAdd(true); setActiveStep(0); }} sx={{ bgcolor: T.primary, borderRadius: 2, fontWeight: 800 }}>Register</Button>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: `1px solid ${T.border}`, '& .MuiTab-root': { fontWeight: 800, fontSize: '0.8rem' } }}>
          <Tab label="ROSTER" />
          <Tab label={`ON-SITE (${insideStaff.length})`} />
        </Tabs>

        <Box sx={{ p: 1.5, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 1.5 }}>
          <TextField 
            fullWidth size="small" placeholder="Search..." value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
            sx={INPUT_STYLE}
          />
        </Box>

        <TableContainer sx={{ maxHeight: '75vh' }}>
          <Table stickyHeader size="small">
            <TableHead sx={compactHeader}>
              <TableRow>
                <TableCell>Person</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress size={20} /></TableCell></TableRow>
              ) : (tab === 0 ? filtered : insideStaff).map((s) => {
                const id = s.staff_id || s.id;
                const name = s.staff_name || s.full_name;
                const isInside = insideIds.has(id);
                return (
                  <TableRow key={id} hover sx={{ '& td': { py: 0.8, px: 1.5, borderBottom: `1px solid ${T.border}` } }}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={s.photo_url} sx={{ width: 30, height: 30, borderRadius: 1.5, fontSize: '0.8rem' }}>{name?.[0]}</Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>{name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{s.phone || `Unit ${s.apartment_number}`}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell><Chip label={s.staff_type} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: isInside ? T.success : '#cbd5e1' }} />
                        <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.65rem' }}>{isInside ? 'INSIDE' : 'OUT'}</Typography>
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
                        <IconButton size="small" onClick={() => setQrStaff(s)}><QrCodeIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => { setEditTarget(s); setEditForm({...s}); setOpenEdit(true); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Register Dialog */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>New Registration</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {activeStep === 0 ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sx={{ textAlign: 'center', mb: 1 }}>
                <Avatar src={photoPreview} sx={{ width: 70, height: 70, mx: 'auto', borderRadius: 2, mb: 1 }} />
                <Button component="label" size="small">Upload Photo<input type="file" hidden onChange={e => { const f = e.target.files[0]; if(f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)); } }} /></Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth label="Full Name" size="small" 
                  value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} 
                  error={triedSubmit && errors.full_name}
                  helperText={triedSubmit && errors.full_name && "Name is required"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth label="Phone" size="small" 
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
                  error={triedSubmit && errors.phone}
                  helperText={triedSubmit && errors.phone && "Valid 10-digit phone required"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Gender</InputLabel>
                  <Select label="Gender" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                    {GENDERS.map(g => <MenuItem key={g} value={g}>{g.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select label="Role" value={formData.staff_type} onChange={e => setFormData({...formData, staff_type: e.target.value})}>
                    {STAFF_TYPES.map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth label="Aadhar Number" size="small" 
                  value={formData.aadhar_number} onChange={e => setFormData({...formData, aadhar_number: e.target.value})} 
                  error={triedSubmit && errors.aadhar_number}
                  helperText={triedSubmit && errors.aadhar_number && "Valid 12-digit Aadhar required"}
                />
              </Grid>
              <Grid item xs={12} >
                <Autocomplete
                  size="small"
                  options={residents}
                  getOptionLabel={(option) => `${option.full_name} (${option.apartment_number})`}
                  value={addResident}
                  onChange={(_, val) => setAddResident(val)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} label="Assign to Resident" 
                      error={triedSubmit && errors.resident}
                      helperText={triedSubmit && errors.resident && "Please select a resident"}
                    />
                  )}
                  sx={INPUT_STYLE}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth multiline rows={2} label="Current Address" size="small" 
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} 
                  error={triedSubmit && errors.address}
                  helperText={triedSubmit && errors.address && "Current address is required"}
                />
              </Grid>
              <Grid item xs={12}><Button fullWidth variant="contained" disableElevation onClick={handleOnboardInitiate} disabled={submitting} sx={{ bgcolor: T.primary, py: 1.5, fontWeight: 800 }}>Initiate Onboarding</Button></Grid>
            </Grid>
          ) : (
            <Box textAlign="center" py={2}>
              <Typography variant="body2" mb={2}>Verify identity with OTP sent to {formData.phone}</Typography>
              <TextField fullWidth placeholder="OTP" size="small" value={onboardingOTP} onChange={e => setOnboardingOTP(e.target.value)} inputProps={{ style: { textAlign: 'center', fontSize: '1.2rem', fontWeight: 800 } }} />
              <Button fullWidth variant="contained" disableElevation sx={{ mt: 3, bgcolor: T.success, py: 1.5, fontWeight: 800 }} onClick={handleOnboardVerify}>Finalize Registration</Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Profile</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Full Name" size="small" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Phone" size="small" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select label="Gender" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                  {GENDERS.map(g => <MenuItem key={g} value={g}>{g.toUpperCase()}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select label="Role" value={editForm.staff_type} onChange={e => setEditForm({...editForm, staff_type: e.target.value})}>
                  {STAFF_TYPES.map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Aadhar Number" size="small" value={editForm.aadhar_number} onChange={e => setEditForm({...editForm, aadhar_number: e.target.value})} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Address" size="small" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}><Button onClick={() => setOpenEdit(false)}>Cancel</Button><Button variant="contained" disableElevation onClick={handleEditSave} sx={{ bgcolor: T.primary }}>Save Changes</Button></DialogActions>
      </Dialog>

      <Dialog open={!!qrStaff} onClose={() => setQrStaff(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 4, mb: 3 }}>
            <QRCodeSVG value={JSON.stringify({ staff_id: qrStaff?.id, pass_code: qrStaff?.pass_code, name: qrStaff?.full_name })} size={180} />
          </Box>
          <Typography variant="body2" fontWeight={800}>{qrStaff?.full_name}</Typography>
          <Typography variant="caption" color="text.secondary">Permanent Gate Pass</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
