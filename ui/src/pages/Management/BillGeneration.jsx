import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, TextField,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, LinearProgress, Alert, Tabs, Tab, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
} from '@mui/material';
import {
  Receipt, Add, Download, Send, CheckCircle, Error, Refresh,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { useNotification } from '../../contexts/NotificationContext';
import { billAPI } from '../../services/api';
import pdfService from '../../services/pdf';
import PageHeader from '../../components/Common/PageHeader';
import {
  formatCurrency, formatDate, getStatusColor,
  getCurrentMonthYear, MONTHS, BILL_TYPES,
} from '../../utils/helpers';

const BillGeneration = () => {
  const { showSnackbar } = useNotification();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [stats, setStats] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [genDialog, setGenDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({
    bill_type: 'maintenance',
    month_year: getCurrentMonthYear(),
    amount: '',
    due_date: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5), 'yyyy-MM-dd'),
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [billsRes, statsRes] = await Promise.all([
        billAPI.getAllBills(),
        billAPI.getStats(),
      ]);
      setBills(billsRes.data.data);
      setStats(statsRes.data.data);
    } catch { showSnackbar('Error loading bills', 'error'); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!genForm.amount || !genForm.due_date) {
      showSnackbar('Please fill all required fields', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const res = await billAPI.generate({ ...genForm, amount: parseFloat(genForm.amount) });
      showSnackbar(`Generated bills for ${res.data.count} residents!`, 'success');
      setGenDialog(false);
      fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error generating bills', 'error');
    } finally { setGenerating(false); }
  };

  const filteredBills = bills.filter((b) => {
    if (tabValue === 1) return b.status === 'unpaid';
    if (tabValue === 2) return b.status === 'paid';
    return true;
  });

  const collectionRate = stats?.overview?.total_bills > 0
    ? Math.round((stats.overview.paid_count / stats.overview.total_bills) * 100)
    : 0;

  return (
    <>
      <Helmet><title>Bill Generation</title></Helmet>
      <Box>
        <PageHeader
          title="Bill Generation & Management"
          subtitle="Generate and track society bills"
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => setGenDialog(true)}>
                Generate Bills
              </Button>
            </Box>
          }
        />

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Total Bills', value: stats?.overview?.total_bills, color: 'primary.main' },
            { label: 'Paid', value: stats?.overview?.paid_count, color: 'success.main' },
            { label: 'Unpaid', value: stats?.overview?.unpaid_count, color: 'error.main' },
            { label: 'Collection Rate', value: loading ? '—' : `${collectionRate}%`, color: 'info.main' },
          ].map((s) => (
            <Grid item xs={6} md={3} key={s.label}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: s.color }}>
                    {loading ? '—' : (s.value ?? 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Collection progress */}
        {stats && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Monthly Collection Progress
                </Typography>
                <Typography variant="subtitle2" fontWeight={600}>
                  {formatCurrency(stats.overview.paid_amount || 0)} / {formatCurrency(stats.overview.total_amount || 0)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={collectionRate}
                color={collectionRate >= 80 ? 'success' : collectionRate >= 50 ? 'warning' : 'error'}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {collectionRate}% collected · {formatCurrency(stats.overview.unpaid_amount || 0)} outstanding
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Bills Table */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
              <Tab label={`All (${bills.length})`} />
              <Tab label={`Unpaid (${bills.filter(b => b.status === 'unpaid').length})`} />
              <Tab label={`Paid (${bills.filter(b => b.status === 'paid').length})`} />
            </Tabs>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Bill Number', 'Resident', 'Type', 'Month/Year', 'Amount', 'Due Date', 'Status'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id} hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">{bill.bill_number}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{bill.resident_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{bill.apartment_number}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={bill.bill_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{bill.month_year}</TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">{formatCurrency(bill.amount)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(bill.due_date)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={bill.status}
                          size="small"
                          color={getStatusColor(bill.status)}
                          icon={bill.status === 'paid' ? <CheckCircle /> : <Error />}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      {/* Generate Dialog */}
      <Dialog open={genDialog} onClose={() => setGenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Bills for All Residents</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will generate bills for ALL registered residents.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Bill Type *"
                value={genForm.bill_type}
                onChange={(e) => setGenForm({ ...genForm, bill_type: e.target.value })}>
                {BILL_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Month/Year *"
                value={genForm.month_year}
                onChange={(e) => setGenForm({ ...genForm, month_year: e.target.value })}
                placeholder="e.g. November 2024" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Amount per flat (₹) *" type="number"
                value={genForm.amount}
                onChange={(e) => setGenForm({ ...genForm, amount: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Due Date *" type="date"
                InputLabelProps={{ shrink: true }}
                value={genForm.due_date}
                onChange={(e) => setGenForm({ ...genForm, due_date: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleGenerate} disabled={generating}>
            {generating ? <CircularProgress size={20} color="inherit" /> : 'Generate Bills'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BillGeneration;