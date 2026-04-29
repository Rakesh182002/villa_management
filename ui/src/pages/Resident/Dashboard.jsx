import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  People,
  PersonAdd,
  Report,
  Payment,
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../contexts/AuthContext';
import { visitorAPI, staffAPI, complaintAPI, billAPI } from '../../services/api';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, color, change, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          {change && (
            <Chip
              label={change}
              size="small"
              color={change.startsWith('+') ? 'success' : 'error'}
              icon={<TrendingUp />}
            />
          )}
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {loading ? '-' : value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  </motion.div>
);

const ResidentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    visitors: 0,
    staffAttendance: 0,
    complaints: 0,
    unpaidBills: 0,
  });
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [unpaidBills, setUnpaidBills] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [visitorsRes, staffRes, complaintsRes, billsRes] = await Promise.all([
        visitorAPI.getAll(),
        staffAPI.getInside(),
        complaintAPI.getAll({ status: 'open' }),
        billAPI.getAll({ status: 'unpaid' }),
      ]);

      setStats({
        visitors: visitorsRes.data.data.filter(v => v.status === 'entered').length,
        staffAttendance: staffRes.data.count,
        complaints: complaintsRes.data.count,
        unpaidBills: billsRes.data.count,
      });

      setRecentVisitors(visitorsRes.data.data.slice(0, 5));
      setUnpaidBills(billsRes.data.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - Resident</title>
      </Helmet>

      <Box>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Welcome back, {user?.full_name}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening in your society today
          </Typography>
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Visitors Today"
              value={stats.visitors}
              icon={<People />}
              color="primary"
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Staff Present"
              value={stats.staffAttendance}
              icon={<PersonAdd />}
              color="success"
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Open Complaints"
              value={stats.complaints}
              icon={<Report />}
              color="warning"
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Unpaid Bills"
              value={stats.unpaidBills}
              icon={<Payment />}
              color="error"
              loading={loading}
            />
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid container spacing={3}>
          {/* Recent Visitors */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Recent Visitors
                </Typography>
                {loading ? (
                  <LinearProgress />
                ) : recentVisitors.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    No recent visitors
                  </Typography>
                ) : (
                  <Box>
                    {recentVisitors.map((visitor) => (
                      <Box
                        key={visitor.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1.5,
                          borderBottom: 1,
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 0 },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar>{visitor.visitor_name.charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {visitor.visitor_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {visitor.purpose}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={visitor.status}
                          size="small"
                          color={
                            visitor.status === 'entered' ? 'success' :
                            visitor.status === 'exited' ? 'default' : 'warning'
                          }
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Unpaid Bills */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Pending Bills
                </Typography>
                {loading ? (
                  <LinearProgress />
                ) : unpaidBills.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      All bills paid!
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {unpaidBills.map((bill) => (
                      <Box
                        key={bill.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1.5,
                          borderBottom: 1,
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 0 },
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {bill.bill_type.toUpperCase()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Due: {new Date(bill.due_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" color="error.main">
                            ₹{bill.amount}
                          </Typography>
                          <Button size="small" variant="contained" sx={{ mt: 0.5 }}>
                            Pay Now
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<People />}
                sx={{ py: 2 }}
                href="/resident/visitors"
              >
                Invite Visitor
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Report />}
                sx={{ py: 2 }}
                href="/resident/complaints"
              >
                Raise Complaint
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Payment />}
                sx={{ py: 2 }}
                href="/resident/payments"
              >
                Pay Bills
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Schedule />}
                sx={{ py: 2 }}
                href="/resident/amenities"
              >
                Book Amenity
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<Warning />}
                sx={{ py: 2 }}
                href="/resident/sos"
              >
                SOS
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
};

export default ResidentDashboard;