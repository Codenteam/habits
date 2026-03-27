/**
 * OCR Driver for bit-ocr
 * 
 * Uses Tesseract.js for optical character recognition.
 * Supports multiple languages and various image formats.
 */

import * as fs from 'fs';
import * as path from 'path';
import Tesseract, { RecognizeResult, Word, Line, Block, Page } from 'tesseract.js';

// ============ Cross-platform Helpers ============
const isBrowser = typeof window !== 'undefined';

function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

// ============ Process Image (Main OCR) ============

export interface ProcessImageParams {
  source: string;
  sourceType?: 'base64' | 'path' | 'url' | 'dataUrl';
  language?: string;
  oem?: number;  // OCR Engine Mode: 0=Legacy, 1=LSTM, 2=Legacy+LSTM, 3=Default
  psm?: number;  // Page Segmentation Mode
}

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

export async function processImage(params: ProcessImageParams): Promise<ProcessImageResult> {
  const { 
    source, 
    sourceType = 'base64', 
    language = 'eng',
    oem = 3,  // Default mode
    psm = 3,  // Fully automatic page segmentation
  } = params;

  if (!source) {
    throw new Error('Source is required for OCR processing');
  }

  const startTime = Date.now();
  let imageInput: string | Buffer;

  if (sourceType === 'base64') {
    // Convert base64 to data URL for Tesseract
    imageInput = `data:image/png;base64,${source}`;
  } else if (sourceType === 'dataUrl') {
    imageInput = source;
  } else if (sourceType === 'path') {
    if (isBrowser) {
      throw new Error('File path access is not supported in browser environment');
    }
    const resolvedPath = path.resolve(source);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image file not found: ${resolvedPath}`);
    }
    imageInput = resolvedPath;
  } else if (sourceType === 'url') {
    imageInput = source;
  } else {
    throw new Error(`Unsupported source type: ${sourceType}`);
  }

  // Perform OCR
  const result: RecognizeResult = await Tesseract.recognize(
    imageInput,
    language,
    {
      logger: () => {}, // Suppress logging
    }
  );

  const data = result.data;
  const processingTime = Date.now() - startTime;

  // Transform blocks
  const blocks: BlockInfo[] = (data.blocks || []).map((block: Block) => ({
    text: block.text,
    confidence: block.confidence,
    bbox: block.bbox,
    lines: (block.lines || []).map((line: Line) => ({
      text: line.text,
      confidence: line.confidence,
      bbox: line.bbox,
      words: (line.words || []).map((word: Word) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: word.bbox,
      })),
    })),
  }));

  const text = data.text || '';

  return {
    success: true,
    text,
    confidence: data.confidence,
    blocks,
    language,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    charCount: text.length,
    processingTime,
  };
}

// ============ Detect Text (Quick scan) ============

export interface DetectTextParams {
  source: string;
  sourceType?: 'base64' | 'path' | 'url' | 'dataUrl';
  language?: string;
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

export async function detectText(params: DetectTextParams): Promise<DetectTextResult> {
  const { source, sourceType = 'base64', language = 'eng' } = params;

  if (!source) {
    throw new Error('Source is required for text detection');
  }

  // Use processImage and extract region info
  const ocrResult = await processImage({ source, sourceType, language });

  const regions: TextRegion[] = ocrResult.blocks.map(block => ({
    text: block.text.trim(),
    confidence: block.confidence,
    bbox: block.bbox,
  })).filter(r => r.text.length > 0);

  return {
    success: true,
    hasText: regions.length > 0,
    regions,
    totalConfidence: ocrResult.confidence,
    regionCount: regions.length,
  };
}

// ============ Extract Words ============

export interface ExtractWordsParams {
  source: string;
  sourceType?: 'base64' | 'path' | 'url' | 'dataUrl';
  language?: string;
  minConfidence?: number;
}

export interface ExtractWordsResult {
  success: boolean;
  words: WordInfo[];
  wordCount: number;
  averageConfidence: number;
}

export async function extractWords(params: ExtractWordsParams): Promise<ExtractWordsResult> {
  const { 
    source, 
    sourceType = 'base64', 
    language = 'eng',
    minConfidence = 0,
  } = params;

  if (!source) {
    throw new Error('Source is required for word extraction');
  }

  const ocrResult = await processImage({ source, sourceType, language });

  // Flatten all words from all blocks and lines
  const allWords: WordInfo[] = [];
  for (const block of ocrResult.blocks) {
    for (const line of block.lines) {
      for (const word of line.words) {
        if (word.confidence >= minConfidence && word.text.trim().length > 0) {
          allWords.push(word);
        }
      }
    }
  }

  const averageConfidence = allWords.length > 0
    ? allWords.reduce((sum, w) => sum + w.confidence, 0) / allWords.length
    : 0;

  return {
    success: true,
    words: allWords,
    wordCount: allWords.length,
    averageConfidence,
  };
}

// ============ Get Supported Languages ============

export interface GetLanguagesResult {
  success: boolean;
  languages: Array<{
    code: string;
    name: string;
  }>;
}

export async function getLanguages(): Promise<GetLanguagesResult> {
  // Common Tesseract languages
  const languages = [
    { code: 'eng', name: 'English' },
    { code: 'deu', name: 'German' },
    { code: 'fra', name: 'French' },
    { code: 'ita', name: 'Italian' },
    { code: 'spa', name: 'Spanish' },
    { code: 'por', name: 'Portuguese' },
    { code: 'nld', name: 'Dutch' },
    { code: 'pol', name: 'Polish' },
    { code: 'rus', name: 'Russian' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'chi_tra', name: 'Chinese (Traditional)' },
    { code: 'kor', name: 'Korean' },
    { code: 'ara', name: 'Arabic' },
    { code: 'hin', name: 'Hindi' },
    { code: 'tha', name: 'Thai' },
    { code: 'vie', name: 'Vietnamese' },
    { code: 'tur', name: 'Turkish' },
    { code: 'heb', name: 'Hebrew' },
    { code: 'ukr', name: 'Ukrainian' },
  ];

  return {
    success: true,
    languages,
  };
}
