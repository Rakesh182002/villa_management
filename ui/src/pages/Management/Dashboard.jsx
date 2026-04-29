import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Avatar, Chip,
  LinearProgress, List, ListItem, ListItemAvatar, ListItemText,
  Divider, Button, CircularProgress, Paper,
} from '@mui/material';
import {
  People, Apartment, Report, AccountBalance, TrendingUp,
  DirectionsWalk, Warning, CheckCircle, Assignment, Receipt,
} from '@mui/icons-material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { managementAPI, complaintAPI, billAPI } from '../../services/api';
import StatCard from '../../components/Common/StatCard';
import PageHeader from '../../components/Common/PageHeader';
import { formatCurrency, formatDate } from '../../utils/helpers';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const ManagementDashboard = () => {
  const { user } = useAuth();
  const { showSnackbar } = useNotification();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [complaintStats, setComplaintStats] = useState(null);
  const [billStats, setBillStats] = useState(null);
  const [visitorAnalytics, setVisitorAnalytics] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, compRes, billRes, visRes] = await Promise.all([
        managementAPI.getDashboard(),
        complaintAPI.getStats(),
        billAPI.getStats(),
        managementAPI.getVisitorAnalytics(),
      ]);
      setStats(dashRes.data.data);
      setComplaintStats(compRes.data.data);
      setBillStats(billRes.data.data);
      setVisitorAnalytics(visRes.data.data);
    } catch {
      showSnackbar('Error loading dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Build chart data from bill stats
  const collectionData = billStats?.byType?.map(t => ({
    name: t.bill_type,
    amount: parseFloat(t.total),
    count: t.count,
  })) || [];

  const complaintPieData = complaintStats?.byCategory?.map((c, i) => ({
    name: c.category,
    value: c.count,
    color: COLORS[i % COLORS.length],
  })) || [];

  return (
    <>
      <Helmet><title>Management Dashboard</title></Helmet>
      <Box>
        <PageHeader
          title={`Welcome, ${user?.full_name} 👋`}
          subtitle="Society overview and analytics"
          actions={
            <Button variant="outlined" startIcon={<TrendingUp />} onClick={fetchData}>
              Refresh
            </Button>
          }
        />

        {/* Key Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Flats"
              value={stats?.total_apartments || '—'}
              icon={<Apartment />}
              color="primary"
              loading={loading}
              subtitle={`${stats?.occupied_apartments || 0} occupied`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Monthly Collection"
              value={stats?.collected_amount ? formatCurrency(stats.collected_amount) : '—'}
              icon={<AccountBalance />}
              color="success"
              loading={loading}
              subtitle={`${stats?.pending_amount ? formatCurrency(stats.pending_amount) : 0} pending`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Open Complaints"
              value={stats?.open_complaints || '—'}
              icon={<Report />}
              color="warning"
              loading={loading}
              subtitle={`${stats?.high_priority_complaints || 0} high priority`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Today's Visitors"
              value={stats?.today_visitors || '—'}
              icon={<DirectionsWalk />}
              color="info"
              loading={loading}
              subtitle={`${stats?.visitors_inside || 0} currently inside`}
            />
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Collection Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Monthly Bill Collection
                </Typography>
                {loading ? (
                  <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={collectionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Complaints Pie */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Complaints by Category
                </Typography>
                {loading ? (
                  <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress />
                  </Box>
                ) : complaintPieData.length === 0 ? (
                  <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">No data</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={complaintPieData} cx="50%" cy="50%" outerRadius={80}
                        dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {complaintPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bottom row */}
        <Grid container spacing={3}>
          {/* Fund Summary */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Maintenance Fund
                </Typography>
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    {loading ? '—' : formatCurrency(stats?.fund?.balance || 0)}
                  </Typography>
                  <Typography color="text.secondary">Current Balance</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {loading ? '—' : formatCurrency(stats?.collection?.collected || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Income</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="error.main">
                      {loading ? '—' : formatCurrency(stats?.collection?.pending || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Outstanding</Typography>
                  </Box>
                </Box>
                <Button fullWidth variant="outlined" sx={{ mt: 2 }} href="/management/financials">
                  View Financials
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Bill Overview */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Bill Overview (This Month)
                </Typography>
                {loading ? <LinearProgress sx={{ mt: 2 }} /> : (
                  <>
                    <Box sx={{ mt: 2 }}>
                      {[
                        { label: 'Total Bills', value: billStats?.overview?.total_bills || 0, color: 'text.primary' },
                        { label: 'Paid', value: billStats?.overview?.paid_count || 0, color: 'success.main' },
                        { label: 'Unpaid', value: billStats?.overview?.unpaid_count || 0, color: 'error.main' },
                      ].map((item) => (
                        <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                          <Typography variant="body2">{item.label}</Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: item.color }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    {billStats?.overview?.total_bills > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption">Collection Rate</Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {Math.round((billStats.overview.paid_count / billStats.overview.total_bills) * 100)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(billStats.overview.paid_count / billStats.overview.total_bills) * 100}
                          color="success"
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )}
                    <Button fullWidth variant="outlined" sx={{ mt: 2 }} href="/management/bills">
                      Manage Bills
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Complaint Summary */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Complaint Summary
                </Typography>
                {loading ? <LinearProgress sx={{ mt: 2 }} /> : (
                  <>
                    <Box sx={{ mt: 2 }}>
                      {[
                        { label: 'Total', value: complaintStats?.overview?.total || 0, color: 'text.primary' },
                        { label: 'Open', value: complaintStats?.overview?.open || 0, color: 'error.main' },
                        { label: 'In Progress', value: complaintStats?.overview?.in_progress || 0, color: 'warning.main' },
                        { label: 'Resolved', value: complaintStats?.overview?.resolved || 0, color: 'success.main' },
                      ].map((item) => (
                        <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                          <Typography variant="body2">{item.label}</Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: item.color }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    {complaintStats?.overview?.avg_resolution_hours > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Avg resolution: {Math.round(complaintStats.overview.avg_resolution_hours)}h
                      </Typography>
                    )}
                    <Button fullWidth variant="outlined" sx={{ mt: 2 }} href="/management/complaints">
                      View Complaints
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default ManagementDashboard;