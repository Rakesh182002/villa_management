import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  Close,
  People,
  Warning,
  Report,
  Announcement,
  Chat,
  PersonAdd,
  CheckCircle,
  Delete,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNotification } from '../../contexts/NotificationContext';

const NotificationDrawer = ({ open, onClose }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  } = useNotification();

  const getIcon = (type) => {
    switch (type) {
      case 'visitor':
        return <People />;
      case 'emergency':
      case 'warning':
        return <Warning />;
      case 'complaint':
        return <Report />;
      case 'notice':
        return <Announcement />;
      case 'chat':
        return <Chat />;
      case 'staff':
        return <PersonAdd />;
      default:
        return <CheckCircle />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'emergency':
        return 'error';
      case 'warning':
        return 'warning';
      case 'visitor':
      case 'staff':
        return 'info';
      case 'complaint':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {unreadCount} unread
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Box>

      {/* Actions */}
      {notifications.length > 0 && (
        <Box sx={{ p: 2, display: 'flex', gap: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Button size="small" onClick={markAllAsRead} variant="outlined">
            Mark All Read
          </Button>
          <Button
            size="small"
            onClick={clearAllNotifications}
            variant="outlined"
            color="error"
          >
            Clear All
          </Button>
        </Box>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <CheckCircle sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
          <Typography variant="body2">No notifications</Typography>
        </Box>
      ) : (
        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {notifications.map((notification) => (
            <React.Fragment key={notification.id}>
              <ListItem
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  alignItems: 'flex-start',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => clearNotification(notification.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: `${getColor(notification.type)}.main`,
                    }}
                  >
                    {getIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <Chip
                          label="NEW"
                          size="small"
                          color="primary"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(notification.timestamp), 'MMM dd, hh:mm a')}
                      </Typography>
                    </>
                  }
                  onClick={() => !notification.read && markAsRead(notification.id)}
                  sx={{ cursor: notification.read ? 'default' : 'pointer' }}
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
    </Drawer>
  );
};

export default NotificationDrawer;