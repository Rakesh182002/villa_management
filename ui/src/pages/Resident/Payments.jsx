import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Tab,
  Tabs,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Payment,
  Download,
  Receipt,
  CheckCircle,
  Error,
  AccessTime,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { billAPI } from '../../services/api';
import paymentService from '../../services/payment';
import pdfService from '../../services/pdf';
import emailService from '../../services/email';
import { formatCurrency } from '../../utils/helpers';

const Payments = () => {
  const { user } = useAuth();
  const { showSnackbar } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [selectedBills, setSelectedBills] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await billAPI.getAll();
      setBills(response.data.data);
    } catch (error) {
      showSnackbar('Error fetching bills', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSelectedBills([]);
  };

  const handleSelectBill = (billId) => {
    setSelectedBills((prev) =>
      prev.includes(billId)
        ? prev.filter((id) => id !== billId)
        : [...prev, billId]
    );
  };

  const handleSelectAll = () => {
    const unpaidBills = getFilteredBills().filter(b => b.status === 'unpaid');
    if (selectedBills.length === unpaidBills.length) {
      setSelectedBills([]);
    } else {
      setSelectedBills(unpaidBills.map(b => b.id));
    }
  };

  const handlePaySingle = async (bill) => {
    setProcessing(true);
    try {
      const result = await paymentService.processPayment(
        bill.id,
        {
          amount: bill.amount,
          bill_type: bill.bill_type,
          month_year: bill.month_year,
        },
        {
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
        }
      );

      if (result.success) {
        showSnackbar('Payment successful!', 'success');
        
        // Update bill status
        await billAPI.pay(bill.id);
        
        // Send email receipt
        await emailService.sendPaymentReceipt(
          { transaction_id: result.paymentId, amount: bill.amount, paid_at: new Date() },
          [bill],
          user
        );
        
        // Refresh bills
        fetchBills();
        
        // Show receipt dialog
        setCurrentReceipt({ payment: result, bills: [bill] });
        setReceiptDialog(true);
      }
    } catch (error) {
      showSnackbar(error.message || 'Payment failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayMultiple = async () => {
    if (selectedBills.length === 0) {
      showSnackbar('Please select bills to pay', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const billsToPay = bills.filter(b => selectedBills.includes(b.id));
      
      const result = await paymentService.processBulkPayment(
        billsToPay,
        {
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
        }
      );

      if (result.success) {
        showSnackbar(`Successfully paid ${billsToPay.length} bills!`, 'success');
        
        // Mark all as paid
        for (const billId of selectedBills) {
          await billAPI.pay(billId);
        }
        
        // Send consolidated receipt
        const totalAmount = billsToPay.reduce((sum, b) => sum + Number(b.amount || 0), 0);
        await emailService.sendPaymentReceipt(
          { transaction_id: result.paymentId, amount: totalAmount, paid_at: new Date() },
          billsToPay,
          user
        );
        
        fetchBills();
        setSelectedBills([]);
        setCurrentReceipt({ payment: result, bills: billsToPay });
        setReceiptDialog(true);
      }
    } catch (error) {
      showSnackbar(error.message || 'Payment failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (currentReceipt) {
      pdfService.downloadReceipt(
        currentReceipt.payment,
        currentReceipt.bills,
        user
      );
      showSnackbar('Receipt downloaded', 'success');
    }
  };

  const handleDownloadBill = (bill) => {
    pdfService.downloadBillPDF(bill, user);
    showSnackbar('Bill downloaded', 'success');
  };

  const getFilteredBills = () => {
    switch (tabValue) {
      case 0: // All
        return bills;
      case 1: // Unpaid
        return bills.filter(b => b.status === 'unpaid');
      case 2: // Paid
        return bills.filter(b => b.status === 'paid');
      default:
        return bills;
    }
  };

  const getTotalAmount = () => {
    return selectedBills.reduce((sum, billId) => {
      const bill = bills.find(b => b.id === billId);
      return sum + Number(bill?.amount || 0);
    }, 0);
  };

  const filteredBills = getFilteredBills();
  const unpaidCount = bills.filter(b => b.status === 'unpaid').length;
  const totalUnpaid = bills.filter(b => b.status === 'unpaid').reduce((sum, b) => sum + Number(b.amount || 0), 0);

  return (
    <>
      <Helmet>
        <title>Payments - Resident</title>
      </Helmet>

      <Box>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Payments & Bills
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your society payments
          </Typography>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Error color="error" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {unpaidCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unpaid Bills
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Payment color="warning" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {formatCurrency(totalUnpaid)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Outstanding
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircle color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {bills.filter(b => b.status === 'paid').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Paid This Year
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bulk Payment Section */}
        {selectedBills.length > 0 && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handlePayMultiple}
                disabled={processing}
              >
                Pay {formatCurrency(getTotalAmount())}
              </Button>
            }
          >
            {selectedBills.length} bill(s) selected
          </Alert>
        )}

        {/* Bills Table */}
        <Card>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label={`All (${bills.length})`} />
            <Tab label={`Unpaid (${unpaidCount})`} />
            <Tab label={`Paid (${bills.length - unpaidCount})`} />
          </Tabs>

          {loading ? (
            <LinearProgress />
          ) : filteredBills.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No bills found
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {tabValue === 1 && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedBills.length === filteredBills.length}
                          indeterminate={selectedBills.length > 0 && selectedBills.length < filteredBills.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                    )}
                    <TableCell>Bill Number</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Month/Year</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      {tabValue === 1 && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedBills.includes(bill.id)}
                            onChange={() => handleSelectBill(bill.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>{bill.bill_number}</TableCell>
                      <TableCell>
                        <Chip label={bill.bill_type} size="small" />
                      </TableCell>
                      <TableCell>{bill.month_year}</TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">{formatCurrency(bill.amount)}</Typography>
                      </TableCell>
                      <TableCell>
                        {format(new Date(bill.due_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={bill.status}
                          size="small"
                          color={bill.status === 'paid' ? 'success' : 'error'}
                          icon={bill.status === 'paid' ? <CheckCircle /> : <AccessTime />}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small" onClick={() => handleDownloadBill(bill)}>
                            <Download fontSize="small" />
                          </IconButton>
                          {bill.status === 'unpaid' && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handlePaySingle(bill)}
                              disabled={processing}
                            >
                              Pay Now
                            </Button>
                          )}
                          {bill.status === 'paid' && bill.transaction_id && (
                            <IconButton size="small" color="success">
                              <Receipt fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Box>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} onClose={() => setReceiptDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            Payment Successful
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Your payment has been processed successfully!
          </Typography>
          {currentReceipt && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Transaction ID:</strong> {currentReceipt.payment.paymentId}
              </Typography>
              <Typography variant="body2">
                <strong>Amount:</strong> {formatCurrency(currentReceipt.bills.reduce((sum, b) => sum + Number(b.amount || 0), 0))}
              </Typography>
              <Typography variant="body2">
                <strong>Bills Paid:</strong> {currentReceipt.bills.length}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialog(false)}>Close</Button>
          <Button onClick={handleDownloadReceipt} variant="contained" startIcon={<Download />}>
            Download Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Payments;