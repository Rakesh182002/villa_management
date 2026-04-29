import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Tab, Tabs,
  MenuItem, Select, FormControl, InputLabel, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
} from '@mui/material';
import {
  AccountBalance, TrendingUp, TrendingDown, Add, Download, Refresh,
} from '@mui/icons-material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useNotification } from '../../contexts/NotificationContext';
import { managementAPI } from '../../services/api';
import pdfService from '../../services/pdf';
import PageHeader from '../../components/Common/PageHeader';
import { formatCurrency, formatDate, MONTHS } from '../../utils/helpers';

const Financials = () => {
  const { showSnackbar } = useNotification();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [addDialog, setAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({
    type: 'income', category: '', amount: '', description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txnRes, finRes] = await Promise.all([
        managementAPI.getTransactions({
          start_date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
          end_date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-31`,
        }),
        managementAPI.getFinancials({ month: selectedMonth, year: selectedYear }),
      ]);
      setTransactions(txnRes.data.data);
      setFinancials(finRes.data.data);
    } catch { showSnackbar('Error loading financials', 'error'); }
    finally { setLoading(false); }
  };

  const handleAddTransaction = async () => {
    if (!form.category || !form.amount) {
      showSnackbar('Please fill required fields', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await managementAPI.addTransaction({
        ...form,
        amount: parseFloat(form.amount),
      });
      showSnackbar('Transaction added', 'success');
      setAddDialog(false);
      setForm({ type: 'income', category: '', amount: '', description: '', transaction_date: format(new Date(), 'yyyy-MM-dd') });
      fetchData();
    } catch { showSnackbar('Error adding transaction', 'error'); }
    finally { setSubmitting(false); }
  };

  const incomeTotal = financials?.monthly?.find(m => m.type === 'income')?.total || 0;
  const expenseTotal = financials?.monthly?.find(m => m.type === 'expense')?.total || 0;
  const balance = financials?.balance || 0;

  // Build chart data
  const categoryData = (financials?.byCategory || [])
    .filter(c => c.type === tabValue === 0 ? true : (tabValue === 1 ? 'income' : 'expense'))
    .slice(0, 8)
    .map(c => ({ name: c.category, amount: parseFloat(c.total) }));

  return (
    <>
      <Helmet><title>Financials</title></Helmet>
      <Box>
        <PageHeader
          title="Financial Management"
          subtitle="Track society income and expenses"
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialog(true)}>
                Add Transaction
              </Button>
            </Box>
          }
        />

        {/* Month/Year Filter */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Month</InputLabel>
            <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value)}>
              {MONTHS.map((m, i) => (
                <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
              {[2023, 2024, 2025, 2026].map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card sx={{ border: '2px solid', borderColor: 'success.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TrendingUp color="success" />
                    <Typography color="success.main" fontWeight={600}>Total Income</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {loading ? '—' : formatCurrency(incomeTotal)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {MONTHS[selectedMonth - 1]} {selectedYear}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card sx={{ border: '2px solid', borderColor: 'error.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TrendingDown color="error" />
                    <Typography color="error.main" fontWeight={600}>Total Expenses</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {loading ? '—' : formatCurrency(expenseTotal)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {MONTHS[selectedMonth - 1]} {selectedYear}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card sx={{ border: '2px solid', borderColor: balance >= 0 ? 'primary.main' : 'error.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccountBalance color="primary" />
                    <Typography color="primary" fontWeight={600}>Total Balance</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color={balance >= 0 ? 'success.main' : 'error.main'}>
                    {loading ? '—' : formatCurrency(balance)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">All time</Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Category Chart */}
        {categoryData.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Spending by Category
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {categoryData.map((_, i) => (
                      <rect key={i} fill={i % 2 === 0 ? '#3b82f6' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        <Card>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">Transactions</Typography>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
              <Tab label="All" />
              <Tab label="Income" />
              <Tab label="Expense" />
            </Tabs>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell></TableRow>
                ) : transactions.filter(t => tabValue === 0 || (tabValue === 1 ? t.type === 'income' : t.type === 'expense')).length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No transactions</TableCell></TableRow>
                ) : (
                  transactions
                    .filter(t => tabValue === 0 || (tabValue === 1 ? t.type === 'income' : t.type === 'expense'))
                    .map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell>{formatDate(t.transaction_date)}</TableCell>
                        <TableCell>
                          <Chip label={t.category} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{t.description || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={t.type}
                            size="small"
                            color={t.type === 'income' ? 'success' : 'error'}
                            icon={t.type === 'income' ? <TrendingUp /> : <TrendingDown />}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            fontWeight="bold"
                            color={t.type === 'income' ? 'success.main' : 'error.main'}
                          >
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      {/* Add Transaction Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Transaction</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Type *"
                value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <MenuItem value="income">Income</MenuItem>
                <MenuItem value="expense">Expense</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Category *"
                placeholder="e.g. Maintenance, Salary"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Amount (₹) *" type="number"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Date *" type="date"
                InputLabelProps={{ shrink: true }}
                value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline rows={2}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTransaction} disabled={submitting}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Add Transaction'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Financials;