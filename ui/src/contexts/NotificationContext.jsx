import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Setup socket listeners for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Visitor notifications
    socketService.onVisitorRequest((data) => {
      addNotification({
        type: 'visitor',
        title: 'New Visitor Request',
        message: `${data.visitor_name} is requesting entry`,
        data,
      });
      showBrowserNotification('New Visitor', `${data.visitor_name} is at the gate`);
      playNotificationSound();
    });

    socketService.onVisitorEntered((data) => {
      addNotification({
        type: 'visitor',
        title: 'Visitor Entered',
        message: `${data.visitor.visitor_name} has entered`,
        data,
      });
    });

    socketService.onVisitorExited((data) => {
      showSnackbar(`${data.visitor.visitor_name} has exited`, 'info');
    });

    socketService.onOverstayAlert((data) => {
      addNotification({
        type: 'warning',
        title: 'Overstay Alert',
        message: `${data.visitor.visitor_name} has exceeded time limit`,
        data,
      });
      showBrowserNotification('Overstay Alert', `Visitor overstaying at ${data.visitor.apartment_number}`);
    });

    // SOS notifications
    socketService.onSOSAlert((data) => {
      addNotification({
        type: 'emergency',
        title: '🆘 SOS ALERT',
        message: `Emergency at ${data.apartment_number} - ${data.full_name}`,
        data,
        priority: 'high',
      });
      showBrowserNotification('🆘 EMERGENCY ALERT', `SOS from ${data.apartment_number}`, true);
      playNotificationSound();
    });

    // Staff notifications
    socketService.onStaffEntered((data) => {
      addNotification({
        type: 'staff',
        title: 'Staff Arrived',
        message: `${data.staff_name} (${data.staff_type}) has arrived`,
        data,
      });
    });

    socketService.onStaffExited((data) => {
      showSnackbar(`${data.staff_name} has left`, 'info');
    });

    // Complaint notifications
    socketService.onComplaintStatusChanged((data) => {
      addNotification({
        type: 'complaint',
        title: 'Complaint Updated',
        message: `Complaint #${data.complaint.complaint_number} is now ${data.status}`,
        data,
      });
    });

    // Notice notifications
    socketService.onNewNotice((data) => {
      addNotification({
        type: 'notice',
        title: 'New Notice',
        message: data.title,
        data,
      });
      if (data.priority === 'urgent') {
        showBrowserNotification('Urgent Notice', data.title);
      }
    });

    // Chat notifications
    socketService.onNewMessage((data) => {
      if (data.sender_id !== user.id) {
        addNotification({
          type: 'chat',
          title: 'New Message',
          message: `${data.sender_name}: ${data.message.substring(0, 50)}...`,
          data,
        });
        playNotificationSound();
      }
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, [isAuthenticated, user]);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      ...notification,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Show snackbar
    const variant = notification.priority === 'high' ? 'error' : 
                    notification.type === 'emergency' ? 'error' :
                    notification.type === 'warning' ? 'warning' : 'info';
    
    showSnackbar(notification.message, variant, notification.title);
  };

  const showSnackbar = (message, variant = 'default', title = null) => {
    enqueueSnackbar(title ? `${title}: ${message}` : message, {
      variant,
      autoHideDuration: 5000,
      anchorOrigin: {
        vertical: 'top',
        horizontal: 'right',
      },
      action: (key) => (
        <IconButton size="small" onClick={() => closeSnackbar(key)} sx={{ color: 'white' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      ),
    });
  };

  const showBrowserNotification = (title, body, requireInteraction = false) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/badge.png',
        requireInteraction,
        tag: 'society-notification',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch((e) => console.log('Audio play failed:', e));
  };

  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotification = (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const value = {
    notifications,
    unreadCount,
    showSnackbar,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;