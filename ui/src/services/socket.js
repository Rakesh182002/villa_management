import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(userId) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.connected = true;
      if (userId) {
        this.socket.emit('user:register', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Chat events
  joinChat(roomId) {
    this.socket?.emit('chat:join', roomId);
  }

  sendMessage(data) {
    this.socket?.emit('chat:message', data);
  }

  onNewMessage(callback) {
    this.socket?.on('chat:newMessage', callback);
  }

  sendTyping(data) {
    this.socket?.emit('chat:typing', data);
  }

  onUserTyping(callback) {
    this.socket?.on('chat:userTyping', callback);
  }

  onMessagesSeen(callback) {
    this.socket?.on('chat:messagesSeen', callback);
  }

  onReaction(callback) {
    this.socket?.on('chat:reaction', callback);
  }

  onMessageDeleted(callback) {
    this.socket?.on('chat:messageDeleted', callback);
  }

  // Visitor events
  onVisitorRequest(callback) {
    this.socket?.on('visitor:newRequest', callback);
  }

  onVisitorStatusUpdate(callback) {
    this.socket?.on('visitor:statusUpdate', callback);
  }

  onVisitorEntered(callback) {
    this.socket?.on('visitor:entered', callback);
  }

  onVisitorExited(callback) {
    this.socket?.on('visitor:exited', callback);
  }

  onOverstayAlert(callback) {
    this.socket?.on('visitor:overstayAlert', callback);
  }

  // Location events
  updateLocation(data) {
    this.socket?.emit('location:update', data);
  }

  onGuardLocationUpdate(callback) {
    this.socket?.on('location:guardUpdate', callback);
  }

  // SOS events
  triggerSOS(data) {
    this.socket?.emit('sos:trigger', data);
  }

  onSOSAlert(callback) {
    this.socket?.on('sos:alert', callback);
  }

  acknowledgeSOS(data) {
    this.socket?.emit('sos:acknowledge', data);
  }

  onSOSAcknowledged(callback) {
    this.socket?.on('sos:acknowledged', callback);
  }

  // Notice events
  onNewNotice(callback) {
    this.socket?.on('notice:new', callback);
  }

  // Complaint events
  onComplaintStatusChanged(callback) {
    this.socket?.on('complaint:statusChanged', callback);
  }

  // Staff events
  onStaffEntered(callback) {
    this.socket?.on('staff:entered', callback);
  }

  onStaffExited(callback) {
    this.socket?.on('staff:exited', callback);
  }

  // Online status
  onUserOnline(callback) {
    this.socket?.on('user:online', callback);
  }

  onUserOffline(callback) {
    this.socket?.on('user:offline', callback);
  }

  // Generic listener
  on(event, callback) {
    this.socket?.on(event, callback);
  }

  onAmenityBooked(callback) {
    this.socket?.on('amenity:booked', callback);
  }

  onAmenityCancelled(callback) {
    this.socket?.on('amenity:cancelled', callback);
  }

  off(event, callback) {
    this.socket?.off(event, callback);
  }

  // Remove all listeners
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

export default new SocketService();