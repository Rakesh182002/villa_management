import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, CircularProgress, IconButton, Avatar,
} from '@mui/material';
import {
  Add, Announcement, Campaign, NotificationsActive, Info,
  Delete, Edit, Refresh,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useNotification } from '../../contexts/NotificationContext';
import { communicationAPI } from '../../services/api';
import socketService from '../../services/socket';
import PageHeader from '../../components/Common/PageHeader';
import { getInitials } from '../../utils/helpers';

const PRIORITY_CONFIG = {
  urgent: { color: 'error', icon: <NotificationsActive />, bg: '#fef2f2', border: '#fca5a5' },
  important: { color: 'warning', icon: <Campaign />, bg: '#fffbeb', border: '#fcd34d' },
  general: { color: 'info', icon: <Info />, bg: '#eff6ff', border: '#93c5fd' },
};

const NoticeManagement = () => {
  const { showSnackbar } = useNotification();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'general' });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await communicationAPI.getNotices();
      setNotices(res.data.data);
    } catch { showSnackbar('Error loading notices', 'error'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.title || !form.content) {
      showSnackbar('Title and content are required', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (imageFile) formData.append('image', imageFile);

      await communicationAPI.createNotice(formData);
      showSnackbar('Notice published successfully!', 'success');
      setDialog(false);
      setForm({ title: '', content: '', priority: 'general' });
      setImageFile(null);
      fetchNotices();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error creating notice', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <Helmet><title>Notice Management</title></Helmet>
      <Box>
        <PageHeader
          title="Notice Board Management"
          subtitle="Create and manage society announcements"
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchNotices}>Refresh</Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}>
                New Notice
              </Button>
            </Box>
          }
        />

        {/* Priority stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {['urgent', 'important', 'general'].map((p) => {
            const count = notices.filter(n => n.priority === p).length;
            const cfg = PRIORITY_CONFIG[p];
            return (
              <Grid item xs={12} sm={4} key={p}>
                <Card sx={{ bgcolor: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                    <Box sx={{ color: `${cfg.color}.main` }}>{cfg.icon}</Box>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">{count}</Typography>
                      <Typography variant="body2">{p.charAt(0).toUpperCase() + p.slice(1)} Notices</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Notices grid */}
        {loading ? (
          <Box sx={{ textAlign: 'center', p: 6 }}><CircularProgress /></Box>
        ) : notices.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 6 }}>
            <Announcement sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">No notices posted yet</Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            <AnimatePresence>
              {notices.map((notice, i) => {
                const cfg = PRIORITY_CONFIG[notice.priority] || PRIORITY_CONFIG.general;
                return (
                  <Grid item xs={12} md={6} lg={4} key={notice.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card
                        sx={{
                          height: '100%',
                          bgcolor: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                            <Chip
                              icon={cfg.icon}
                              label={notice.priority.toUpperCase()}
                              size="small"
                              color={cfg.color}
                              sx={{ fontWeight: 700 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(notice.created_at), 'dd MMM yyyy')}
                            </Typography>
                          </Box>

                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {notice.title}
                          </Typography>

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {notice.content}
                          </Typography>

                          {notice.image_url && (
                            <Box
                              component="img"
                              src={`http://localhost:5000${notice.image_url}`}
                              sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 1, mb: 2 }}
                            />
                          )}

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                              {getInitials(notice.posted_by_name)}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              {notice.posted_by_name}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </AnimatePresence>
          </Grid>
        )}
      </Box>

      {/* Create Notice Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Notice</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth label="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <TextField
              fullWidth label="Content *"
              multiline rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <TextField
              fullWidth select label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <MenuItem value="urgent">🔴 Urgent</MenuItem>
              <MenuItem value="important">🟡 Important</MenuItem>
              <MenuItem value="general">🔵 General</MenuItem>
            </TextField>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Attach Image (Optional)
              </Typography>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                style={{ width: '100%' }}
              />
              {imageFile && (
                <Typography variant="caption" color="success.main">
                  ✓ {imageFile.name}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting} startIcon={<Announcement />}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Publish Notice'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NoticeManagement;