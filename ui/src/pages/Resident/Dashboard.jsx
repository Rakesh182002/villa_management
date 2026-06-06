import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Skeleton,
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
import { formatDateTime } from '../../utils/helpers';
import PageHeader from '../../components/Common/PageHeader';

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

// ── Full-page skeleton shown while data loads ──────────────────────────────
const SkeletonDashboard = () => (
  <Box>
    {/* Header skeleton */}
    <Box sx={{ mb: 3 }}>
      <Skeleton variant="text" width={280} height={44} />
      <Skeleton variant="text" width={200} height={24} />
    </Box>

    {/* Stat-card skeletons */}
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {[...Array(4)].map((_, i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Skeleton variant="circular" width={48} height={48} />
              </Box>
              <Skeleton variant="text" width="40%" height={48} />
              <Skeleton variant="text" width="60%" height={20} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>

    {/* Activity-card skeletons */}
    <Grid container spacing={3}>
      {[...Array(2)].map((_, i) => (
        <Grid item xs={12} md={6} key={i}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={140} height={32} sx={{ mb: 1 }} />
              {[...Array(4)].map((__, j) => (
                <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5,
                    borderBottom: j < 3 ? 1 : 0, borderColor: 'divider' }}>
                  <Skeleton variant="circular" width={40} height={40} sx={{ flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="55%" height={20} />
                    <Skeleton variant="text" width="75%" height={16} />
                  </Box>
                  <Skeleton variant="rounded" width={64} height={24} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Box>
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

  const fetchDashboardData = async (showFullLoader = false) => {
    if (showFullLoader) setLoading(true);
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

  if (loading) {
    return (
      <>
        <Helmet><title>Dashboard - Resident</title></Helmet>
        <SkeletonDashboard />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Resident</title>
      </Helmet>

      <Box>
         <PageHeader
                  title={`Welcome, ${user?.full_name} 👋`}
                  subtitle="Here's what's happening in your society today"
                  actions={
                    <Button variant="outlined" startIcon={<TrendingUp />} onClick={() => fetchDashboardData(true)}>
                      Refresh
                    </Button>
                  }
                />

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Visitors Today"
              value={stats.visitors||0}
              icon={<People />}
              color="primary"
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Staff Present"
              value={stats.staffAttendance||0}
              icon={<PersonAdd />}
              color="success"
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Open Complaints"
              value={stats.complaints||0}
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
                {recentVisitors.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    No recent visitors
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                          <Avatar sx={{ flexShrink: 0 }}>{visitor.visitor_name.charAt(0)}</Avatar>
                          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                            <Typography variant="subtitle2" fontWeight="bold" noWrap>
                              {visitor.visitor_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {visitor.purpose}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {formatDateTime(visitor.actual_entry)}{visitor.actual_exit ? ` — ${formatDateTime(visitor.actual_exit)}` : ''}
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
                {unpaidBills.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      All bills paid!
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
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

      </Box>
    </>
  );
};

export default ResidentDashboard;