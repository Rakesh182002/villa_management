import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket;

export const getSocket = () => {
  if (!socket) {
    const token = sessionStorage.getItem('token');
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
  }
  return socket;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (formData) => api.put('/auth/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword: (passwords) => api.put('/auth/password', passwords),
};

// Visitor API
export const visitorAPI = {
  create: (data) => api.post('/visitors', data),
  getAll: () => api.get('/visitors'),
  getPending: () => api.get('/visitors/pending'),
  verify: (code) => api.post('/visitors/verify', { unique_code: code }),
  updateStatus: (id, status) => api.put(`/visitors/${id}/status`, { status }),
  markEntry: (id) => api.put(`/visitors/${id}/entry`),
  markExit: (id) => api.put(`/visitors/${id}/exit`),
  getInside: () => api.get('/visitors/inside'),
  checkOverstay: () => api.get('/visitors/overstay'),
  guardInitiate: (data) => api.post('/visitors/guard-initiate', data),
};

// Staff API
export const staffAPI = {
  getAll: (params) => api.get('/staff', { params }),
  add: (formData) => api.post('/staff', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  verifyOnboarding: (id, otp) => api.post(`/staff/${id}/verify`, { otp }),
  update: (id, formData) => api.put(`/staff/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/staff/${id}`),
  assign: ({ id, role }, residentId) => api.post(`/staff/${id}/assign`, { role, resident_id: residentId }),
  unassign: (id) => api.delete(`/staff/${id}/unassign`),
  getMyStaff: () => api.get('/staff/my-staff'),
  requestOTP: (id, residentId) => api.post(`/staff/${id}/request-otp`, { resident_id: residentId }), // legacy
  markEntry: (id, residentId, passCode) => api.post(`/staff/${id}/entry`, { resident_id: residentId, pass_code: passCode }),
  markExit: (attendanceId) => api.put(`/staff/attendance/${attendanceId}/exit`),
  getAttendance: (id, params) => api.get(`/staff/${id}/attendance`, { params }),
  addReview: (id, review) => api.post(`/staff/${id}/review`, review),
  getReviews: (id) => api.get(`/staff/${id}/reviews`),
  getInside: () => api.get('/staff/inside/all'),
};

// Complaint API
export const complaintAPI = {
  create: (formData) => api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => api.get('/complaints', { params }),
  getOne: (id) => api.get(`/complaints/${id}`),
  updateStatus: (id, data) => api.put(`/complaints/${id}/status`, data),
  rate: (id, rating) => api.put(`/complaints/${id}/rate`, { rating }),
  getStats: () => api.get('/complaints/stats'),
};

// Bill API
export const billAPI = {
  getAll: (params) => api.get('/bills', { params }),
  getAllBills: (params) => api.get('/bills/all', { params }),
  generate: (data) => api.post('/bills/generate', data),
  pay: (id, paymentMethod) => api.post(`/bills/${id}/pay`, { payment_method: paymentMethod }),
  getStats: () => api.get('/bills/stats'),
};

// Amenity API
export const amenityAPI = {
  getAll: () => api.get('/amenities'),
  managementGetAll: () => api.get('/amenities/management'),
  create: (data) => api.post('/amenities', data),
  update: (id, data) => api.put(`/amenities/${id}`, data),
  toggleStatus: (id, is_active) => api.patch(`/amenities/${id}/toggle`, { is_active }),
  book: (id, data) => api.post(`/amenities/${id}/book`, data),
  getMyBookings: (params) => api.get('/amenities/my-bookings', { params }),
  getAllBookings: (params) => api.get('/amenities/all-bookings', { params }),
  cancel: (bookingId, remark) => api.put(`/amenities/bookings/${bookingId}/cancel`, { remark }),
  updateStatus: (id, status, remark) => api.patch(`/amenities/bookings/${id}/status`, { status, admin_remark: remark }),
  getAvailability: (id, date) => api.get(`/amenities/${id}/availability`, { params: { date } }),
  getAnalytics: () => api.get('/amenities/analytics'),
  submitFeedback: (id, data) => api.post(`/amenities/bookings/${id}/feedback`, data),
};

// Location API
export const locationAPI = {
  updateLocation: (data) => api.post('/location/update', data),
  getGuardLocations: () => api.get('/location/guards'),
  getHistory: (params) => api.get('/location/history', { params }),
  triggerSOS: (data) => api.post('/location/sos', data),
  acknowledgeSOS: (id) => api.put(`/location/sos/${id}/acknowledge`),
  resolveSOS: (id) => api.put(`/location/sos/${id}/resolve`),
  getSOSAlerts: (params) => api.get('/location/sos', { params }),
};

// Communication API
export const communicationAPI = {
  sendMessage: (formData) => api.post('/communication/messages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMessages: (userId) => api.get(`/communication/messages/${userId}`),
  getConversations: () => api.get('/communication/conversations'),
  markAsRead: (roomId) => api.put('/communication/messages/read', { room_id: roomId }),
  
  getNotices: (params) => api.get('/communication/notices', { params }),
  createNotice: (formData) => api.post('/communication/notices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  getForumTopics: (params) => api.get('/communication/forum/topics', { params }),
  createTopic: (data) => api.post('/communication/forum/topics', data),
  getComments: (topicId) => api.get(`/communication/forum/topics/${topicId}/comments`),
  addComment: (topicId, comment) => api.post(`/communication/forum/topics/${topicId}/comments`, { comment }),
  deleteMessage: (id, type) => api.delete(`/communication/messages/${id}?type=${type}`),
  deleteConversation: (userId) => api.delete(`/communication/conversations/${userId}`),
  searchResidents: (query) => api.get(`/communication/search-residents?q=${query}`),
};

// Management API
export const managementAPI = {
  getDashboard: () => api.get('/management/dashboard'),
  getResidents: () => api.get('/management/residents'),
  getApartments: (params) => api.get('/management/apartments', { params }),
  updateApartment: (id, data) => api.put(`/management/apartments/${id}`, data),
  getTransactions: (params) => api.get('/management/transactions', { params }),
  addTransaction: (data) => api.post('/management/transactions', data),
  getFinancials: (params) => api.get('/management/financials', { params }),
  getVisitorAnalytics: () => api.get('/management/visitor-analytics'),
};

export default api;