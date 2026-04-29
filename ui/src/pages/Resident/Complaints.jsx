import  { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Tabs, Tab, Divider,
  Rating, Collapse,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BugReportIcon from '@mui/icons-material/BugReport';
import ImageIcon from '@mui/icons-material/Image';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarIcon from '@mui/icons-material/Star';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {  formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { complaintAPI } from '../../services/api';
import pdfService from '../../services/pdf';
import socketService from '../../services/socket';

const statusColors = { open: 'error', 'in-progress': 'warning', resolved: 'success', closed: 'default' };
const priorityColors = { low: 'success', medium: 'warning', high: 'error' };
const categories = ['infrastructure', 'electrical', 'plumbing', 'parking', 'noise', 'security', 'other'];

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState(0);
  const [ratingDialog, setRatingDialog] = useState({ open: false, complaint: null });
  const [ratingValue, setRatingValue] = useState(0);
  const [previewFiles, setPreviewFiles] = useState([]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await complaintAPI.getAll();
      setComplaints(res.data.data);
    } catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchComplaints();
    socketService.onComplaintStatusChanged((data) => {
      toast.success(`Complaint #${data.complaintId} updated to ${data.status}`);
      fetchComplaints();
    });
  }, []);

  const formik = useFormik({
    initialValues: { title: '', description: '', category: 'infrastructure', priority: 'medium' },
    validationSchema: Yup.object({
      title: Yup.string().required('Title required').min(5),
      description: Yup.string().required('Description required').min(10),
      category: Yup.string().required(),
      priority: Yup.string().required(),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const formData = new FormData();
        Object.keys(values).forEach((k) => formData.append(k, values[k]));
        previewFiles.forEach((f) => formData.append('images', f));

        const res = await complaintAPI.create(formData);
        setComplaints((prev) => [res.data.data, ...prev]);
        setCreateOpen(false);
        setPreviewFiles([]);
        resetForm();
        toast.success('Complaint registered!');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to submit complaint');
      }
    },
  });

  const handleRate = async () => {
    try {
      await complaintAPI.rate(ratingDialog.complaint.id, ratingValue);
      setComplaints((prev) =>
        prev.map((c) => c.id === ratingDialog.complaint.id ? { ...c, rating: ratingValue } : c)
      );
      setRatingDialog({ open: false, complaint: null });
      toast.success('Thank you for your feedback!');
    } catch { toast.error('Failed to submit rating'); }
  };

  const handleExport = async () => {
    try {
      const doc = await pdfService.generateComplaintReportPDF(complaints);
      doc.save('Complaint_Report.pdf');
    } catch { toast.error('Failed to export'); }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setPreviewFiles(files);
  };

  const filtered = complaints.filter((c) => {
    if (tab === 0) return true;
    if (tab === 1) return c.status === 'open';
    if (tab === 2) return c.status === 'in-progress';
    if (tab === 3) return c.status === 'resolved';
    return true;
  });

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === 'open').length,
    inProgress: complaints.filter((c) => c.status === 'in-progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  };

  return (
    <Box>
      <Toaster position="top-right" />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>My Complaints</Typography>
          <Typography variant="body2" color="text.secondary">Track and manage your registered complaints</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleExport}>Export PDF</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
            sx={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', borderRadius: 2 }}>
            New Complaint
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total', value: stats.total, color: '#0b0b0bff', bg: '#e9eaecff' },
          { label: 'Open', value: stats.open, color: '#ef4444', bg: '#fef2f2' },
          { label: 'In Progress', value: stats.inProgress, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Resolved', value: stats.resolved, color: '#22c55e', bg: '#f0fdf4' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card sx={{ borderRadius: 2, bgcolor: s.bg, border: 'none', boxShadow: 0 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #f3f4f6' }}>
          <Tab label="All" /><Tab label="Open" /><Tab label="In Progress" /><Tab label="Resolved" />
        </Tabs>

        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <BugReportIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
            <Typography color="text.secondary">No complaints found</Typography>
          </Box>
        ) : (
          <Box>
            {filtered.map((c) => (
              <Box key={c.id} sx={{ borderBottom: '1px solid #f3f4f6', '&:last-child': { borderBottom: 0 } }}>
                <Box
                  sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: '#f9fafb' } }}
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <Avatar sx={{ bgcolor: `${statusColors[c.status]}.100`, color: `${statusColors[c.status]}.main`, width: 40, height: 40 }}>
                    <BugReportIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{c.title}</Typography>
                      <Chip label={`#${c.complaint_number}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={c.status.replace('-', ' ')} size="small" color={statusColors[c.status]}
                        sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                      <Chip label={c.priority} size="small" color={priorityColors[c.priority]}
                        variant="outlined" sx={{ textTransform: 'capitalize', fontSize: '0.65rem', height: 20 }} />
                      <Chip label={c.category} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </Typography>
                    {c.rating && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                        <StarIcon sx={{ fontSize: 12, color: '#f59e0b' }} />
                        <Typography variant="caption" color="#f59e0b" fontWeight={600}>{c.rating}</Typography>
                      </Box>
                    )}
                  </Box>
                  <ExpandMoreIcon sx={{
                    color: 'text.secondary', fontSize: 20,
                    transform: expanded === c.id ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }} />
                </Box>

                <Collapse in={expanded === c.id}>
                  <Box sx={{ px: 3, pb: 2, bgcolor: '#f9fafb', borderTop: '1px dashed #e5e7eb' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 1 }}>
                      {c.description}
                    </Typography>
                    {c.image_urls && (
                      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                        {c.image_urls.split(',').map((url, i) => (
                          <Box key={i} component="img"
                            src={`http://localhost:5000${url}`}
                            sx={{ width: 80, height: 80, borderRadius: 1, objectFit: 'cover', border: '1px solid #e5e7eb' }}
                          />
                        ))}
                      </Box>
                    )}
                    {c.assigned_to_name && (
                      <Typography variant="caption" color="text.secondary">
                        Assigned to: <strong>{c.assigned_to_name}</strong>
                      </Typography>
                    )}
                    {c.status === 'resolved' && !c.rating && (
                      <Button size="small" variant="outlined" color="warning" sx={{ mt: 1 }}
                        onClick={() => setRatingDialog({ open: true, complaint: c })}>
                        Rate Resolution
                      </Button>
                    )}
                  </Box>
                </Collapse>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      {/* Create Complaint Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugReportIcon color="error" /> Register Complaint
          </Box>
        </DialogTitle>
        <Divider />
        <form onSubmit={formik.handleSubmit}>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Title *" name="title" size="small"
                  value={formik.values.title} onChange={formik.handleChange}
                  error={formik.touched.title && Boolean(formik.errors.title)}
                  helperText={formik.touched.title && formik.errors.title} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description *" name="description" multiline rows={3} size="small"
                  value={formik.values.description} onChange={formik.handleChange}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth select label="Category" name="category" size="small"
                  value={formik.values.category} onChange={formik.handleChange}>
                  {categories.map((c) => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth select label="Priority" name="priority" size="small"
                  value={formik.values.priority} onChange={formik.handleChange}>
                  {['low', 'medium', 'high'].map((p) => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label" startIcon={<ImageIcon />} size="small" fullWidth>
                  Attach Photos (max 5)
                  <input type="file" hidden multiple accept="image/*" onChange={handleFileChange} />
                </Button>
                {previewFiles.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    {previewFiles.map((f, i) => (
                      <Box key={i} component="img" src={URL.createObjectURL(f)}
                        sx={{ width: 60, height: 60, borderRadius: 1, objectFit: 'cover' }} />
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Submit Complaint'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={ratingDialog.open} onClose={() => setRatingDialog({ open: false, complaint: null })} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Rate Resolution</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            How satisfied are you with the resolution?
          </Typography>
          <Rating value={ratingValue} onChange={(_, v) => setRatingValue(v)} size="large" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRatingDialog({ open: false, complaint: null })}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleRate} disabled={!ratingValue}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}