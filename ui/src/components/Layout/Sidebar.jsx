import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Chip,
} from '@mui/material';
import {
  Dashboard,
  People,
  PersonAdd,
  Report,
  Payment,
  Weekend,
  Chat,
  Announcement,
  Forum,
  QrCodeScanner,
  Security,
  LocationOn,
  Warning,
  AccountBalance,
  Receipt,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const residentMenuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/resident/dashboard' },
    { text: 'Visitors', icon: <People />, path: '/resident/visitors' },
    { text: 'Domestic Staff', icon: <PersonAdd />, path: '/resident/staff' },
    { text: 'Complaints', icon: <Report />, path: '/resident/complaints' },
    { text: 'Payments', icon: <Payment />, path: '/resident/payments' },
    { text: 'Amenities', icon: <Weekend />, path: '/resident/amenities' },
    { text: 'Chat', icon: <Chat />, path: '/resident/chat' },
    { text: 'Notice Board', icon: <Announcement />, path: '/resident/notices' },
    { text: 'Forum', icon: <Forum />, path: '/resident/forum' },
    { text: 'SOS Alert', icon: <Warning />, path: '/resident/sos', badge: true },
  ];

  const guardMenuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/guard/dashboard' },
    { text: 'Visitor Entry', icon: <People />, path: '/guard/visitor-entry' },
    { text: 'Gate QR Scanner', icon: <QrCodeScanner />, path: '/guard/qr-scanner' },
    { text: 'Staff Entry', icon: <PersonAdd />, path: '/guard/staff-entry' },
    { text: 'Live Location', icon: <LocationOn />, path: '/guard/location' },
    { text: 'SOS Alerts', icon: <Warning />, path: '/guard/sos-alerts', badge: true },
  ];


  const managementMenuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/management/dashboard' },
    { text: 'Residents', icon: <People />, path: '/management/residents' },
    { text: 'Staff Registry', icon: <PersonAdd />, path: '/management/staff' },
    { text: 'Complaints', icon: <Report />, path: '/management/complaints' },
    { text: 'Financials', icon: <AccountBalance />, path: '/management/financials' },
    { text: 'Bill Generation', icon: <Receipt />, path: '/management/bills' },
    { text: 'Security Monitor', icon: <Security />, path: '/management/security' },
    { text: 'Notices', icon: <Announcement />, path: '/management/notices' },
    { text: 'Amenities', icon: <Weekend />, path: '/management/amenities' },
  ];

  const getMenuItems = () => {
    switch (user?.role) {
      case 'resident':
        return residentMenuItems;
      case 'guard':
        return guardMenuItems;
      case 'management':
        return managementMenuItems;
      default:
        return [];
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const menuItems = getMenuItems();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
          }}
        >
          👤
        </Box>
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
            {user?.full_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.apartment_number}
          </Typography>
          <Chip
          label={user?.role?.toUpperCase()}
          size="small"
          color="primary"
          sx={{ ml: 2, height: 20, fontSize: '0.65rem' }}
        />
        </Box>
      </Box>

      {/* User Info */}
      {/* <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" fontWeight="bold" noWrap>
          {user?.full_name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {user?.apartment_number}
        </Typography>
        
      </Box> */}

      <Divider />

      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1, py: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  bgcolor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  '&:hover': {
                    bgcolor: isActive ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'white' : 'action.active',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
                {item.badge && (
                  <Chip
                    label="!"
                    size="small"
                    color="error"
                    sx={{ height: 20, minWidth: 20 }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          © 2026 Society Manager
        </Typography>
        <Typography variant="caption" color="text.secondary">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;