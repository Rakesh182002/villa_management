import React, { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Avatar, Box, Badge,
  Menu, MenuItem, ListItemIcon, Divider, Tooltip, useMediaQuery, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import NotificationDrawer from './NotificationDrawer';

const roleBadgeColor = { resident: '#22c55e', guard: '#3b82f6', management: '#8b5cf6' };
const roleLabel = { resident: 'Resident', guard: 'Guard', management: 'Management' };

export default function Header({ onMenuToggle, sidebarOpen }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleProfileMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleProfileMenuClose();
    const paths = { resident: '/resident/profile', guard: '/guard/dashboard', management: '/management/dashboard' };
    navigate(paths[user?.role] || '/login');
  };

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          color: 'text.primary',
          width: { md: sidebarOpen ? 'calc(100% - 260px)' : '100%' },
          ml: { md: sidebarOpen ? '260px' : 0 },
          transition: 'width 0.25s, margin-left 0.25s',
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, md: 3 } }}>
          {/* Hamburger */}
          <IconButton edge="start" onClick={onMenuToggle} sx={{ mr: 1, color: 'text.secondary' }}>
            <MenuIcon />
          </IconButton>

          {/* Logo/Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32, height: 32, borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.75rem' }}>SH</Typography>
            </Box>
            {!isMobile && (
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                Sunrise Heights
              </Typography>
            )}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Role Badge */}
          {!isMobile && user && (
            <Box
              sx={{
                px: 1.5, py: 0.4, borderRadius: '20px', mr: 2,
                backgroundColor: `${roleBadgeColor[user.role]}20`,
                border: `1px solid ${roleBadgeColor[user.role]}40`,
              }}
            >
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: roleBadgeColor[user.role] }}>
                {roleLabel[user.role]}
              </Typography>
            </Box>
          )}

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton onClick={() => setNotifOpen(true)} sx={{ mr: 0.5, color: 'text.secondary' }}>
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Avatar / Profile */}
          <Tooltip title="Account">
            <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0.5 }}>
              <Avatar
                sx={{
                  width: 36, height: 36,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  fontSize: '0.85rem', fontWeight: 700,
                }}
                src={user?.profile_pic ? `http://localhost:5000${user.profile_pic}` : undefined}
              >
                {getInitials(user?.full_name)}
              </Avatar>
            </IconButton>
          </Tooltip>

          {/* Profile dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: { mt: 1, minWidth: 200, borderRadius: 2, boxShadow: '0 10px 40px rgba(0,0,0,0.12)' } }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>{user?.full_name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
              {user?.apartment_number && (
                <Typography variant="caption" display="block" color="primary.main" fontWeight={600}>
                  Apt: {user.apartment_number}
                </Typography>
              )}
            </Box>
            <Divider />
            <MenuItem onClick={handleProfile} sx={{ py: 1 }}>
              <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
              <Typography variant="body2">My Profile</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ py: 1, color: 'error.main' }}>
              <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}