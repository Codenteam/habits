/**
 * QR Driver for bit-qr
 * 
 * Contains the QR code generation and reading logic.
 * Uses:
 * - qrcode: For generating QR codes (works in Node.js and browser)
 * - jsqr: For reading QR codes from images (pure JS, works everywhere)
 * - image-js: For decoding images (pure JS, works everywhere - no native bindings)
 *   Note: image-js is dynamically imported to avoid bundling issues
 * 
 * This driver works in Node.js, browser, and Tauri environments without stubs.
 */

import {QRCodeToDataURLOptions, toDataURL, QRCodeToStringOptions, toString} from 'qrcode';
import jsQR from 'jsqr';
import {decode} from 'image-js'; // Pure JS library for image decoding, works in all environments
// image-js is dynamically imported in read() to avoid bundling issues with QuickJS

// ============ Cross-platform Helpers ============
const isBrowser = typeof window !== 'undefined';
/**
 * Convert base64 string to Uint8Array (works in both Node.js and browser)
 */
function base64ToUint8Array(base64: string): Uint8Array {
  if (!isBrowser) {
    // Node.js
    return new Uint8Array(Buffer.from(base64, 'base64'));
  } else {
    // Browser
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

// ============ Generation ============

export interface GenerateParams {
  data: string;
  dataType?: 'text' | 'url' | 'vcard' | 'wifi' | 'calendar';
  format?: 'png' | 'svg' | 'dataUrl';
  size?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  darkColor?: string;
  lightColor?: string;
}

export interface GenerateResult {
  success: boolean;
  data: string;
  format: 'png' | 'svg' | 'dataUrl';
  dataType: string;
  content: string;
  size: number;
}

export async function generate(params: GenerateParams): Promise<GenerateResult> {
  const {
    data,
    dataType = 'text',
    format = 'dataUrl',
    size = 256,
    errorCorrection = 'M',
    darkColor = '#000000',
    lightColor = '#ffffff',
  } = params;

  if (!data) {
    throw new Error('Data is required for QR code generation');
  }

  const options: QRCodeToDataURLOptions | QRCodeToStringOptions = {
    errorCorrectionLevel: errorCorrection,
    width: size,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  };

  let result: string;
  let outputFormat: 'png' | 'svg' | 'dataUrl' = format;

  try {
    if (format === 'svg') {
      result = await toString(data, { ...options, type: 'svg' } as QRCodeToStringOptions);
    } else if (format === 'png') {
      // Generate as data URL then strip the prefix
      const dataUrl = await toDataURL(data, options as QRCodeToDataURLOptions);
      result = dataUrl.replace(/^data:image\/png;base64,/, '');
    } else {
      // dataUrl (default)
      result = await toDataURL(data, options as QRCodeToDataURLOptions);
    }

    return {
      success: true,
      data: result,
      format: outputFormat,
      dataType,
      content: data,
      size,
    };
  } catch (error: any) {
    throw new Error(`QR generation failed: ${error.message || error}`);
  }
}

// ============ Reading ============

export interface ReadParams {
  image: string; // base64, data URL, or file path
  maxSize?: number;
}

export interface ReadResult {
  success: boolean;
  data: string | null;
  location?: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
  };
  detectedType?: string;
}

export async function read(params: ReadParams): Promise<ReadResult> {
  const { image, maxSize = 5242880 } = params;

  if (!image) {
    throw new Error('Image is required for QR code reading');
  }

  // Get image data
  let imageBuffer: Uint8Array;
  
  if (image.startsWith('data:')) {
    // Data URL
    const base64 = image.split(',')[1];
    imageBuffer = base64ToUint8Array(base64);
  } else {
    // Assume base64
    imageBuffer = base64ToUint8Array(image);
  }

  // Check size limit
  if (maxSize > 0 && imageBuffer.length > maxSize) {
    throw new Error(`Image size ${imageBuffer.length} exceeds maximum ${maxSize} bytes`);
  }

  // Decode the image to get raw pixel data
  // We need to use a library that can decode PNG/JPEG to raw RGBA
  let imageData: { data: Uint8ClampedArray; width: number; height: number };

  try {
    
    const decodeImage = decode;
    let img = decodeImage(imageBuffer);
    // Convert to RGBA if needed
    if (img.colorModel !== 'RGBA') {
      img = img.convertColor('RGBA');
    }

    // getRawImage() returns { width, height, data, channels, bitDepth }
    const rawImage = img.getRawImage();
    imageData = {
      data: new Uint8ClampedArray(rawImage.data),
      width: rawImage.width,
      height: rawImage.height,
    };
  } catch (error: any) {
    throw new Error(`Failed to decode image: ${error.message || error}`);
  }

  // Use jsQR to find and decode the QR code
  let code = jsQR(imageData.data, imageData.width, imageData.height);

  // If QR not found and image is large, try resizing down to max 1000px
  if (!code && (imageData.width > 1000 || imageData.height > 1000)) {
    try {
      const decodeImage = decode;
      let img = decodeImage(imageBuffer);
      if (img.colorModel !== 'RGBA') {
        img = img.convertColor('RGBA');
      }
      
      // Calculate new dimensions keeping aspect ratio, max 1000px on largest side
      const maxDim = 1000;
      const scale = Math.min(maxDim / img.width, maxDim / img.height);
      const newWidth = Math.round(img.width * scale);
      const newHeight = Math.round(img.height * scale);
      
      // Resize the image
      const resizedImg = img.resize({ width: newWidth, height: newHeight });
      const resizedRaw = resizedImg.getRawImage();
      
      // Try QR detection again on resized image
      code = jsQR(
        new Uint8ClampedArray(resizedRaw.data),
        resizedRaw.width,
        resizedRaw.height
      );
    } catch (resizeError: any) {
      // If resize fails, continue with original failure
      console.warn('Failed to resize image for QR retry:', resizeError.message);
    }
  }

  if (!code) {
    return {
      success: false,
      data: null,
    };
  }

  // Detect the type of data
  const typeInfo = detectType(code.data);

  return {
    success: true,
    data: code.data,
    location: {
      topLeftCorner: code.location.topLeftCorner,
      topRightCorner: code.location.topRightCorner,
      bottomLeftCorner: code.location.bottomLeftCorner,
      bottomRightCorner: code.location.bottomRightCorner,
    },
    detectedType: typeInfo.type,
  };
}

// ============ Format Helpers ============

export interface VCardParams {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  organization?: string;
  title?: string;
  url?: string;
  address?: string;
}

export function formatVCard(params: VCardParams): string {
  const { firstName, lastName, phone, email, organization, title, url, address } = params;
  
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  
  if (lastName) {
    lines.push(`N:${lastName};${firstName};;;`);
    lines.push(`FN:${firstName} ${lastName}`);
  } else {
    lines.push(`N:;${firstName};;;`);
    lines.push(`FN:${firstName}`);
  }
  
  if (organization) lines.push(`ORG:${organization}`);
  if (title) lines.push(`TITLE:${title}`);
  if (phone) lines.push(`TEL:${phone}`);
  if (email) lines.push(`EMAIL:${email}`);
  if (url) lines.push(`URL:${url}`);
  if (address) lines.push(`ADR:;;${address};;;;`);
  
  lines.push('END:VCARD');
  
  return lines.join('\n');
}

export interface WiFiParams {
  ssid: string;
  password?: string;
  encryption?: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export function formatWiFi(params: WiFiParams): string {
  const { ssid, password, encryption = 'WPA', hidden = false } = params;
  
  // Escape special characters in SSID and password
  const escapeWiFi = (str: string) => str.replace(/[\\;,:]/g, '\\$&');
  
  let wifi = `WIFI:T:${encryption};S:${escapeWiFi(ssid)};`;
  
  if (password && encryption !== 'nopass') {
    wifi += `P:${escapeWiFi(password)};`;
  }
  
  if (hidden) {
    wifi += 'H:true;';
  }
  
  wifi += ';';
  
  return wifi;
}

export interface CalendarParams {
  title: string;
  startDate: string; // ISO date string
  endDate?: string;
  location?: string;
  description?: string;
}

export function formatCalendar(params: CalendarParams): string {
  const { title, startDate, endDate, location, description } = params;
  
  // Convert ISO date to iCal format (YYYYMMDDTHHMMSS)
  const toICalDate = (iso: string) => {
    const date = new Date(iso);
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const lines = [
    'BEGIN:VEVENT',
    `DTSTART:${toICalDate(startDate)}`,
  ];
  
  if (endDate) {
    lines.push(`DTEND:${toICalDate(endDate)}`);
  }
  
  lines.push(`SUMMARY:${title}`);
  
  if (location) lines.push(`LOCATION:${location}`);
  if (description) lines.push(`DESCRIPTION:${description}`);
  
  lines.push('END:VEVENT');
  
  return lines.join('\n');
}

// ============ Type Detection ============

export function detectType(data: string): { type: string; parsed?: any } {
  if (!data) return { type: 'unknown' };
  
  // URL
  if (data.match(/^https?:\/\//i)) {
    return { type: 'url', parsed: { url: data } };
  }
  
  // vCard
  if (data.startsWith('BEGIN:VCARD')) {
    const parsed: any = {};
    const fnMatch = data.match(/FN:(.+)/);
    if (fnMatch) parsed.name = fnMatch[1];
    const telMatch = data.match(/TEL:(.+)/);
    if (telMatch) parsed.phone = telMatch[1];
    const emailMatch = data.match(/EMAIL:(.+)/);
    if (emailMatch) parsed.email = emailMatch[1];
    return { type: 'vcard', parsed };
  }
  
  // WiFi
  if (data.startsWith('WIFI:')) {
    const parsed: any = {};
    const ssidMatch = data.match(/S:([^;]+)/);
    if (ssidMatch) parsed.ssid = ssidMatch[1].replace(/\\(.)/g, '$1');
    const passMatch = data.match(/P:([^;]+)/);
    if (passMatch) parsed.password = passMatch[1].replace(/\\(.)/g, '$1');
    const typeMatch = data.match(/T:([^;]+)/);
    if (typeMatch) parsed.encryption = typeMatch[1];
    return { type: 'wifi', parsed };
  }
  
  // Calendar event
  if (data.includes('BEGIN:VEVENT')) {
    const parsed: any = {};
    const summaryMatch = data.match(/SUMMARY:(.+)/);
    if (summaryMatch) parsed.title = summaryMatch[1];
    const locationMatch = data.match(/LOCATION:(.+)/);
    if (locationMatch) parsed.location = locationMatch[1];
    const startMatch = data.match(/DTSTART:(.+)/);
    if (startMatch) parsed.startDate = startMatch[1];
    return { type: 'calendar', parsed };
  }
  
  // Email
  if (data.match(/^mailto:/i)) {
    return { type: 'email', parsed: { email: data.replace(/^mailto:/i, '') } };
  }
  
  // Phone
  if (data.match(/^tel:/i)) {
    return { type: 'phone', parsed: { phone: data.replace(/^tel:/i, '') } };
  }
  
  // SMS
  if (data.match(/^sms:/i)) {
    return { type: 'sms', parsed: { sms: data.replace(/^sms:/i, '') } };
  }
  
  // Default to plain text
  return { type: 'text', parsed: { text: data } };
}
