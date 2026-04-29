// NoticeBoard.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel, Grid
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CampaignIcon from '@mui/icons-material/Campaign';
import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { communicationAPI } from '../../services/api';
import socketService from '../../services/socket';

const priorityConfig = {
  urgent: { color: 'error', icon: <NotificationsActiveIcon fontSize="small" />, label: 'Urgent', bg: '#fef2f2' },
  important: { color: 'warning', icon: <CampaignIcon fontSize="small" />, label: 'Important', bg: '#fffbeb' },
  general: { color: 'info', icon: <InfoIcon fontSize="small" />, label: 'General', bg: '#eff6ff' },
};

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadNotices();
    socketService.onNewNotice((notice) => {
      setNotices((prev) => [notice, ...prev]);
      toast.success(`New notice: ${notice.title}`, { icon: '📢' });
    });
  }, []);

  const loadNotices = async () => {
    try {
      const res = await communicationAPI.getNotices();
      setNotices(res.data.data);
    } catch { toast.error('Failed to load notices'); }
    finally { setLoading(false); }
  };

  const filtered = notices.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filter === 'all' || n.priority === filter);
  });

  return (
    <Box>
      <Toaster position="top-right" />
      <Typography variant="h5" fontWeight={700} gutterBottom>Notice Board</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Stay updated with society announcements</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search notices…" value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Priority</InputLabel>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} label="Priority">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="urgent">Urgent</MenuItem>
            <MenuItem value="important">Important</MenuItem>
            <MenuItem value="general">General</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? <Box sx={{ textAlign: 'center', p: 4 }}><CircularProgress /></Box> : (
        <Grid container spacing={2}>
          {filtered.map((n) => {
            const cfg = priorityConfig[n.priority] || priorityConfig.general;
            return (
              <Grid item xs={12} md={6} key={n.id}>
                <Card sx={{ borderRadius: 2, bgcolor: cfg.bg, border: `1px solid`, borderColor: `${cfg.color}.light`, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip icon={cfg.icon} label={cfg.label} size="small" color={cfg.color} sx={{ fontWeight: 600 }} />
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(n.created_at), 'dd MMM yyyy')}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>{n.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{n.content}</Typography>
                    {n.image_url && (
                      <Box component="img" src={`http://localhost:5000${n.image_url}`}
                        sx={{ mt: 1.5, width: '100%', borderRadius: 1.5, maxHeight: 200, objectFit: 'cover' }} />
                    )}
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                      Posted by {n.posted_by_name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {!loading && filtered.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CampaignIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                <Typography color="text.secondary">No notices found</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}