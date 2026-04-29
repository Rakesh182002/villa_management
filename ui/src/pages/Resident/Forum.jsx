import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip, Avatar,
  CircularProgress, Divider, IconButton, Collapse,
  MenuItem,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ForumIcon from '@mui/icons-material/Forum';
import CommentIcon from '@mui/icons-material/Comment';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { communicationAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const categoryColors = { General: '#6b7280', Activities: '#22c55e', Security: '#ef4444', Maintenance: '#f59e0b', Social: '#8b5cf6' };

export default function Forum() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [comments, setComments] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => { loadTopics(); }, []);

  const loadTopics = async () => {
    try {
      const res = await communicationAPI.getForumTopics();
      setTopics(res.data.data);
    } catch { toast.error('Failed to load forum'); }
    finally { setLoading(false); }
  };

  const loadComments = async (topicId) => {
    try {
      const res = await communicationAPI.getComments(topicId);
      setComments((prev) => ({ ...prev, [topicId]: res.data.data }));
    } catch {
      toast.error('Failed to load comments');
    }
  };

  const handleExpand = (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!comments[id]) loadComments(id);
  };

  const handleAddComment = async (topicId) => {
    if (!newComment.trim()) return;
    try {
      const res = await communicationAPI.addComment(topicId, newComment);
      setComments((prev) => ({ ...prev, [topicId]: [...(prev[topicId] || []), res.data.data] }));
      setTopics((prev) => prev.map((t) => t.id === topicId ? { ...t, comment_count: (t.comment_count || 0) + 1 } : t));
      setNewComment('');
      toast.success('Comment added');
    } catch { toast.error('Failed to add comment'); }
  };

  const formik = useFormik({
    initialValues: { title: '', content: '', category: 'General' },
    validationSchema: Yup.object({
      title: Yup.string().required('Title required').min(5),
      content: Yup.string().required('Content required').min(10),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const res = await communicationAPI.createTopic(values);
        setTopics((prev) => [{ ...res.data.data, comment_count: 0 }, ...prev]);
        setCreateOpen(false);
        resetForm();
        toast.success('Topic created!');
      } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    },
  });

  return (
    <Box>
      <Toaster position="top-right" />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Community Forum</Typography>
          <Typography variant="body2" color="text.secondary">Discuss topics with your neighbors</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          sx={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', borderRadius: 2 }}>
          New Topic
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', p: 4 }}><CircularProgress /></Box>
      ) : topics.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ForumIcon sx={{ fontSize: 56, color: '#d1d5db', mb: 2 }} />
          <Typography color="text.secondary">No topics yet. Start the discussion!</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {topics.map((topic) => (
            <Card key={topic.id} sx={{ borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, cursor: 'pointer' }} onClick={() => handleExpand(topic.id)}>
                  <Avatar sx={{ bgcolor: categoryColors[topic.category] || '#6b7280', width: 40, height: 40, fontWeight: 700, fontSize: '0.85rem' }}>
                    {topic.created_by_name?.[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" fontWeight={700}>{topic.title}</Typography>
                      <Chip label={topic.category} size="small"
                        sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${categoryColors[topic.category] || '#6b7280'}20`, color: categoryColors[topic.category] }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {topic.content.substring(0, 120)}{topic.content.length > 120 ? '…' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        By {topic.created_by_name} • {topic.apartment_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CommentIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">{topic.comment_count || 0}</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <ExpandMoreIcon sx={{ color: 'text.secondary', transform: expanded === topic.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </Box>

                <Collapse in={expanded === topic.id}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {(comments[topic.id] || []).map((c) => (
                      <Box key={c.id} sx={{ display: 'flex', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', fontSize: '0.75rem', fontWeight: 700 }}>
                          {c.user_name?.[0]}
                        </Avatar>
                        <Box sx={{ flex: 1, bgcolor: '#f9fafb', borderRadius: 2, px: 1.5, py: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={700}>{c.user_name}</Typography>
                            <Typography variant="caption" color="text.disabled">{c.apartment_number}</Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                            </Typography>
                          </Box>
                          <Typography variant="body2">{c.comment}</Typography>
                        </Box>
                      </Box>
                    ))}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#3b82f6', fontSize: '0.75rem', fontWeight: 700 }}>
                        {user.full_name?.[0]}
                      </Avatar>
                      <TextField size="small" fullWidth placeholder="Add a comment…"
                        value={newComment} onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(topic.id)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px' } }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={() => handleAddComment(topic.id)} disabled={!newComment.trim()}>
                                <SendIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />
                    </Box>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ForumIcon color="primary" />New Topic</Box></DialogTitle>
        <Divider />
        <form onSubmit={formik.handleSubmit}>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth label="Title *" name="title" size="small"
                value={formik.values.title} onChange={formik.handleChange}
                error={formik.touched.title && Boolean(formik.errors.title)}
                helperText={formik.touched.title && formik.errors.title} />
              <TextField fullWidth label="Category" name="category" select size="small"
                value={formik.values.category} onChange={formik.handleChange}>
                {Object.keys(categoryColors).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField fullWidth label="Content *" name="content" multiline rows={4} size="small"
                value={formik.values.content} onChange={formik.handleChange}
                error={formik.touched.content && Boolean(formik.errors.content)}
                helperText={formik.touched.content && formik.errors.content} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" disabled={formik.isSubmitting}
              sx={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
              {formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Post Topic'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}