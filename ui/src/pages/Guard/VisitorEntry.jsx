import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Avatar, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, InputAdornment, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Autocomplete,
  Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { format, formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { visitorAPI, managementAPI } from '../../services/api';
import socketService from '../../services/socket';

const statusColors = { pending: 'warning', approved: 'success', denied: 'error', entered: 'info', exited: 'default' };

export default function VisitorEntry() {
  const [pending, setPending] = useState([]);
  const [inside, setInside] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);

  const [openAdd, setOpenAdd] = useState(false);
  const [residents, setResidents] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    resident_id: '', visitor_name: '', visitor_phone: '',
    purpose: 'Delivery', vehicle_number: ''
  });

  useEffect(() => {
    loadData();
    fetchResidents();
    socketService.onVisitorStatusUpdate(() => loadData());
  }, []);

  const fetchResidents = async () => {
    try {
      const res = await managementAPI.getResidents();
      setResidents(res.data.data);
    } catch { console.error('Failed to load residents'); }
  };

  const loadData = async () => {
    try {
      const [pendRes, insideRes] = await Promise.all([visitorAPI.getPending(), visitorAPI.getInside()]);
      setPending(pendRes.data.data);
      setInside(insideRes.data.data);
    } catch { toast.error('Failed to load visitors'); }
    finally { setLoading(false); }
  };

  const handleEntry = async (id, residentId, name) => {
    try {
      await visitorAPI.markEntry(id);
      toast.success(`${name} entry marked!`);
      loadData();
      socketService.socket?.emit('visitor:response', { visitorId: id, status: 'entered', residentId });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleExit = async (id, name) => {
    try {
      await visitorAPI.markExit(id);
      toast.success(`${name} exit marked!`);
      loadData();
    } catch { toast.error('Failed to mark exit'); }
  };

  const handleDirectEntry = async () => {
    if (!form.resident_id || !form.visitor_name || !form.visitor_phone) {
      return toast.error('Please fill required fields');
    }
    setSubmitting(true);
    try {
      const res = await visitorAPI.guardInitiate(form);
      toast.success(res.data.message);
      setOpenAdd(false);
      setForm({ resident_id: '', visitor_name: '', visitor_phone: '', purpose: 'Delivery', vehicle_number: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate entry');
    } finally {
      setSubmitting(false);
    }
  };

  const filterList = (list) => list.filter((v) =>
    v.visitor_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.visitor_phone?.includes(search) ||
    v.apartment_number?.toLowerCase().includes(search.toLowerCase())
  );

  const currentList = tab === 0 ? filterList(pending) : filterList(inside);

  return (
    <Box>
      <Toaster position="top-right" />
      <Typography variant="h5" fontWeight={700} gutterBottom>Visitor Entry Management</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search by name, phone, apartment…" value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAdd(true)}
          sx={{ ml: 'auto', background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: 2 }}>
          Direct Entry
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Approved/Pending (${pending.length})`} />
        <Tab label={`Currently Inside (${inside.length})`} />
      </Tabs>

      <Card sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Visitor</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Apartment</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Purpose</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : currentList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <PersonIcon sx={{ fontSize: 40, color: '#d1d5db', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary" variant="body2">No visitors found</Typography>
                  </TableCell>
                </TableRow>
              ) : currentList.map((v) => (
                <TableRow key={v.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: '#eff6ff', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 700 }}>{v.visitor_name?.[0]}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{v.visitor_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{v.visitor_phone}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{v.apartment_number}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{v.purpose || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={v.status} size="small" color={statusColors[v.status] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {tab === 1 && v.actual_entry
                        ? `In: ${format(new Date(v.actual_entry), 'hh:mm a')}`
                        : formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                    </Typography>
                    {tab === 1 && v.duration_minutes > 120 && (
                      <Chip label="OVERSTAY" size="small" color="error" sx={{ display: 'block', mt: 0.5, height: 16, fontSize: '0.6rem' }} />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {v.status === 'approved' && (
                      <Button size="small" variant="contained" color="success" startIcon={<LoginIcon />}
                        onClick={() => handleEntry(v.id, v.resident_id, v.visitor_name)}
                        sx={{ fontSize: '0.7rem', py: 0.3 }}>
                        Entry
                      </Button>
                    )}
                    {v.status === 'entered' && (
                      <Button size="small" variant="contained" color="warning" startIcon={<LogoutIcon />}
                        onClick={() => handleExit(v.id, v.visitor_name)}
                        sx={{ fontSize: '0.7rem', py: 0.3 }}>
                        Exit
                      </Button>
                    )}
                    {v.status === 'pending' && (
                      <Typography variant="caption" color="text.secondary">Awaiting approval</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Security-Initiated Visitor Entry</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={residents}
                getOptionLabel={(option) => `${option.full_name} (${option.apartment_number})`}
                onChange={(_, val) => setForm({ ...form, resident_id: val?.id || '' })}
                renderInput={(params) => <TextField {...params} label="Select Resident/Apartment *" size="small" />}
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Visitor Name *" size="small" value={form.visitor_name} onChange={e => setForm({ ...form, visitor_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone Number *" size="small" value={form.visitor_phone} onChange={e => setForm({ ...form, visitor_phone: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Purpose" size="small" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}>
                {['Delivery', 'Guest', 'Official', 'Cab/Taxi', 'Other'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Vehicle Number" size="small" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleDirectEntry} disabled={submitting} sx={{ borderRadius: 2, px: 4 }}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Initiate Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}