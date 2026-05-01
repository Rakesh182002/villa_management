import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Tooltip, CircularProgress, Tabs, Tab,
  Divider, Alert, InputAdornment, Switch, FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { QRCodeSVG } from 'qrcode.react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { visitorAPI } from '../../services/api';
import socketService from '../../services/socket';
import pdfService from '../../services/pdf';
import { useAuth } from '../../contexts/AuthContext';

const statusColors = {
  pending: 'warning', approved: 'success', denied: 'error',
  entered: 'info', exited: 'default',
};

const purposeOptions = ['Delivery', 'Guest', 'Housework', 'Official', 'Cab/Taxi', 'Other'];

export default function VisitorManagement() {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const res = await visitorAPI.getAll();
      setVisitors(res.data.data);
    } catch {
      toast.error('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
    // Real-time: when guard marks entry/exit
    socketService.onVisitorEntered((data) => {
      toast.success(`✅ ${data.visitor.visitor_name} entered!`);
      fetchVisitors();
    });
    socketService.onVisitorExited((data) => {
      toast(`${data.visitor.visitor_name} has left`, { icon: '🚪' });
      fetchVisitors();
    });

    // Listen for guard-initiated requests
    socketService.socket?.on('visitor:approval_request', (data) => {
      if (data.requireApproval) {
        toast((t) => (
          <span>
            <b>{data.visitor.visitor_name}</b> is at the gate.
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={() => { handleApprove(data.visitor.id); toast.dismiss(t.id); }} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Approve</button>
              <button onClick={() => { handleDeny(data.visitor.id); toast.dismiss(t.id); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Deny</button>
            </div>
          </span>
        ), { duration: 6000, icon: '🔔' });
      }
      fetchVisitors();
    });

    return () => {
      socketService.socket?.off('visitor:approval_request');
    };
  }, []);

  const formik = useFormik({
    initialValues: {
      visitor_name: '', visitor_phone: '', vehicle_number: '',
      purpose: 'Guest', expected_arrival: '',
    },
    validationSchema: Yup.object({
      visitor_name: Yup.string().required('Name required'),
      visitor_phone: Yup.string().matches(/^[0-9]{10}$/, 'Enter valid 10-digit phone').required('Phone required'),
      purpose: Yup.string().required(),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const res = await visitorAPI.create(values);
        setVisitors((prev) => [res.data.data, ...prev]);
        setSelectedVisitor(res.data.data);
        setCreateOpen(false);
        setQrOpen(true);
        resetForm();
        toast.success('Visitor invitation created!');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to create invitation');
      }
    },
  });

  const handleApprove = async (id) => {
    try {
      await visitorAPI.updateStatus(id, 'approved');
      setVisitors((prev) => prev.map((v) => v.id === id ? { ...v, status: 'approved' } : v));
      toast.success('Visitor approved');
    } catch { toast.error('Failed to approve'); }
  };

  const handleDeny = async (id) => {
    try {
      await visitorAPI.updateStatus(id, 'denied');
      setVisitors((prev) => prev.map((v) => v.id === id ? { ...v, status: 'denied' } : v));
      toast.error('Visitor denied');
    } catch { toast.error('Failed to deny'); }
  };

  const handleToggleAutoApprove = async (event) => {
    const checked = event.target.checked;
    try {
      await authAPI.updateProfile({ visitor_auto_approve: checked });
      // Update local storage/context if needed, but for now just toast and re-syncing user is handled by context if we update it
      toast.success(`Auto-approve ${checked ? 'enabled' : 'disabled'}`);
      window.location.reload(); // Simple way to refresh user context
    } catch {
      toast.error('Failed to update preference');
    }
  };

  const handleShowQR = (visitor) => {
    setSelectedVisitor(visitor);
    setQrOpen(true);
  };

  const filtered = visitors.filter((v) => {
    const matchSearch = v.visitor_name.toLowerCase().includes(search.toLowerCase()) ||
      v.visitor_phone.includes(search);
    if (tab === 0) return matchSearch;
    if (tab === 1) return matchSearch && ['pending', 'approved'].includes(v.status);
    if (tab === 2) return matchSearch && v.status === 'entered';
    if (tab === 3) return matchSearch && v.status === 'exited';
    return matchSearch;
  });

  const stats = {
    total: visitors.length,
    pending: visitors.filter((v) => v.status === 'pending').length,
    inside: visitors.filter((v) => v.status === 'entered').length,
    today: visitors.filter((v) => new Date(v.created_at).toDateString() === new Date().toDateString()).length,
  };

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Visitor Management</Typography>
          <Typography variant="body2" color="text.secondary">Invite and manage your visitors</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 2 }}>
          Invite Visitor
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Visitors', value: stats.total, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Pending Approval', value: stats.pending, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Currently Inside', value: stats.inside, color: '#22c55e', bg: '#f0fdf4' },
          { label: "Today's Visitors", value: stats.today, color: '#8b5cf6', bg: '#f5f3ff' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${s.bg}` }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search + Tabs */}
      <Card sx={{ borderRadius: 2, mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small" placeholder="Search by name or phone…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ minWidth: 240 }}
            />
            <Box sx={{ ml: 'auto' }}>
              <IconButton onClick={fetchVisitors} size="small"><RefreshIcon /></IconButton>
            </Box>
          </Box>
        </CardContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderTop: '1px solid #f3f4f6' }}>
          <Tab label={`All (${visitors.length})`} />
          <Tab label={`Invited (${stats.pending})`} />
          <Tab label={`Inside (${stats.inside})`} />
          <Tab label="Exited" />
        </Tabs>
      </Card>

      {/* Security Preferences */}
      <Card sx={{ borderRadius: 2, mb: 3, border: '1px solid #fee2e2' }}>
        <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="error.main">Security Preference</Typography>
            <Typography variant="body2" color="text.secondary">
              When security creates a visitor request for you (e.g. unannounced delivery)
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(user?.visitor_auto_approve)}
                onChange={handleToggleAutoApprove}
                color="primary"
              />
            }
            label={user?.visitor_auto_approve ? 'Auto-Approve' : 'Manual Approval'}
            labelPlacement="start"
            sx={{ m: 0, '& .MuiFormControlLabel-label': { fontWeight: 700, fontSize: '0.85rem' } }}
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.78rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                <TableCell>Visitor</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <PersonIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No visitors found</Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.map((v) => (
                <TableRow key={v.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#eff6ff', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700 }}>
                        {v.visitor_name[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{v.visitor_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{v.visitor_phone}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{v.purpose || '—'}</Typography></TableCell>
                  <TableCell>
                    {v.vehicle_number
                      ? <Chip icon={<DirectionsCarIcon />} label={v.vehicle_number} size="small" variant="outlined" />
                      : <Typography variant="caption" color="text.secondary">Walk-in</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip label={v.status} size="small" color={statusColors[v.status] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                    </Typography>
                    {v.actual_entry && (
                      <Typography variant="caption" display="block" color="success.main">
                        In: {format(new Date(v.actual_entry), 'hh:mm a')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="Show QR Code">
                        <IconButton size="small" onClick={() => handleShowQR(v)} color="primary">
                          <QrCodeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {v.status === 'pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton size="small" color="success" onClick={() => handleApprove(v.id)}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deny">
                            <IconButton size="small" color="error" onClick={() => handleDeny(v.id)}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Visitor Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" /> Invite a Visitor
          </Box>
        </DialogTitle>
        <Divider />
        <form onSubmit={formik.handleSubmit}>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Visitor Name *" name="visitor_name"
                  value={formik.values.visitor_name} onChange={formik.handleChange}
                  error={formik.touched.visitor_name && Boolean(formik.errors.visitor_name)}
                  helperText={formik.touched.visitor_name && formik.errors.visitor_name} size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone Number *" name="visitor_phone"
                  value={formik.values.visitor_phone} onChange={formik.handleChange}
                  error={formik.touched.visitor_phone && Boolean(formik.errors.visitor_phone)}
                  helperText={formik.touched.visitor_phone && formik.errors.visitor_phone} size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Purpose *" name="purpose"
                  value={formik.values.purpose} onChange={formik.handleChange} size="small">
                  {purposeOptions.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Vehicle Number" name="vehicle_number"
                  value={formik.values.vehicle_number} onChange={formik.handleChange}
                  placeholder="e.g. KA01AB1234" size="small" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Expected Arrival" name="expected_arrival" type="datetime-local"
                  value={formik.values.expected_arrival} onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }} size="small" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" disabled={formik.isSubmitting}
              sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              {formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Create Invitation'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>Visitor Pass</DialogTitle>
        <DialogContent>
          {selectedVisitor && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 2, border: '2px solid #e5e7eb', borderRadius: 2 }}>
                <QRCodeSVG
                  value={JSON.stringify({ code: selectedVisitor.unique_code, visitor: selectedVisitor.visitor_name })}
                  size={200} level="H" includeMargin />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={700}>{selectedVisitor.visitor_name}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedVisitor.visitor_phone}</Typography>
                <Chip label={`Code: ${selectedVisitor.unique_code}`} color="primary" sx={{ mt: 1, fontWeight: 700, fontFamily: 'monospace' }} />
              </Box>
              <Box sx={{ width: '100%', bgcolor: '#f9fafb', borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Share this QR code with your visitor. They need to show it at the gate for entry.
                </Typography>
              </Box>
              <Button fullWidth variant="outlined" startIcon={<DownloadIcon />}
                onClick={() => pdfService.generateVisitorPassPDF(selectedVisitor, user)}>
                Download Pass
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button fullWidth variant="contained" onClick={() => setQrOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}