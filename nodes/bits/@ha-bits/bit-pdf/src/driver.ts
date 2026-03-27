/**
 * PDF Driver for bit-pdf
 * 
 * Contains PDF processing logic using pdf-parse.
 * Supports:
 * - Text extraction from PDFs
 * - Metadata extraction
 * - Page count and info
 */

import pdfParse from 'pdf-parse';

// ============ Cross-platform Helpers ============

function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

async function getBuffer(source: string, sourceType: string): Promise<Buffer> {
  if (sourceType === 'base64') {
    return base64ToBuffer(source);
  } else if (sourceType === 'url') {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else {
    throw new Error(`Unsupported source type: ${sourceType}`);
  }
}

// ============ Extract Text ============

export interface ExtractTextParams {
  source: string;
  sourceType?: 'base64' | 'url';
  maxPages?: number;
}

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

export async function extractText(params: ExtractTextParams): Promise<ExtractTextResult> {
  const { source, sourceType = 'base64', maxPages } = params;

  if (!source) {
    throw new Error('Source is required for PDF text extraction');
  }

  const buffer = await getBuffer(source, sourceType);

  const options: any = {};
  if (maxPages && maxPages > 0) {
    options.max = maxPages;
  }

  const data = await pdfParse(buffer, options);

  const text = data.text || '';
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  return {
    success: true,
    text,
    pageCount: data.numpages,
    info: {
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      keywords: data.info?.Keywords,
      creator: data.info?.Creator,
      producer: data.info?.Producer,
      creationDate: data.info?.CreationDate,
      modificationDate: data.info?.ModDate,
      pdfVersion: data.info?.PDFFormatVersion,
    },
    charCount: text.length,
    wordCount,
  };
}

// ============ Extract Metadata ============

export interface ExtractMetadataParams {
  source: string;
  sourceType?: 'base64' | 'url';
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

export async function extractMetadata(params: ExtractMetadataParams): Promise<ExtractMetadataResult> {
  const { source, sourceType = 'base64' } = params;

  if (!source) {
    throw new Error('Source is required for PDF metadata extraction');
  }

  const buffer = await getBuffer(source, sourceType);

  // Only parse first page for metadata
  const data = await pdfParse(buffer, { max: 1 });

  return {
    success: true,
    pageCount: data.numpages,
    info: {
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      keywords: data.info?.Keywords,
      creator: data.info?.Creator,
      producer: data.info?.Producer,
      creationDate: data.info?.CreationDate,
      modificationDate: data.info?.ModDate,
      pdfVersion: data.info?.PDFFormatVersion,
      isAcroForm: data.info?.IsAcroFormPresent,
      isXFA: data.info?.IsXFAPresent,
    },
    metadata: data.metadata || {},
  };
}

// ============ Extract Pages ============

export interface ExtractPagesParams {
  source: string;
  sourceType?: 'base64' | 'url';
  startPage?: number;
  endPage?: number;
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

export async function extractPages(params: ExtractPagesParams): Promise<ExtractPagesResult> {
  const { source, sourceType = 'base64', startPage = 1, endPage } = params;

  if (!source) {
    throw new Error('Source is required for PDF page extraction');
  }

  const buffer = await getBuffer(source, sourceType);

  // Custom page render function to extract per-page text
  const pages: PageContent[] = [];
  let currentPage = 0;

  const pageRender = (pageData: any) => {
    currentPage++;
    const effectiveEndPage = endPage || Infinity;
    
    if (currentPage >= startPage && currentPage <= effectiveEndPage) {
      return pageData.getTextContent().then((textContent: any) => {
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        pages.push({
          pageNumber: currentPage,
          text: pageText,
          charCount: pageText.length,
          wordCount: pageText.split(/\s+/).filter((w: string) => w.length > 0).length,
        });
        
        return pageText;
      });
    }
    return Promise.resolve('');
  };

  const data = await pdfParse(buffer, { pagerender: pageRender });

  const effectiveEndPage = endPage || data.numpages;

  return {
    success: true,
    pages,
    totalPages: data.numpages,
    extractedRange: `${startPage}-${Math.min(effectiveEndPage, data.numpages)}`,
  };
}
