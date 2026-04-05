import { invoke, PermissionState } from "@tauri-apps/api/core";

/**
 * Request to send an SMS message
 */
export interface SendSmsRequest {
  /** Phone number to send the SMS to (with country code) */
  phoneNumber: string;
  /** Message content */
  message: string;
}

/**
 * Response after sending an SMS
 */
export interface SendSmsResponse {
  /** Whether the SMS was sent successfully */
  success: boolean;
  /** Optional message ID (if available) */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Request to read SMS messages
 */
export interface ReadSmsRequest {
  /** Filter by phone number (optional) */
  phoneNumber?: string;
  /** Maximum number of messages to retrieve (default: 50) */
  limit?: number;
  /** Filter: "inbox", "sent", or "all" (default: "all") */
  folder?: "inbox" | "sent" | "all";
  /** Read only unread messages (default: false) */
  unreadOnly?: boolean;
}

/**
 * An SMS message
 */
export interface SmsMessage {
  /** Unique message ID */
  id: string;
  /** Phone number (sender or recipient) */
  phoneNumber: string;
  /** Message body */
  body: string;
  /** Timestamp (Unix milliseconds) */
  timestamp: number;
  /** Whether the message has been read */
  isRead: boolean;
  /** Message type: "inbox" or "sent" */
  messageType: "inbox" | "sent";
}

/**
 * Response containing SMS messages
 */
export interface ReadSmsResponse {
  /** List of messages */
  messages: SmsMessage[];
  /** Total count of messages matching the filter */
  totalCount: number;
}

/**
 * Permission status for SMS operations
 */
export interface SmsPermissions {
  /** SMS send permission state */
  sendSms: PermissionState;
  /** SMS read permission state */
  readSms: PermissionState;
}

/**
 * Send an SMS message.
 *
 * On Android, this will send the SMS directly if permission is granted.
 * On iOS, this will open the native SMS composer for user confirmation.
 *
 * @example
 * ```typescript
 * import { sendSms } from 'tauri-plugin-sms-api';
 *
 * const result = await sendSms({
 *   phoneNumber: '+1234567890',
 *   message: 'Hello from Tauri!'
 * });
 *
 * if (result.success) {
 *   console.log('SMS sent with ID:', result.messageId);
 * } else {
 *   console.error('Failed to send SMS:', result.error);
 * }
 * ```
 *
 * @param request - The SMS send request
 * @returns A promise that resolves with the send result
 */
export async function sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
  return invoke<SendSmsResponse>("plugin:sms|send_sms", { request });
}

/**
 * Read SMS messages from the device.
 *
 * **Note:** This functionality is only available on Android.
 * iOS does not allow reading SMS messages due to privacy restrictions.
 *
 * @example
 * ```typescript
 * import { readSms } from 'tauri-plugin-sms-api';
 *
 * // Read all recent messages
 * const result = await readSms({ limit: 20 });
 * console.log(`Found ${result.totalCount} messages`);
 *
 * // Read messages from a specific number
 * const filtered = await readSms({
 *   phoneNumber: '+1234567890',
 *   folder: 'inbox',
 *   unreadOnly: true
 * });
 * ```
 *
 * @param request - The SMS read request
 * @returns A promise that resolves with the messages
 * @throws On iOS, this will always throw an error
 */
export async function readSms(request: ReadSmsRequest = {}): Promise<ReadSmsResponse> {
  return invoke<ReadSmsResponse>("plugin:sms|read_sms", { request });
}

/**
 * Check the current SMS permission status.
 *
 * @example
 * ```typescript
 * import { checkPermissions } from 'tauri-plugin-sms-api';
 *
 * const permissions = await checkPermissions();
 * if (permissions.sendSms === 'granted') {
 *   // Can send SMS
 * }
 * ```
 *
 * @returns A promise that resolves with the permission status
 */
export async function checkPermissions(): Promise<SmsPermissions> {
  return invoke<SmsPermissions>("plugin:sms|check_permissions");
}

/**
 * Request SMS permissions from the user.
 *
 * @example
 * ```typescript
 * import { requestPermissions, checkPermissions } from 'tauri-plugin-sms-api';
 *
 * const permissions = await checkPermissions();
 *
 * if (permissions.sendSms !== 'granted') {
 *   const newPermissions = await requestPermissions(['sendSms']);
 *   // Check new status
 * }
 * ```
 *
 * @param permissions - Array of permissions to request: 'sendSms', 'readSms'
 * @returns A promise that resolves with the new permission status
 */
export async function requestPermissions(
  permissions: ("sendSms" | "readSms")[]
): Promise<SmsPermissions> {
  return invoke<SmsPermissions>("plugin:sms|request_permissions", { permissions });
}
