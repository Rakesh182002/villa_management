import api from './api';

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

class PaymentService {
  constructor() {
    this.razorpay = null;
  }

  // Load Razorpay script dynamically
  loadRazorpay() {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  // Create Razorpay order
  async createOrder(amount, billId, billDetails) {
    try {
      const response = await api.post(
        '/payment/create-order',
        {
          amount: amount * 100, // Convert to paise
          currency: 'INR',
          receipt: `bill_${billId}`,
          notes: {
            billId,
            billType: billDetails.bill_type,
            monthYear: billDetails.month_year,
          },
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Create order error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create payment order');
    }
  }

  // Verify payment signature
  async verifyPayment(paymentData) {
    try {
      const response = await api.post(
        '/payment/verify',
        paymentData
      );

      return response.data;
    } catch (error) {
      console.error('Verify payment error:', error);
      throw new Error(error.response?.data?.message || 'Payment verification failed');
    }
  }

  // Process payment with Razorpay
  async processPayment(billId, billDetails, userDetails) {
    // Load Razorpay script
    const loaded = await this.loadRazorpay();
    if (!loaded) {
      throw new Error('Failed to load Razorpay SDK');
    }

    // Create order
    const order = await this.createOrder(billDetails.amount, billId, billDetails);

    // Razorpay options
    const options = {
      key: RAZORPAY_KEY,
      amount: order.amount,
      currency: order.currency,
      name: 'Society Management',
      description: `${billDetails.bill_type} - ${billDetails.month_year}`,
      order_id: order.id,
      prefill: {
        name: userDetails.full_name,
        email: userDetails.email,
        contact: userDetails.phone,
      },
      theme: {
        color: '#3b82f6',
      },
      modal: {
        ondismiss: () => {
          console.log('Payment cancelled by user');
        },
      },
    };

    return new Promise((resolve, reject) => {
      options.handler = async (response) => {
        try {
          // Verify payment with backend
          const verificationData = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            billId,
          };

          const verifyResult = await this.verifyPayment(verificationData);
          resolve({
            success: true,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            ...verifyResult,
          });
        } catch (error) {
          reject(error);
        }
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response) => {
        reject({
          success: false,
          message: response.error.description,
          code: response.error.code,
        });
      });

      rzp.open();
    });
  }

  // Generate payment receipt
  async getReceipt(paymentId) {
    try {
      const response = await api.get(
        `/payment/receipt/${paymentId}`,
        {
          responseType: 'blob',
        }
      );

      return response.data;
    } catch (error) {
      console.error('Get receipt error:', error);
      throw new Error('Failed to generate receipt');
    }
  }

  // Bulk payment for multiple bills
  async processBulkPayment(bills, userDetails) {
    const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
    
    const loaded = await this.loadRazorpay();
    if (!loaded) {
      throw new Error('Failed to load Razorpay SDK');
    }

    // Create bulk order
    const response = await api.post(
      '/payment/bulk-order',
      {
        amount: totalAmount * 100,
        bills: bills.map(b => b.id),
      }
    );

    const order = response.data.data;

    const options = {
      key: RAZORPAY_KEY,
      amount: order.amount,
      currency: order.currency,
      name: 'Society Management',
      description: `Payment for ${bills.length} bills`,
      order_id: order.id,
      prefill: {
        name: userDetails.full_name,
        email: userDetails.email,
        contact: userDetails.phone,
      },
      theme: {
        color: '#3b82f6',
      },
    };

    return new Promise((resolve, reject) => {
      options.handler = async (response) => {
        try {
          const verifyResult = await this.verifyPayment({
            ...response,
            bills: bills.map(b => b.id),
          });
          resolve({
            success: true,
            paymentId: response.razorpay_payment_id,
            ...verifyResult,
          });
        } catch (error) {
          reject(error);
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        reject({
          success: false,
          message: response.error.description,
        });
      });
      rzp.open();
    });
  }

  // Get payment history
  async getPaymentHistory(filters = {}) {
    try {
      const response = await api.get('/payment/history', {
        params: filters
      });

      return response.data.data;
    } catch (error) {
      console.error('Get payment history error:', error);
      throw new Error('Failed to fetch payment history');
    }
  }

  // Refund payment (for management)
  async initiateRefund(paymentId, amount, reason) {
    try {
      const response = await api.post(
        '/payment/refund',
        {
          paymentId,
          amount: amount * 100,
          reason,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Refund error:', error);
      throw new Error(error.response?.data?.message || 'Refund failed');
    }
  }
}

export default new PaymentService();