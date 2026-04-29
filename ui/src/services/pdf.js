import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

class PDFService {
  // Generate bill PDF
  generateBillPDF(bill, user) {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SOCIETY MANAGEMENT', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sunrise Heights, Hosur', 105, 28, { align: 'center' });
    
    // Add horizontal line
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Bill title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL RECEIPT', 105, 45, { align: 'center' });
    
    // Bill details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const leftCol = 20;
    const rightCol = 110;
    let yPos = 60;
    
    // Left column
    doc.text(`Bill Number:`, leftCol, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(bill.bill_number, leftCol + 35, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Bill Type:`, leftCol, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(bill.bill_type.toUpperCase(), leftCol + 35, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Month/Year:`, leftCol, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(bill.month_year, leftCol + 35, yPos);
    
    // Right column
    yPos = 60;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name:`, rightCol, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(user.full_name, rightCol + 25, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Apartment:`, rightCol, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(user.apartment_number, rightCol + 25, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Phone:`, rightCol, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(user.phone, rightCol + 25, yPos);
    
    // Amount section
    yPos = 90;
    doc.setLineWidth(0.3);
    doc.rect(20, yPos, 170, 30);
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Bill Amount:', 30, yPos);
    
    yPos += 10;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹ ${Number(bill.amount).toFixed(2)}`, 105, yPos, { align: 'center' });
    
    // Payment details if paid
    if (bill.status === 'paid' && bill.paid_at) {
      yPos = 135;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      doc.setFillColor(34, 197, 94);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('PAID', 105, yPos + 5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPos += 15;
      doc.text(`Payment Date: ${format(new Date(bill.paid_at), 'dd MMM yyyy, hh:mm a')}`, 20, yPos);
      
      yPos += 7;
      doc.text(`Transaction ID: ${bill.transaction_id}`, 20, yPos);
    } else {
      yPos = 135;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Due Date: ${format(new Date(bill.due_date), 'dd MMM yyyy')}`, 20, yPos);
      
      yPos += 7;
      doc.setFillColor(239, 68, 68);
      doc.rect(20, yPos, 30, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('UNPAID', 35, yPos + 4, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
    
    // Footer
    yPos = 270;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated document and does not require a signature.', 105, yPos, { align: 'center' });
    
    yPos += 5;
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 105, yPos, { align: 'center' });
    
    return doc;
  }

  // Download bill PDF
  downloadBillPDF(bill, user) {
    const doc = this.generateBillPDF(bill, user);
    doc.save(`Bill_${bill.bill_number}.pdf`);
  }

  // Generate payment receipt
  generateReceiptPDF(payment, bills, user) {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sunrise Heights Society', 105, 28, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Receipt details
    let yPos = 50;
    doc.setFontSize(10);
    
    doc.text(`Receipt No:`, 20, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(payment.transaction_id, 60, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Date:`, 20, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(format(new Date(payment.paid_at), 'dd MMM yyyy, hh:mm a'), 60, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Mode:`, 20, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text('Online (Razorpay)', 60, yPos);
    
    yPos += 15;
    doc.setFont('helvetica', 'normal');
    doc.text(`Received from:`, 20, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(user.full_name, 60, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Apartment:`, 20, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(user.apartment_number, 60, yPos);
    
    // Bills table
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details:', 20, yPos);
    
    yPos += 5;
    const tableData = Array.isArray(bills) ? bills : [bills];
    doc.autoTable({
      startY: yPos,
      head: [['Bill Number', 'Type', 'Month/Year', 'Amount']],
      body: tableData.map(bill => [
        bill.bill_number,
        bill.bill_type,
        bill.month_year,
        `₹ ${Number(bill.amount).toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });
    
    // Total amount
    const totalAmount = Array.isArray(bills) 
      ? bills.reduce((sum, bill) => sum + bill.amount, 0)
      : bills.amount;
    
    yPos = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount Paid:', 110, yPos);
    doc.text(`₹ ${Number(totalAmount).toFixed(2)}`, 170, yPos);
    
    // Signature
    yPos += 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signature', 140, yPos);
    doc.line(130, yPos - 2, 180, yPos - 2);
    
    // Footer
    yPos = 270;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your payment!', 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text('For queries, contact: admin@sunriseheights.com | +91-9876543210', 105, yPos, { align: 'center' });
    
    return doc;
  }

  // Download receipt
  downloadReceipt(payment, bills, user) {
    const doc = this.generateReceiptPDF(payment, bills, user);
    doc.save(`Receipt_${payment.transaction_id}.pdf`);
  }

  // Generate visitor pass PDF
  generateVisitorPassPDF(visitor, resident) {
    const doc = new jsPDF('landscape', 'mm', [100, 150]);
    
    // Background
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 150, 15, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('VISITOR PASS', 75, 10, { align: 'center' });
    
    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let yPos = 25;
    doc.text(`Visitor: ${visitor.visitor_name}`, 10, yPos);
    
    yPos += 8;
    doc.text(`Phone: ${visitor.visitor_phone}`, 10, yPos);
    
    yPos += 8;
    doc.text(`Visiting: ${resident.full_name}`, 10, yPos);
    
    yPos += 8;
    doc.text(`Apartment: ${resident.apartment_number}`, 10, yPos);
    
    yPos += 8;
    doc.text(`Purpose: ${visitor.purpose}`, 10, yPos);
    
    yPos += 8;
    doc.text(`Code: ${visitor.unique_code}`, 10, yPos);
    doc.setFont('helvetica', 'bold');
    
    // Valid date
    yPos += 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Valid for: ${format(new Date(visitor.expected_arrival), 'dd MMM yyyy')}`, 10, yPos);
    
    return doc;
  }

  // Generate complaint report
  async generateComplaintReportPDF(complaints) {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPLAINT REPORT', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, 105, 28, { align: 'center' });
    
    doc.autoTable({
      startY: 40,
      head: [['#', 'Title', 'Category', 'Priority', 'Status', 'Date']],
      body: complaints.map((c) => [
        c.complaint_number,
        c.title.substring(0, 30),
        c.category,
        c.priority,
        c.status,
        format(new Date(c.created_at), 'dd MMM')
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });
    
    return doc;
  }

  // Export element to PDF
  async exportElementToPDF(elementId, filename) {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
  }
}

export default new PDFService();