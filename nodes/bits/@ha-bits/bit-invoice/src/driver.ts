/**
 * Invoice Driver for bit-invoice
 * 
 * Contains invoice PDF generation logic using jsPDF and jspdf-autotable.
 * Creates professional, good-looking invoices with:
 * - Dynamic header and footer
 * - Seller and customer details
 * - Customizable item table
 * - Automatic tax and total calculation
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceItem {
  [key: string]: string | number;
}

export interface InvoiceParty {
  lines: string[];
}

export interface CreateInvoiceParams {
  invoiceId: string;
  invoiceDate?: string;
  dueDate?: string;
  header?: { lines: string[] };
  footer?: { lines: string[] };
  seller: InvoiceParty;
  customer: InvoiceParty;
  items: InvoiceItem[];
  itemColumns: string[];
  taxColumn?: string;
  priceColumn?: string;
  currency?: string;
  primaryColor?: string;
  secondaryColor?: string;
  notes?: string[];
}

export interface CreateInvoiceResult {
  success: boolean;
  base64: string;
  invoiceId: string;
  total: number;
  subtotal: number;
  totalTax: number;
  itemCount: number;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 37, g: 99, b: 235 }; // Default blue
}

/**
 * Format number as currency
 */
function formatCurrency(value: number, currency: string): string {
  return `${currency}${value.toFixed(2)}`;
}

/**
 * Parse a value to number
 */
function parseNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Create a professional invoice PDF
 */
