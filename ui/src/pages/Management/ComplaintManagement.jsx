import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button,
  MenuItem, Select, FormControl, InputLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Avatar, IconButton,
  Tooltip, LinearProgress,
} from '@mui/material';
import {
  Report, CheckCircle, Assignment, PriorityHigh, Refresh,
  Visibility, Edit, Timeline,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useNotification } from '../../contexts/NotificationContext';
import { complaintAPI } from '../../services/api';
import socketService from '../../services/socket';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import { getStatusColor, getInitials, formatDate, truncate } from '../../utils/helpers';

const STATUS_OPTIONS = ['open', 'in-progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

const ComplaintManagement = () => {
  const { showSnackbar } = useNotification();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailDialog, setDetailDialog] = useState(false);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updateForm, setUpdateForm] = useState({ status: '', assigned_to: '' });
  const [updating, setUpdating] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });

  useEffect(() => {
    fetchData();
    socketService.onComplaintStatusChanged(() => fetchData());
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, statsRes] = await Promise.all([
        complaintAPI.getAll(),
        complaintAPI.getStats(),
      ]);
      setComplaints(compRes.data.data);
      setStats(statsRes.data.data);
    } catch { showSnackbar('Error loading complaints', 'error'); }
    finally { setLoading(false); }
  };

  const handleViewDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setDetailDialog(true);
  };

  const handleOpenUpdate = (complaint) => {
    setSelectedComplaint(complaint);
    setUpdateForm({ status: complaint.status, assigned_to: complaint.assigned_to || '' });
    setUpdateDialog(true);
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await complaintAPI.updateStatus(selectedComplaint.id, updateForm);
      showSnackbar('Complaint updated', 'success');
      setUpdateDialog(false);
      fetchData();
    } catch { showSnackbar('Error updating complaint', 'error'); }
    finally { setUpdating(false); }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.priority && c.priority !== filters.priority) return false;
    if (filters.category && c.category !== filters.category) return false;
    return true;
  });

  const columns = [
    {
      id: 'complaint_number',
      label: 'ID',
      render: (v) => <Typography variant="caption" fontFamily="monospace">{v}</Typography>,
    },
    {
      id: 'resident',
      label: 'Resident',
      render: (_, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 30, height: 30, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
            {getInitials(row.resident_name)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{row.resident_name}</Typography>
            <Typography variant="caption" color="text.secondary">{row.apartment_number}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'title',
      label: 'Title',
      render: (v, row) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{truncate(v, 35)}</Typography>
          <Typography variant="caption" color="text.secondary">{row.category}</Typography>
        </Box>
      ),
    },
    {
      id: 'priority',
      label: 'Priority',
      render: (v) => (
        <Chip label={v} size="small" color={getStatusColor(v)}
          icon={v === 'high' ? <PriorityHigh /> : undefined} />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (v) => <Chip label={v} size="small" color={getStatusColor(v)} />,
    },
    {
      id: 'created_at',
      label: 'Date',
      render: (v) => <Typography variant="caption">{formatDate(v)}</Typography>,
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton size="small" onClick={() => handleViewDetail(row)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Update Status">
            <IconButton size="small" color="primary" onClick={() => handleOpenUpdate(row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <>
      <Helmet><title>Complaint Management</title></Helmet>
      <Box>
        <PageHeader
          title="Complaint Management"
          subtitle="Track and resolve resident complaints"
          actions={
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>
          }
        />

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: 'Total', value: stats?.overview?.total, color: 'primary.main' },
            { label: 'Open', value: stats?.overview?.open, color: 'error.main' },
            { label: 'In Progress', value: stats?.overview?.in_progress, color: 'warning.main' },
            { label: 'Resolved', value: stats?.overview?.resolved, color: 'success.main' },
          ].map((s) => (
            <Grid item xs={6} md={3} key={s.label}>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h3" fontWeight="bold" sx={{ color: s.color }}>
                      {loading ? '—' : (s.value ?? 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { key: 'status', label: 'Status', options: STATUS_OPTIONS },
            { key: 'priority', label: 'Priority', options: PRIORITY_OPTIONS },
          ].map((f) => (
            <FormControl key={f.key} size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{f.label}</InputLabel>
              <Select
                value={filters[f.key]}
                label={f.label}
                onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                {f.options.map((o) => (
                  <MenuItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
          {(filters.status || filters.priority) && (
            <Button size="small" onClick={() => setFilters({ status: '', priority: '', category: '' })}>
              Clear Filters
            </Button>
          )}
        </Box>

        <DataTable
          columns={columns}
          rows={filteredComplaints}
          loading={loading}
          title="All Complaints"
          searchPlaceholder="Search complaints..."
          emptyMessage="No complaints found"
        />
      </Box>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complaint Details</DialogTitle>
        <DialogContent>
          {selectedComplaint && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip label={selectedComplaint.status} color={getStatusColor(selectedComplaint.status)} />
                <Chip label={selectedComplaint.priority} color={getStatusColor(selectedComplaint.priority)} variant="outlined" />
                <Chip label={selectedComplaint.category} variant="outlined" />
              </Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {selectedComplaint.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedComplaint.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                By: {selectedComplaint.resident_name} · {selectedComplaint.apartment_number}
              </Typography>
              <br />
              <Typography variant="caption" color="text.secondary">
                Filed: {formatDate(selectedComplaint.created_at)}
              </Typography>
              {selectedComplaint.resolved_at && (
                <>
                  <br />
                  <Typography variant="caption" color="success.main">
                    Resolved: {formatDate(selectedComplaint.resolved_at)}
                  </Typography>
                </>
              )}
              {selectedComplaint.image_urls && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                    Attachments:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedComplaint.image_urls.split(',').map((url, i) => (
                      <Box
                        key={i}
                        component="img"
                        src={`http://localhost:5000${url}`}
                        sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
          <Button variant="contained" onClick={() => { setDetailDialog(false); handleOpenUpdate(selectedComplaint); }}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialog} onClose={() => setUpdateDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Complaint</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="Status"
            value={updateForm.status}
            onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={updating}>
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ComplaintManagement;