import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Grid,
  Avatar, Divider, Alert, CircularProgress, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LockIcon from '@mui/icons-material/Lock';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast, { Toaster } from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const profileFormik = useFormik({
    initialValues: { full_name: user?.full_name || '', phone: user?.phone || '' },
    enableReinitialize: true,
    validationSchema: Yup.object({
      full_name: Yup.string().required('Name required').min(2),
      phone: Yup.string().matches(/^[0-9]{10}$/, 'Valid 10-digit phone required').required(),
    }),
    onSubmit: async (values) => {
      try {
        const formData = new FormData();
        formData.append('full_name', values.full_name);
        formData.append('phone', values.phone);
        if (avatarFile) formData.append('profile_pic', avatarFile);

        const res = await authAPI.updateProfile(formData);
        updateUser(res.data.data);
        setEditing(false);
        setAvatarFile(null);
        toast.success('Profile updated!');
      } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    },
  });

  const pwdFormik = useFormik({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required('Current password required'),
      newPassword: Yup.string().min(6, 'Min 6 characters').required('New password required'),
      confirmPassword: Yup.string().oneOf([Yup.ref('newPassword')], 'Passwords must match').required(),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        await authAPI.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
        setPwdOpen(false);
        resetForm();
        toast.success('Password changed!');
      } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    },
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const getInitials = (name = '') => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Toaster position="top-right" />
      <Typography variant="h5" fontWeight={700} gutterBottom>My Profile</Typography>

      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Avatar Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={avatarPreview || (user?.profile_pic ? `http://localhost:5000${user.profile_pic}` : undefined)}
                sx={{ width: 88, height: 88, bgcolor: 'primary.main', fontSize: '2rem', fontWeight: 700 }}
              >
                {getInitials(user?.full_name)}
              </Avatar>
              {editing && (
                <IconButton component="label" size="small"
                  sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: 'white', border: '2px solid #e5e7eb', width: 28, height: 28 }}>
                  <CameraAltIcon sx={{ fontSize: 14 }} />
                  <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                </IconButton>
              )}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>{user?.full_name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              {user?.apartment_number && (
                <Typography variant="body2" color="primary.main" fontWeight={600}>Apt: {user.apartment_number}</Typography>
              )}
              <Typography variant="caption" sx={{ textTransform: 'capitalize', bgcolor: 'primary.50', color: 'primary.main', px: 1, py: 0.3, borderRadius: 1, mt: 0.5, display: 'inline-block' }}>
                {user?.role}
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              {!editing ? (
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>Edit</Button>
              ) : (
                <Button variant="outlined" onClick={() => { setEditing(false); setAvatarFile(null); setAvatarPreview(null); }}>Cancel</Button>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Profile Form */}
          <form onSubmit={profileFormik.handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Full Name" name="full_name" size="small"
                  value={profileFormik.values.full_name} onChange={profileFormik.handleChange}
                  disabled={!editing}
                  error={profileFormik.touched.full_name && Boolean(profileFormik.errors.full_name)}
                  helperText={profileFormik.touched.full_name && profileFormik.errors.full_name} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone Number" name="phone" size="small"
                  value={profileFormik.values.phone} onChange={profileFormik.handleChange}
                  disabled={!editing}
                  error={profileFormik.touched.phone && Boolean(profileFormik.errors.phone)}
                  helperText={profileFormik.touched.phone && profileFormik.errors.phone} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email" value={user?.email || ''} size="small" disabled />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Apartment" value={user?.apartment_number || '—'} size="small" disabled />
              </Grid>
              {editing && (
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={profileFormik.isSubmitting}
                    sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                    {profileFormik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
                  </Button>
                </Grid>
              )}
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LockIcon color="action" />
              <Typography variant="subtitle1" fontWeight={700}>Security</Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={() => setPwdOpen(!pwdOpen)}>
              {pwdOpen ? 'Cancel' : 'Change Password'}
            </Button>
          </Box>
          {pwdOpen && (
            <form onSubmit={pwdFormik.handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Current Password" name="currentPassword" type="password" size="small"
                    value={pwdFormik.values.currentPassword} onChange={pwdFormik.handleChange}
                    error={pwdFormik.touched.currentPassword && Boolean(pwdFormik.errors.currentPassword)}
                    helperText={pwdFormik.touched.currentPassword && pwdFormik.errors.currentPassword} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="New Password" name="newPassword" type="password" size="small"
                    value={pwdFormik.values.newPassword} onChange={pwdFormik.handleChange}
                    error={pwdFormik.touched.newPassword && Boolean(pwdFormik.errors.newPassword)}
                    helperText={pwdFormik.touched.newPassword && pwdFormik.errors.newPassword} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Confirm New Password" name="confirmPassword" type="password" size="small"
                    value={pwdFormik.values.confirmPassword} onChange={pwdFormik.handleChange}
                    error={pwdFormik.touched.confirmPassword && Boolean(pwdFormik.errors.confirmPassword)}
                    helperText={pwdFormik.touched.confirmPassword && pwdFormik.errors.confirmPassword} />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" color="warning" disabled={pwdFormik.isSubmitting}>
                    {pwdFormik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Update Password'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          )}
          {!pwdOpen && (
            <Typography variant="body2" color="text.secondary">
              Last changed: Never • Use a strong password with numbers and symbols
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}