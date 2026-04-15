/**
 * @ha-bits/bit-invoice
 * 
 * Invoice generation bit for creating professional PDF invoices.
 * 
 * Operations:
 * - createInvoice: Generate a PDF invoice with dynamic content
 */

import * as driver from './driver';

export interface InvoiceItem {
  [key: string]: string | number;
}

export interface InvoiceParty {
  lines: string[];
}

export interface CreateInvoiceParams {
  // Invoice identification
  invoiceId: string;
  invoiceDate?: string;
  dueDate?: string;
  
  // Header and footer
  header?: {
    lines: string[];
  };
  footer?: {
    lines: string[];
  };
  
  // Parties
  seller: InvoiceParty;
  customer: InvoiceParty;
  
  // Items - dynamic columns with tax and price for totals
  items: InvoiceItem[];
  itemColumns: string[];  // Column headers (e.g., ["Description", "Quantity", "Unit Price", "Tax", "Price"])
  
  // Tax and price column names for calculation
  taxColumn?: string;     // Default: "Tax"
  priceColumn?: string;   // Default: "Price"
  
  // Styling options
  currency?: string;      // Default: "$"
  primaryColor?: string;  // Default: "#2563eb" (blue) - used for headers, accents
  secondaryColor?: string; // Default: "#f8fafc" (light gray) - used for backgrounds
  
  // Notes or terms
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

interface InvoiceContext {
  propsValue: Record<string, any>;
}

const invoiceBit = {
  displayName: 'Invoice',
  description: 'Generate professional PDF invoices with dynamic content',
  logoUrl: 'lucide:Receipt',
  runtime: 'all',
  
  actions: {
    createInvoice: {
      name: 'createInvoice',
      displayName: 'Create Invoice',
      description: 'Generate a PDF invoice with customizable header, footer, parties, and line items',
      props: {
        invoiceId: { 
          type: 'SHORT_TEXT', 
          displayName: 'Invoice ID', 
          description: 'Unique identifier for the invoice (e.g., INV-001)',
          required: true 
        },
        invoiceDate: { 
          type: 'SHORT_TEXT', 
          displayName: 'Invoice Date', 
          description: 'Date of the invoice (defaults to today)',
          required: false 
        },
        dueDate: { 
          type: 'SHORT_TEXT', 
          displayName: 'Due Date', 
          description: 'Payment due date',
          required: false 
        },
        header: { 
          type: 'OBJECT', 
          displayName: 'Header', 
          description: 'Header content with dynamic lines (e.g., { "lines": ["Company Name", "Address Line 1"] })',
          required: false 
        },
        footer: { 
          type: 'OBJECT', 
          displayName: 'Footer', 
          description: 'Footer content with dynamic lines (e.g., { "lines": ["Thank you!", "Terms apply"] })',
          required: false 
        },
        seller: { 
          type: 'OBJECT', 
          displayName: 'Seller Details', 
          description: 'Seller information with dynamic lines (e.g., { "lines": ["Acme Inc", "123 Main St", "contact@acme.com"] })',
          required: true 
        },
        customer: { 
          type: 'OBJECT', 
          displayName: 'Customer Details', 
          description: 'Customer information with dynamic lines (e.g., { "lines": ["John Doe", "456 Oak Ave", "john@example.com"] })',
          required: true 
        },
        items: { 
          type: 'ARRAY', 
          displayName: 'Items', 
          description: 'Array of invoice items. Each item is an object with keys matching itemColumns',
          required: true 
        },
        itemColumns: { 
          type: 'ARRAY', 
          displayName: 'Item Columns', 
          description: 'Column headers for the items table (e.g., ["Description", "Qty", "Unit Price", "Tax", "Price"])',
          required: true 
        },
        taxColumn: { 
          type: 'SHORT_TEXT', 
          displayName: 'Tax Column Name', 
          description: 'Name of the column containing tax values (default: "Tax")',
          required: false,
          defaultValue: 'Tax'
        },
        priceColumn: { 
          type: 'SHORT_TEXT', 
          displayName: 'Price Column Name', 
          description: 'Name of the column containing price/amount values (default: "Price")',
          required: false,
          defaultValue: 'Price'
        },
        currency: { 
          type: 'SHORT_TEXT', 
          displayName: 'Currency Symbol', 
          description: 'Currency symbol to display (default: "$")',
          required: false,
          defaultValue: '$'
        },
        primaryColor: { 
          type: 'SHORT_TEXT', 
          displayName: 'Primary Color', 
          description: 'Primary color in hex format for headers and accents (default: "#2563eb")',
          required: false,
          defaultValue: '#2563eb'
        },
        secondaryColor: { 
          type: 'SHORT_TEXT', 
          displayName: 'Secondary Color', 
          description: 'Secondary color in hex format for backgrounds (default: "#f8fafc")',
          required: false,
          defaultValue: '#f8fafc'
        },
        notes: { 
          type: 'ARRAY', 
          displayName: 'Notes', 
          description: 'Additional notes or terms to display at the bottom',
          required: false 
        },
      },
      async run(context: InvoiceContext): Promise<CreateInvoiceResult> {
        return driver.createInvoice(context.propsValue as CreateInvoiceParams);
      },
    },
  },

  // No triggers for this bit
  triggers: {},
};

export default invoiceBit;
