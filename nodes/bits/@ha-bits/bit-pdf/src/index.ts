/**
 * @ha-bits/bit-pdf
 * 
 * PDF processing bit for extracting text, metadata, and page content from PDFs.
 * 
 * Operations:
 * - extractText: Extract all text from a PDF
 * - extractMetadata: Get PDF metadata (title, author, etc.)
 * - extractPages: Extract text from specific pages
 */

import * as driver from './driver';

export interface ExtractTextResult {
  success: boolean;
  text: string;
  pageCount: number;
  info: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
    pdfVersion?: string;
  };
  charCount: number;
  wordCount: number;
}

export interface ExtractMetadataResult {
  success: boolean;
  pageCount: number;
  info: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
    pdfVersion?: string;
    isAcroForm?: boolean;
    isXFA?: boolean;
  };
  metadata: Record<string, any>;
}

export interface PageContent {
  pageNumber: number;
  text: string;
  charCount: number;
  wordCount: number;
}

export interface ExtractPagesResult {
  success: boolean;
  pages: PageContent[];
  totalPages: number;
  extractedRange: string;
}

interface PDFContext {
  propsValue: Record<string, any>;
}

const pdfBit = {
  displayName: 'PDF',
  description: 'Extract text, metadata, and content from PDF documents',
  logoUrl: 'lucide:FileText',
  
  actions: {
    extractText: {
      name: 'extractText',
      displayName: 'Extract Text',
      description: 'Extract all text content from a PDF document',
      props: {
        source: { 
          type: 'LONG_TEXT', 
          displayName: 'Source', 
          description: 'Base64 encoded PDF, file path, or URL',
          required: true 
        },
        sourceType: { 
          type: 'DROPDOWN', 
          displayName: 'Source Type', 
          description: 'How the PDF is provided',
          required: false,
          defaultValue: 'base64',
          options: [
            { label: 'Base64 Encoded', value: 'base64' },
            { label: 'File Path', value: 'path' },
            { label: 'URL', value: 'url' },
          ]
        },
        maxPages: { 
          type: 'NUMBER', 
          displayName: 'Max Pages', 
          description: 'Maximum number of pages to extract (0 = all)',
          required: false, 
          defaultValue: 0 
        },
      },
      async run(context: PDFContext): Promise<ExtractTextResult> {
        return driver.extractText(context.propsValue as any);
      },
    },
    
    extractMetadata: {
      name: 'extractMetadata',
      displayName: 'Extract Metadata',
      description: 'Get PDF metadata including title, author, creation date, etc.',
      props: {
        source: { 
          type: 'LONG_TEXT', 
          displayName: 'Source', 
          description: 'Base64 encoded PDF, file path, or URL',
          required: true 
        },
        sourceType: { 
          type: 'DROPDOWN', 
          displayName: 'Source Type', 
          description: 'How the PDF is provided',
          required: false,
          defaultValue: 'base64',
          options: [
            { label: 'Base64 Encoded', value: 'base64' },
            { label: 'File Path', value: 'path' },
            { label: 'URL', value: 'url' },
          ]
        },
      },
      async run(context: PDFContext): Promise<ExtractMetadataResult> {
        return driver.extractMetadata(context.propsValue as any);
      },
    },
    
    extractPages: {
      name: 'extractPages',
      displayName: 'Extract Pages',
      description: 'Extract text from specific page ranges',
      props: {
        source: { 
          type: 'LONG_TEXT', 
          displayName: 'Source', 
          description: 'Base64 encoded PDF, file path, or URL',
          required: true 
        },
        sourceType: { 
          type: 'DROPDOWN', 
          displayName: 'Source Type', 
          description: 'How the PDF is provided',
          required: false,
          defaultValue: 'base64',
          options: [
            { label: 'Base64 Encoded', value: 'base64' },
            { label: 'File Path', value: 'path' },
            { label: 'URL', value: 'url' },
          ]
        },
        startPage: { 
          type: 'NUMBER', 
          displayName: 'Start Page', 
          description: 'First page to extract (1-indexed)',
          required: false, 
          defaultValue: 1 
        },
        endPage: { 
          type: 'NUMBER', 
          displayName: 'End Page', 
          description: 'Last page to extract (0 = last page)',
          required: false, 
          defaultValue: 0 
        },
      },
      async run(context: PDFContext): Promise<ExtractPagesResult> {
        return driver.extractPages(context.propsValue as any);
      },
    },
  },

  // No triggers for this bit
  triggers: {},
};

export default pdfBit;
