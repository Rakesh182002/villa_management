import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { HelmetProvider } from 'react-helmet-async';

import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Layout
import DashboardLayout from './components/Layout/DashboardLayout';
import ProtectedRoute from './components/Layout/ProtectedRoute';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Resident Pages
import ResidentDashboard from './pages/Resident/Dashboard';
import VisitorManagement from './pages/Resident/VisitorManagement';
import StaffManagement from './pages/Resident/StaffManagement';
import Complaints from './pages/Resident/Complaints';
import Payments from './pages/Resident/Payments';
import Amenities from './pages/Resident/Amenities';
import Chat from './pages/Resident/Chat';
import NoticeBoard from './pages/Resident/NoticeBoard';
import Forum from './pages/Resident/Forum';
import Profile from './pages/Resident/Profile';
import SOS from './pages/Resident/SOS';

// Guard Pages
import GuardDashboard from './pages/Guard/Dashboard';
import VisitorEntry from './pages/Guard/VisitorEntry';
import QRScanner from './pages/Guard/QRScanner';
import StaffEntry from './pages/Guard/StaffEntry';
import LiveLocation from './pages/Guard/LiveLocation';
import SOSAlerts from './pages/Guard/SOSAlerts';

// Management Pages
import ManagementDashboard from './pages/Management/Dashboard';
import ResidentManagement from './pages/Management/ResidentManagement';
import ComplaintManagement from './pages/Management/ComplaintManagement';
import Financials from './pages/Management/Financials';
import BillGeneration from './pages/Management/BillGeneration';
import SecurityMonitoring from './pages/Management/SecurityMonitoring';
import NoticeManagement from './pages/Management/NoticeManagement';
import AmenityManagement from './pages/Management/AmenityManagement';
import StaffRegistry from './pages/Management/StaffRegistry';

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          autoHideDuration={5000}
        >
          <Router>
            <AuthProvider>
              <NotificationProvider>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<DashboardLayout />}>
                      {/* Resident Routes */}
                      <Route
                        path="/resident/dashboard"
                        element={<ProtectedRoute allowedRoles={['resident']}><ResidentDashboard /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/visitors"
                        element={<ProtectedRoute allowedRoles={['resident']}><VisitorManagement /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/staff"
                        element={<ProtectedRoute allowedRoles={['resident']}><StaffManagement /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/complaints"
                        element={<ProtectedRoute allowedRoles={['resident']}><Complaints /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/payments"
                        element={<ProtectedRoute allowedRoles={['resident']}><Payments /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/amenities"
                        element={<ProtectedRoute allowedRoles={['resident']}><Amenities /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/chat"
                        element={<ProtectedRoute allowedRoles={['resident']}><Chat /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/notices"
                        element={<ProtectedRoute allowedRoles={['resident']}><NoticeBoard /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/forum"
                        element={<ProtectedRoute allowedRoles={['resident']}><Forum /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/sos"
                        element={<ProtectedRoute allowedRoles={['resident']}><SOS /></ProtectedRoute>}
                      />
                      <Route
                        path="/resident/profile"
                        element={<ProtectedRoute allowedRoles={['resident']}><Profile /></ProtectedRoute>}
                      />

                      {/* Guard Routes */}
                      <Route
                        path="/guard/dashboard"
                        element={<ProtectedRoute allowedRoles={['guard']}><GuardDashboard /></ProtectedRoute>}
                      />
                      <Route
                        path="/guard/visitor-entry"
                        element={<ProtectedRoute allowedRoles={['guard']}><VisitorEntry /></ProtectedRoute>}
                      />
                      <Route
                        path="/guard/qr-scanner"
                        element={<ProtectedRoute allowedRoles={['guard']}><QRScanner /></ProtectedRoute>}
                      />
                      <Route
                        path="/guard/staff-entry"
                        element={<ProtectedRoute allowedRoles={['guard']}><StaffEntry /></ProtectedRoute>}
                      />
                      <Route
                        path="/guard/location"
                        element={<ProtectedRoute allowedRoles={['guard']}><LiveLocation /></ProtectedRoute>}
                      />
                      <Route
                        path="/guard/sos-alerts"
                        element={<ProtectedRoute allowedRoles={['guard']}><SOSAlerts /></ProtectedRoute>}
                      />

                      {/* Management Routes */}
                      <Route
                        path="/management/dashboard"
                        element={<ProtectedRoute allowedRoles={['management']}><ManagementDashboard /></ProtectedRoute>}
                      />
                      <Route
                        path="/management/residents"
                        element={<ProtectedRoute allowedRoles={['management']}><ResidentManagement /></ProtectedRoute>}
                      />
                      <Route
                        path="/management/complaints"
                        element={<ProtectedRoute allowedRoles={['management']}><ComplaintManagement /></ProtectedRoute>}
                      />
                      <Route
                        path="/management/financials"
                        element={<ProtectedRoute allowedRoles={['management']}><Financials /></ProtectedRoute>}
                      />
                      <Route
                        path="/management/bills"
                        element={<ProtectedRoute allowedRoles={['management']}><BillGeneration /></ProtectedRoute>}
                      />
                      <Route
                        path="/management/security"
                        element={<ProtectedRoute allowedRoles={['management']}><SecurityMonitoring /></ProtectedRoute>}
                      />
                      <Route
                        path="/management/notices"
                        element={<ProtectedRoute allowedRoles={['management']}><NoticeManagement /></ProtectedRoute>}
                      />
                      <Route
                        path="/management/amenities"
                        element={<ProtectedRoute allowedRoles={['management']}><AmenityManagement /></ProtectedRoute>}
                      />
                      <Route
                        path="/management/staff"
                        element={<ProtectedRoute allowedRoles={['management']}><StaffRegistry /></ProtectedRoute>}
                      />

                      {/* Default redirect based on role */}
                      <Route path="/" element={<Navigate to="/login" replace />} />
                    </Route>
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </NotificationProvider>
            </AuthProvider>
          </Router>
        </SnackbarProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;