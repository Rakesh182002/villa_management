import React, { useState, useEffect } from 'react';
import {
  Box, Card, Avatar, Chip, Button, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Grid, Typography, Tooltip, CircularProgress,
} from '@mui/material';
import {
  PersonAdd, Edit, Email, Phone, Home, Refresh,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useNotification } from '../../contexts/NotificationContext';
import { managementAPI } from '../../services/api';
import { authAPI } from '../../services/api';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import { formatDate, getInitials } from '../../utils/helpers';

const ResidentManagement = () => {
  const { showSnackbar } = useNotification();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: 'password123',
    role: 'resident', apartment_number: '',
  });

  useEffect(() => { fetchResidents(); }, []);

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const res = await managementAPI.getResidents();
      setResidents(res.data.data);
    } catch { showSnackbar('Error loading residents', 'error'); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.full_name || !form.email || !form.phone || !form.apartment_number) {
      showSnackbar('Please fill all required fields', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await authAPI.register(form);
      showSnackbar('Resident added successfully', 'success');
      setAddDialog(false);
      setForm({ full_name: '', email: '', phone: '', password: 'password123', role: 'resident', apartment_number: '' });
      fetchResidents();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error adding resident', 'error');
    } finally { setSubmitting(false); }
  };

  const columns = [
    {
      id: 'name',
      label: 'Resident',
      render: (_, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.875rem' }}>
            {getInitials(row.full_name)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{row.full_name}</Typography>
            <Typography variant="caption" color="text.secondary">{row.email}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'apartment_number',
      label: 'Apartment',
      render: (v) => <Chip label={v || '—'} size="small" icon={<Home />} variant="outlined" />,
    },
    {
      id: 'phone',
      label: 'Phone',
      render: (v) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Phone fontSize="small" color="action" />
          <Typography variant="body2">{v}</Typography>
        </Box>
      ),
    },
    {
      id: 'is_verified',
      label: 'Status',
      render: (v) => (
        <Chip
          label={v ? 'Verified' : 'Pending'}
          size="small"
          color={v ? 'success' : 'warning'}
        />
      ),
    },
    {
      id: 'created_at',
      label: 'Joined',
      render: (v) => <Typography variant="caption">{formatDate(v)}</Typography>,
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Send Email">
            <IconButton size="small" onClick={() => window.open(`mailto:${row.email}`)}>
              <Email fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Call">
            <IconButton size="small" onClick={() => window.open(`tel:${row.phone}`)}>
              <Phone fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <>
      <Helmet><title>Resident Management</title></Helmet>
      <Box>
        <PageHeader
          title="Resident Management"
          subtitle="Manage all residents and their apartments"
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchResidents}>
                Refresh
              </Button>
              <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setAddDialog(true)}>
                Add Resident
              </Button>
            </Box>
          }
        />

        {/* Summary */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: 'Total Residents', value: residents.length },
            { label: 'Verified', value: residents.filter(r => r.is_verified).length },
            { label: 'Pending', value: residents.filter(r => !r.is_verified).length },
          ].map((s) => (
            <Grid item xs={12} sm={4} key={s.label}>
              <Card>
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold">{s.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        <DataTable
          columns={columns}
          rows={residents}
          loading={loading}
          title="All Residents"
          searchPlaceholder="Search by name, email, apartment..."
          emptyMessage="No residents found"
        />
      </Box>

      {/* Add Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Resident</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { name: 'full_name', label: 'Full Name *' },
              { name: 'email', label: 'Email *', type: 'email' },
              { name: 'phone', label: 'Phone *' },
              { name: 'apartment_number', label: 'Apartment Number *' },
            ].map((f) => (
              <Grid item xs={12} sm={6} key={f.name}>
                <TextField fullWidth label={f.label} type={f.type || 'text'}
                  value={form[f.name]}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Initial Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                helperText="Resident can change this after first login"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={submitting}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Add Resident'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ResidentManagement;