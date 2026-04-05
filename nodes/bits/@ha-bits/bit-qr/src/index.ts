/**
 * @ha-bits/bit-qr
 * 
 * QR code generation and reading bit.
 * Supports multiple data formats: text, URL, vCard, WiFi, and calendar events.
 * 
 * Environments:
 * - Node.js: Uses driver.ts with qrcode and jsqr packages
 * - Browser/Tauri: Uses stubs/browser-driver.js (same libraries, they're pure JS)
 */

import * as driver from './driver';

export interface GenerateResult {
  success: boolean;
  data: string;
  format: 'png' | 'svg' | 'dataUrl';
  dataType: string;
  content: string;
  size: number;
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

interface QRContext {
  propsValue: Record<string, any>;
}

const qrBit = {
  displayName: 'QR Code',
  description: 'Generate and read QR codes - supports text, URLs, vCard, WiFi, and calendar formats',
  logoUrl: 'lucide:QrCode',
  runtime: 'all',
  
  actions: {
    generate: {
      name: 'generate',
      displayName: 'Generate QR Code',
      description: 'Generate a QR code from data',
      props: {
        data: { 
          type: 'LONG_TEXT', 
          displayName: 'Data', 
          description: 'The data to encode in the QR code',
          required: true 
        },
        dataType: { 
          type: 'DROPDOWN', 
          displayName: 'Data Type', 
          description: 'Type of data being encoded',
          required: false,
          defaultValue: 'text',
          options: [
            { label: 'Plain Text', value: 'text' },
            { label: 'URL', value: 'url' },
            { label: 'vCard (Contact)', value: 'vcard' },
            { label: 'WiFi', value: 'wifi' },
            { label: 'Calendar Event', value: 'calendar' },
          ]
        },
        format: { 
          type: 'DROPDOWN', 
          displayName: 'Output Format', 
          required: false, 
          defaultValue: 'dataUrl',
          options: [
            { label: 'Data URL (for img src)', value: 'dataUrl' },
            { label: 'Base64 PNG', value: 'png' },
            { label: 'SVG', value: 'svg' },
          ]
        },
        size: { 
          type: 'NUMBER', 
          displayName: 'Size (pixels)', 
          description: 'Width/height of the QR code',
          required: false, 
          defaultValue: 256 
        },
        errorCorrection: { 
          type: 'DROPDOWN', 
          displayName: 'Error Correction', 
          description: 'Level of error correction (higher = more recovery, larger QR)',
          required: false, 
          defaultValue: 'M',
          options: [
            { label: 'Low (7%)', value: 'L' },
            { label: 'Medium (15%)', value: 'M' },
            { label: 'Quartile (25%)', value: 'Q' },
            { label: 'High (30%)', value: 'H' },
          ]
        },
        darkColor: { 
          type: 'SHORT_TEXT', 
          displayName: 'Dark Color', 
          description: 'Color of the dark modules (hex)',
          required: false, 
          defaultValue: '#000000' 
        },
        lightColor: { 
          type: 'SHORT_TEXT', 
          displayName: 'Light Color', 
          description: 'Color of the light modules (hex)',
          required: false, 
          defaultValue: '#ffffff' 
        },
      },
      async run(context: QRContext): Promise<GenerateResult> {
        return driver.generate(context.propsValue as any);
      },
    },
    
    read: {
      name: 'read',
      displayName: 'Read QR Code',
      description: 'Read and decode a QR code from an image',
      props: {
        image: { 
          type: 'LONG_TEXT', 
          displayName: 'Image', 
          description: 'Base64 encoded image, data URL, or file path',
          required: true 
        },
        maxSize: { 
          type: 'NUMBER', 
          displayName: 'Max Size (bytes)', 
          description: 'Maximum image size to process (0 = no limit)',
          required: false, 
          defaultValue: 5242880 // 5MB
        },
      },
      async run(context: QRContext): Promise<ReadResult> {
        return driver.read(context.propsValue as any);
      },
    },
    
    formatVCard: {
      name: 'formatVCard',
      displayName: 'Format vCard',
      description: 'Format contact data as vCard string for QR encoding',
      props: {
        firstName: { type: 'SHORT_TEXT', displayName: 'First Name', required: true },
        lastName: { type: 'SHORT_TEXT', displayName: 'Last Name', required: false },
        phone: { type: 'SHORT_TEXT', displayName: 'Phone', required: false },
        email: { type: 'SHORT_TEXT', displayName: 'Email', required: false },
        organization: { type: 'SHORT_TEXT', displayName: 'Organization', required: false },
        title: { type: 'SHORT_TEXT', displayName: 'Job Title', required: false },
        url: { type: 'SHORT_TEXT', displayName: 'Website', required: false },
        address: { type: 'SHORT_TEXT', displayName: 'Address', required: false },
      },
      async run(context: QRContext): Promise<{ vcard: string }> {
        return { vcard: driver.formatVCard(context.propsValue as any) };
      },
    },
    
    formatWiFi: {
      name: 'formatWiFi',
      displayName: 'Format WiFi',
      description: 'Format WiFi credentials for QR encoding',
      props: {
        ssid: { type: 'SHORT_TEXT', displayName: 'Network Name (SSID)', required: true },
        password: { type: 'SHORT_TEXT', displayName: 'Password', required: false },
        encryption: { 
          type: 'DROPDOWN', 
          displayName: 'Encryption', 
          required: false, 
          defaultValue: 'WPA',
          options: [
            { label: 'WPA/WPA2', value: 'WPA' },
            { label: 'WEP', value: 'WEP' },
            { label: 'None (Open)', value: 'nopass' },
          ]
        },
        hidden: { type: 'CHECKBOX', displayName: 'Hidden Network', required: false, defaultValue: false },
      },
      async run(context: QRContext): Promise<{ wifi: string }> {
        return { wifi: driver.formatWiFi(context.propsValue as any) };
      },
    },
    
    formatCalendar: {
      name: 'formatCalendar',
      displayName: 'Format Calendar Event',
      description: 'Format calendar event for QR encoding',
      props: {
        title: { type: 'SHORT_TEXT', displayName: 'Event Title', required: true },
        startDate: { type: 'SHORT_TEXT', displayName: 'Start Date (ISO)', required: true },
        endDate: { type: 'SHORT_TEXT', displayName: 'End Date (ISO)', required: false },
        location: { type: 'SHORT_TEXT', displayName: 'Location', required: false },
        description: { type: 'LONG_TEXT', displayName: 'Description', required: false },
      },
      async run(context: QRContext): Promise<{ calendar: string }> {
        return { calendar: driver.formatCalendar(context.propsValue as any) };
      },
    },
    
    detectType: {
      name: 'detectType',
      displayName: 'Detect Data Type',
      description: 'Detect the type of data in a QR code string',
      props: {
        data: { type: 'LONG_TEXT', displayName: 'QR Data', required: true },
      },
      async run(context: QRContext): Promise<{ type: string; parsed?: any }> {
        return driver.detectType(context.propsValue.data as string);
      },
    },
  },
  
  triggers: {},
};

export const qr = qrBit;
export default qrBit;
