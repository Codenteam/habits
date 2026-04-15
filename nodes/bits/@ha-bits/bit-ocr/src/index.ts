/**
 * @ha-bits/bit-ocr
 * 
 * OCR (Optical Character Recognition) bit using Tesseract.js.
 * Extract text from images in various formats.
 * 
 * Operations:
 * - processImage: Full OCR with text, confidence, and bounding boxes
 * - detectText: Quick check for text presence and regions
 * - extractWords: Get individual words with positions
 * - getLanguages: List supported OCR languages
 */

import * as driver from './driver';

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface WordInfo {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface LineInfo {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  words: WordInfo[];
}

export interface BlockInfo {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  lines: LineInfo[];
}

export interface ProcessImageResult {
  success: boolean;
  text: string;
  confidence: number;
  blocks: BlockInfo[];
  language: string;
  wordCount: number;
  charCount: number;
  processingTime: number;
}

export interface TextRegion {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface DetectTextResult {
  success: boolean;
  hasText: boolean;
  regions: TextRegion[];
  totalConfidence: number;
  regionCount: number;
}

export interface ExtractWordsResult {
  success: boolean;
  words: WordInfo[];
  wordCount: number;
  averageConfidence: number;
}

export interface GetLanguagesResult {
  success: boolean;
  languages: Array<{
    code: string;
    name: string;
  }>;
}

interface OCRContext {
  propsValue: Record<string, any>;
}

const ocrBit = {
  displayName: 'OCR',
  description: 'Extract text from images using Tesseract.js optical character recognition',
  logoUrl: 'lucide:ScanText',
  runtime: 'all',
  
  actions: {
    processImage: {
      name: 'processImage',
      displayName: 'Process Image',
      description: 'Perform full OCR on an image, extracting text with positions and confidence scores',
      props: {
        source: { 
          type: 'LONG_TEXT', 
          displayName: 'Source', 
          description: 'Base64 encoded image, file path, URL, or data URL',
          required: true 
        },
        sourceType: { 
          type: 'DROPDOWN', 
          displayName: 'Source Type', 
          description: 'How the image is provided',
          required: false,
          defaultValue: 'base64',
          options: [
            { label: 'Base64 Encoded', value: 'base64' },
            { label: 'Data URL', value: 'dataUrl' },
            { label: 'File Path', value: 'path' },
            { label: 'URL', value: 'url' },
          ]
        },
        language: { 
          type: 'SHORT_TEXT', 
          displayName: 'Language', 
          description: 'OCR language code (e.g., eng, deu, fra). Use + for multiple: eng+deu',
          required: false, 
          defaultValue: 'eng' 
        },
      },
      async run(context: OCRContext): Promise<ProcessImageResult> {
        return driver.processImage(context.propsValue as any);
      },
    },
    
    detectText: {
      name: 'detectText',
      displayName: 'Detect Text',
      description: 'Quick scan to detect text regions in an image',
      props: {
        source: { 
          type: 'LONG_TEXT', 
          displayName: 'Source', 
          description: 'Base64 encoded image, file path, URL, or data URL',
          required: true 
        },
        sourceType: { 
          type: 'DROPDOWN', 
          displayName: 'Source Type', 
          description: 'How the image is provided',
          required: false,
          defaultValue: 'base64',
          options: [
            { label: 'Base64 Encoded', value: 'base64' },
            { label: 'Data URL', value: 'dataUrl' },
            { label: 'File Path', value: 'path' },
            { label: 'URL', value: 'url' },
          ]
        },
        language: { 
          type: 'SHORT_TEXT', 
          displayName: 'Language', 
          description: 'OCR language code',
          required: false, 
          defaultValue: 'eng' 
        },
      },
      async run(context: OCRContext): Promise<DetectTextResult> {
        return driver.detectText(context.propsValue as any);
      },
    },
    
    extractWords: {
      name: 'extractWords',
      displayName: 'Extract Words',
      description: 'Extract individual words with their positions and confidence scores',
      props: {
        source: { 
          type: 'LONG_TEXT', 
          displayName: 'Source', 
          description: 'Base64 encoded image, file path, URL, or data URL',
          required: true 
        },
        sourceType: { 
          type: 'DROPDOWN', 
          displayName: 'Source Type', 
          description: 'How the image is provided',
          required: false,
          defaultValue: 'base64',
          options: [
            { label: 'Base64 Encoded', value: 'base64' },
            { label: 'Data URL', value: 'dataUrl' },
            { label: 'File Path', value: 'path' },
            { label: 'URL', value: 'url' },
          ]
        },
        language: { 
          type: 'SHORT_TEXT', 
          displayName: 'Language', 
          description: 'OCR language code',
          required: false, 
          defaultValue: 'eng' 
        },
        minConfidence: { 
          type: 'NUMBER', 
          displayName: 'Min Confidence', 
          description: 'Minimum confidence threshold (0-100)',
          required: false, 
          defaultValue: 0 
        },
      },
      async run(context: OCRContext): Promise<ExtractWordsResult> {
        return driver.extractWords(context.propsValue as any);
      },
    },
    
    getLanguages: {
      name: 'getLanguages',
      displayName: 'Get Languages',
      description: 'List supported OCR languages',
      props: {},
      async run(_context: OCRContext): Promise<GetLanguagesResult> {
        return driver.getLanguages();
      },
    },
  },

  // No triggers for this bit
  triggers: {},
};

export default ocrBit;
