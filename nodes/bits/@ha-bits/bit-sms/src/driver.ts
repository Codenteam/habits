/**
 * SMS driver for mobile apps using tauri-plugin-sms
 */

// Dynamic import for Tauri environment
let smsApi: any = null;

async function loadSmsApi() {
  if (smsApi) return smsApi;
  
  try {
    // In Tauri environment, import the plugin API
    smsApi = await import('tauri-plugin-sms-api');
    return smsApi;
  } catch (error) {
    // Fallback stub for non-Tauri environments
    return {
      sendSms: async () => ({ success: false, error: 'SMS not available in this environment' }),
      readSms: async () => ({ messages: [], totalCount: 0 }),
      checkPermissions: async () => ({ sendSms: 'prompt', readSms: 'prompt' }),
      requestPermissions: async () => ({ sendSms: 'prompt', readSms: 'prompt' }),
    };
  }
}

export interface SendSmsRequest {
  phoneNumber: string;
  message: string;
}

export interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsMessage {
  id: string;
  phoneNumber: string;
  body: string;
  timestamp: number;
  isRead: boolean;
  messageType: 'inbox' | 'sent';
}

export interface ReadSmsRequest {
  phoneNumber?: string;
  limit?: number;
  folder?: 'inbox' | 'sent' | 'all';
  unreadOnly?: boolean;
}

export interface ReadSmsResponse {
  messages: SmsMessage[];
  totalCount: number;
}

export interface SmsPermissions {
  sendSms: 'granted' | 'denied' | 'prompt';
  readSms: 'granted' | 'denied' | 'prompt';
}

/**
 * Send an SMS message
 */
export async function sendSms(phoneNumber: string, message: string): Promise<SendSmsResponse> {
  const api = await loadSmsApi();
  return api.sendSms({ phoneNumber, message });
}

/**
 * Read SMS messages (Android only)
 */
export async function readSms(options: ReadSmsRequest = {}): Promise<ReadSmsResponse> {
  const api = await loadSmsApi();
  return api.readSms(options);
}

/**
 * Check SMS permissions
 */
export async function checkPermissions(): Promise<SmsPermissions> {
  const api = await loadSmsApi();
  return api.checkPermissions();
}

/**
 * Request SMS permissions
 */
export async function requestPermissions(permissions: ('sendSms' | 'readSms')[]): Promise<SmsPermissions> {
  const api = await loadSmsApi();
  return api.requestPermissions(permissions);
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(number: string, defaultCountryCode: string = '+1'): string {
  // Remove all non-digit characters except +
  let cleaned = number.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, add default country code
  if (!cleaned.startsWith('+')) {
    // If it starts with 00, replace with +
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.slice(2);
    } else {
      cleaned = defaultCountryCode + cleaned;
    }
  }
  
  return cleaned;
}
