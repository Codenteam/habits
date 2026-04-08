// Type declarations for tauri-plugin-sms-api
// This plugin is only available at runtime in the Tauri app context

declare module 'tauri-plugin-sms-api' {
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

  export function sendSms(phoneNumber: string, message: string): Promise<SendSmsResponse>;
  export function readSms(options?: ReadSmsRequest): Promise<ReadSmsResponse>;
  export function checkPermissions(): Promise<SmsPermissions>;
  export function requestPermissions(permissions: ('sendSms' | 'readSms')[]): Promise<SmsPermissions>;
}