export async function createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResult> {
  const {
    invoiceId,
    invoiceDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    dueDate,
    header,
    footer,
    seller,
    customer,
    items,
    itemColumns,
    taxColumn = 'Tax',
    priceColumn = 'Price',
    currency = '$',
    primaryColor = '#2563eb',
    secondaryColor = '#f8fafc',
    notes
  } = params;

  if (!invoiceId) {
    throw new Error('Invoice ID is required');
  }
  if (!seller?.lines?.length) {
    throw new Error('Seller details are required');
  }
  if (!customer?.lines?.length) {
    throw new Error('Customer details are required');
  }
  if (!items?.length) {
    throw new Error('At least one item is required');
  }
  if (!itemColumns?.length) {
    throw new Error('Item columns are required');
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  const primary = hexToRgb(primaryColor);
  const secondary = hexToRgb(secondaryColor);
  
  let yPos = margin;

  // ============ HEADER SECTION ============
  
  // Draw header accent bar
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, 0, pageWidth, 8, 'F');
  
  yPos = 20;
  
  // Header lines (company logo area)
  if (header?.lines?.length) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text(header.lines[0] || '', margin, yPos);
    yPos += 8;
    
    if (header.lines.length > 1) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      for (let i = 1; i < header.lines.length; i++) {
        doc.text(header.lines[i], margin, yPos);
        yPos += 5;
      }
    }
  }
  
  // Invoice title and ID on the right
  const invoiceLabelX = pageWidth - margin;
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('INVOICE', invoiceLabelX, 28, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`#${invoiceId}`, invoiceLabelX, 36, { align: 'right' });

  yPos = Math.max(yPos, 50);

  // ============ INVOICE META INFO ============
  
  // Invoice date and due date box
  const metaBoxX = pageWidth - margin - 70;
  const metaBoxY = yPos;
  
  doc.setFillColor(secondary.r, secondary.g, secondary.b);
  doc.roundedRect(metaBoxX, metaBoxY, 70, dueDate ? 30 : 18, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Invoice Date:', metaBoxX + 5, metaBoxY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text(invoiceDate, metaBoxX + 5, metaBoxY + 14);
  
  if (dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Due Date:', metaBoxX + 5, metaBoxY + 22);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(dueDate, metaBoxX + 5, metaBoxY + 28);
  }

  // ============ PARTIES SECTION ============
  
  const partiesY = yPos + 5;
  const partyWidth = (contentWidth - 80) / 2;
  
  // Seller (From)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('FROM', margin, partiesY);
  
  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.setLineWidth(0.5);
  doc.line(margin, partiesY + 2, margin + 25, partiesY + 2);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  let sellerY = partiesY + 8;
  for (const line of seller.lines) {
    doc.text(line, margin, sellerY);
    sellerY += 5;
  }
  
  // Customer (To)
  const customerX = margin + partyWidth + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('TO', customerX, partiesY);
  
  doc.line(customerX, partiesY + 2, customerX + 15, partiesY + 2);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  let customerY = partiesY + 8;
  for (const line of customer.lines) {
    doc.text(line, customerX, customerY);
    customerY += 5;
  }

  yPos = Math.max(sellerY, customerY, metaBoxY + (dueDate ? 35 : 22)) + 10;

  // ============ ITEMS TABLE ============
  
  // Prepare table data
  const tableHead = [itemColumns];
  const tableBody: (string | number)[][] = [];
  
  let subtotal = 0;
  let totalTax = 0;
  
  for (const item of items) {
    const row: (string | number)[] = [];
    for (const col of itemColumns) {
      const value = item[col] ?? '';
      row.push(value);
      
      // Calculate totals
      if (col.toLowerCase() === taxColumn.toLowerCase()) {
        totalTax += parseNumber(value);
      }
      if (col.toLowerCase() === priceColumn.toLowerCase()) {
        subtotal += parseNumber(value);
      }
    }
    tableBody.push(row);
  }
  
  const total = subtotal + totalTax;
  
  // Find column indices for alignment
  const taxColIndex = itemColumns.findIndex(c => c.toLowerCase() === taxColumn.toLowerCase());
  const priceColIndex = itemColumns.findIndex(c => c.toLowerCase() === priceColumn.toLowerCase());
  
  // Generate column styles - right-align numeric columns
  const columnStyles: Record<number, { halign: 'left' | 'center' | 'right' }> = {};
  if (taxColIndex >= 0) columnStyles[taxColIndex] = { halign: 'right' };
  if (priceColIndex >= 0) columnStyles[priceColIndex] = { halign: 'right' };
  
  // Auto-detect numeric columns and right-align them
  for (let i = 0; i < itemColumns.length; i++) {
    const colName = itemColumns[i].toLowerCase();
    if (colName.includes('qty') || colName.includes('quantity') || 
        colName.includes('price') || colName.includes('amount') ||
        colName.includes('rate') || colName.includes('total') ||
        colName.includes('tax') || colName.includes('unit')) {
      columnStyles[i] = { halign: 'right' };
    }
  }
  
  // Draw the table
  autoTable(doc, {
    startY: yPos,
    head: tableHead,
    body: tableBody,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [primary.r, primary.g, primary.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [secondary.r, secondary.g, secondary.b],
    },
    columnStyles,
    theme: 'plain',
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
  });

  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
  yPos = finalY + 10;

  // ============ TOTALS SECTION ============
  
  const totalsX = pageWidth - margin - 80;
  const totalsWidth = 80;
  
  // Draw totals box
  doc.setFillColor(secondary.r, secondary.g, secondary.b);
  doc.roundedRect(totalsX - 5, yPos - 2, totalsWidth + 10, 40, 3, 3, 'F');
  
  // Subtotal
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Subtotal:', totalsX, yPos + 6);
  doc.setTextColor(40, 40, 40);
  doc.text(formatCurrency(subtotal, currency), totalsX + totalsWidth, yPos + 6, { align: 'right' });
  
  // Tax
  doc.setTextColor(80, 80, 80);
  doc.text('Tax:', totalsX, yPos + 14);
  doc.setTextColor(40, 40, 40);
  doc.text(formatCurrency(totalTax, currency), totalsX + totalsWidth, yPos + 14, { align: 'right' });
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(totalsX, yPos + 19, totalsX + totalsWidth, yPos + 19);
  
  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('TOTAL:', totalsX, yPos + 30);
  doc.text(formatCurrency(total, currency), totalsX + totalsWidth, yPos + 30, { align: 'right' });

  yPos += 50;

  // ============ NOTES SECTION ============
  
  if (notes?.length) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text('Notes', margin, yPos);
    
    doc.setDrawColor(primary.r, primary.g, primary.b);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 2, margin + 25, yPos + 2);
    
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    for (const note of notes) {
      doc.text(`• ${note}`, margin, yPos);
      yPos += 5;
    }
  }

  // ============ FOOTER SECTION ============
  
  if (footer?.lines?.length) {
    // Position footer at bottom
    const footerY = pageHeight - 25;
    
    // Draw footer separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    
    let footerLineY = footerY;
    for (const line of footer.lines) {
      doc.text(line, pageWidth / 2, footerLineY, { align: 'center' });
      footerLineY += 4;
    }
  }
  
  // Draw bottom accent bar
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

  // ============ GENERATE OUTPUT ============
  
  const base64 = doc.output('datauristring').split(',')[1];

  return {
    success: true,
    base64,
    invoiceId,
    total,
    subtotal,
    totalTax,
    itemCount: items.length,
  };
}
