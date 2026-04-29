import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class EmailService {
  // Send visitor approval notification
  async sendVisitorApprovalEmail(visitor, resident) {
    try {
      await axios.post(
        `${API_URL}/email/visitor-approval`,
        {
          to: visitor.visitor_email,
          visitorName: visitor.visitor_name,
          residentName: resident.full_name,
          apartment: resident.apartment_number,
          uniqueCode: visitor.unique_code,
          expectedArrival: visitor.expected_arrival,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send visitor approval email error:', error);
    }
  }

  // Send bill reminder
  async sendBillReminder(bill, resident) {
    try {
      await axios.post(
        `${API_URL}/email/bill-reminder`,
        {
          to: resident.email,
          residentName: resident.full_name,
          billNumber: bill.bill_number,
          billType: bill.bill_type,
          amount: bill.amount,
          dueDate: bill.due_date,
          monthYear: bill.month_year,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send bill reminder error:', error);
    }
  }

  // Send payment receipt
  async sendPaymentReceipt(payment, bills, resident) {
    try {
      await axios.post(
        `${API_URL}/email/payment-receipt`,
        {
          to: resident.email,
          residentName: resident.full_name,
          transactionId: payment.transaction_id,
          amount: payment.amount,
          paidAt: payment.paid_at,
          bills: bills.map(b => ({
            billNumber: b.bill_number,
            billType: b.bill_type,
            amount: b.amount,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send payment receipt error:', error);
    }
  }

  // Send complaint update notification
  async sendComplaintUpdateEmail(complaint, resident) {
    try {
      await axios.post(
        `${API_URL}/email/complaint-update`,
        {
          to: resident.email,
          residentName: resident.full_name,
          complaintNumber: complaint.complaint_number,
          title: complaint.title,
          status: complaint.status,
          assignedTo: complaint.assigned_to_name,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send complaint update email error:', error);
    }
  }

  // Send notice notification
  async sendNoticeEmail(notice, residents) {
    try {
      await axios.post(
        `${API_URL}/email/notice`,
        {
          recipients: residents.map(r => r.email),
          title: notice.title,
          content: notice.content,
          priority: notice.priority,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send notice email error:', error);
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    try {
      await axios.post(
        `${API_URL}/email/welcome`,
        {
          to: user.email,
          name: user.full_name,
          apartment: user.apartment_number,
          role: user.role,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send welcome email error:', error);
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email) {
    try {
      await axios.post(`${API_URL}/email/password-reset`, { email });
    } catch (error) {
      console.error('Send password reset email error:', error);
      throw error;
    }
  }

  // Send monthly statement
  async sendMonthlyStatement(resident, bills, payments) {
    try {
      await axios.post(
        `${API_URL}/email/monthly-statement`,
        {
          to: resident.email,
          residentName: resident.full_name,
          apartment: resident.apartment_number,
          month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          bills,
          payments,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send monthly statement error:', error);
    }
  }

  // Send bulk email (for management)
  async sendBulkEmail(recipients, subject, body, attachments = []) {
    try {
      await axios.post(
        `${API_URL}/email/bulk`,
        {
          recipients,
          subject,
          body,
          attachments,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send bulk email error:', error);
      throw error;
    }
  }

  // Send SOS alert email
  async sendSOSAlertEmail(sosAlert, guards, management) {
    try {
      const recipients = [
        ...guards.map(g => g.email),
        ...management.map(m => m.email),
      ];

      await axios.post(
        `${API_URL}/email/sos-alert`,
        {
          recipients,
          triggeredBy: sosAlert.full_name,
          apartment: sosAlert.apartment_number,
          location: {
            latitude: sosAlert.latitude,
            longitude: sosAlert.longitude,
          },
          timestamp: sosAlert.created_at,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send SOS alert email error:', error);
    }
  }

  // Send amenity booking confirmation
  async sendBookingConfirmation(booking, resident, amenity) {
    try {
      await axios.post(
        `${API_URL}/email/booking-confirmation`,
        {
          to: resident.email,
          residentName: resident.full_name,
          amenityName: amenity.name,
          bookingNumber: booking.booking_number,
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          amount: booking.total_amount,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Send booking confirmation error:', error);
    }
  }
}

export default new EmailService();