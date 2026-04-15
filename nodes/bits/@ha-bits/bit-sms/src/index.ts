/**
 * SMS Messaging Bit
 *
 * A mobile-only bit for sending and reading SMS messages.
 *
 * Platform support:
 * - Android: Full support for sending and reading SMS
 * - iOS: Can send SMS (opens composer for user confirmation), cannot read SMS
 */
import { createBit, createAction, Property } from '@ha-bits/cortex-core';
import * as driver from './driver';

const sendSms = createAction({
  name: 'sendSms',
  displayName: 'Send SMS',
  description: 'Send an SMS message to a phone number',
  props: {
    phoneNumber: Property.ShortText({
      displayName: 'Phone Number',
      description: 'The recipient phone number (with country code, e.g., +1234567890)',
      required: true,
    }),
    message: Property.LongText({
      displayName: 'Message',
      description: 'The SMS message content',
      required: true,
    }),
    defaultCountryCode: Property.ShortText({
      displayName: 'Default Country Code',
      description: 'Country code to use if not specified (e.g., +1)',
      required: false,
      defaultValue: '+1',
    }),
  },
  run: async (context) => {
    const phoneNumber = driver.formatPhoneNumber(
      context.propsValue.phoneNumber as string,
      (context.propsValue.defaultCountryCode as string) || '+1'
    );
    const message = context.propsValue.message as string;
    const result = await driver.sendSms(phoneNumber, message);
    return {
      ...result,
      phoneNumber,
      messageLength: message.length,
    };
  },
});

const sendAlert = createAction({
  name: 'sendAlert',
  displayName: 'Send Alert SMS',
  description: 'Send a pre-formatted alert SMS',
  props: {
    phoneNumber: Property.ShortText({
      displayName: 'Phone Number',
      description: 'The recipient phone number',
      required: true,
    }),
    alertType: Property.StaticDropdown({
      displayName: 'Alert Type',
      description: 'Type of alert to send',
      required: true,
      options: {
        options: [
          { value: 'arrival', label: 'Arrival' },
          { value: 'departure', label: 'Departure' },
          { value: 'emergency', label: 'Emergency' },
          { value: 'custom', label: 'Custom' },
        ],
      },
    }),
    location: Property.ShortText({
      displayName: 'Location',
      description: 'Location name for the alert',
      required: false,
    }),
    customMessage: Property.LongText({
      displayName: 'Custom Message',
      description: 'Custom message (for custom alert type)',
      required: false,
    }),
  },
  run: async (context) => {
    let message: string;
    const timestamp = new Date().toLocaleString();
    const location = (context.propsValue.location as string) || 'the location';
    const alertType = context.propsValue.alertType as string;
    
    switch (alertType) {
      case 'arrival':
        message = `📍 Arrival Alert: I have arrived at ${location}. Time: ${timestamp}`;
        break;
      case 'departure':
        message = `🚗 Departure Alert: I have left ${location}. Time: ${timestamp}`;
        break;
      case 'emergency':
        message = `🚨 EMERGENCY: Please check on me. Last known location: ${location}. Time: ${timestamp}`;
        break;
      case 'custom':
        message = (context.propsValue.customMessage as string) || `Alert from ${location} at ${timestamp}`;
        break;
      default:
        message = `Alert: ${location} - ${timestamp}`;
    }
    
    const phoneNumber = driver.formatPhoneNumber(context.propsValue.phoneNumber as string);
    const result = await driver.sendSms(phoneNumber, message);
    
    return {
      ...result,
      alertType,
      phoneNumber,
      message,
    };
  },
});

const readMessages = createAction({
  name: 'readMessages',
  displayName: 'Read Messages',
  description: 'Read SMS messages from the device (Android only)',
  props: {
    phoneNumber: Property.ShortText({
      displayName: 'Phone Number',
      description: 'Filter by phone number (optional)',
      required: false,
    }),
    limit: Property.Number({
      displayName: 'Limit',
      description: 'Maximum number of messages to retrieve',
      required: false,
      defaultValue: 50,
    }),
    folder: Property.StaticDropdown({
      displayName: 'Folder',
      description: 'Which folder to read from',
      required: false,
      defaultValue: 'all',
      options: {
        options: [
          { value: 'inbox', label: 'Inbox' },
          { value: 'sent', label: 'Sent' },
          { value: 'all', label: 'All' },
        ],
      },
    }),
    unreadOnly: Property.Checkbox({
      displayName: 'Unread Only',
      description: 'Only retrieve unread messages',
      required: false,
      defaultValue: false,
    }),
  },
  run: async (context) => {
    const result = await driver.readSms({
      phoneNumber: context.propsValue.phoneNumber as string | undefined,
      limit: (context.propsValue.limit as number) || 50,
      folder: (context.propsValue.folder as 'inbox' | 'sent' | 'all') || 'all',
      unreadOnly: (context.propsValue.unreadOnly as boolean) || false,
    });
    
    return {
      ...result,
      retrievedCount: result.messages.length,
    };
  },
});

const getUnreadCount = createAction({
  name: 'getUnreadCount',
  displayName: 'Get Unread Count',
  description: 'Get the count of unread SMS messages (Android only)',
  props: {},
  run: async () => {
    const result = await driver.readSms({ unreadOnly: true, folder: 'inbox' });
    return {
      unreadCount: result.totalCount,
    };
  },
});

const checkPermissions = createAction({
  name: 'checkPermissions',
  displayName: 'Check Permissions',
  description: 'Check SMS permissions status',
  props: {},
  run: async () => {
    const permissions = await driver.checkPermissions();
    return {
      ...permissions,
      canSend: permissions.sendSms === 'granted',
      canRead: permissions.readSms === 'granted',
    };
  },
});

const requestPermissions = createAction({
  name: 'requestPermissions',
  displayName: 'Request Permissions',
  description: 'Request SMS permissions from the user',
  props: {
    sendSms: Property.Checkbox({
      displayName: 'Send SMS Permission',
      description: 'Request permission to send SMS',
      required: false,
      defaultValue: true,
    }),
    readSms: Property.Checkbox({
      displayName: 'Read SMS Permission',
      description: 'Request permission to read SMS (Android only)',
      required: false,
      defaultValue: false,
    }),
  },
  run: async (context) => {
    const permissionsToRequest: ('sendSms' | 'readSms')[] = [];
    if (context.propsValue.sendSms !== false) permissionsToRequest.push('sendSms');
    if (context.propsValue.readSms) permissionsToRequest.push('readSms');
    
    const permissions = await driver.requestPermissions(permissionsToRequest);
    return {
      ...permissions,
      requested: permissionsToRequest,
      canSend: permissions.sendSms === 'granted',
      canRead: permissions.readSms === 'granted',
    };
  },
});

const formatPhoneNumber = createAction({
  name: 'formatPhoneNumber',
  displayName: 'Format Phone Number',
  description: 'Format a phone number to E.164 format',
  props: {
    phoneNumber: Property.ShortText({
      displayName: 'Phone Number',
      description: 'The phone number to format',
      required: true,
    }),
    defaultCountryCode: Property.ShortText({
      displayName: 'Default Country Code',
      description: 'Country code to use if not specified (e.g., +1)',
      required: false,
      defaultValue: '+1',
    }),
  },
  run: async (context) => {
    const formatted = driver.formatPhoneNumber(
      context.propsValue.phoneNumber as string,
      (context.propsValue.defaultCountryCode as string) || '+1'
    );
    return {
      original: context.propsValue.phoneNumber,
      formatted,
    };
  },
});

// Export the bit
export const sms = createBit({
  displayName: 'SMS',
  description: 'Send and read SMS messages on mobile devices',
  logoUrl: 'lucide:MessageSquare',
  actions: [
    sendSms,
    sendAlert,
    readMessages,
    getUnreadCount,
    checkPermissions,
    requestPermissions,
    formatPhoneNumber,
  ],
  triggers: [],
});

// Mark as app-only runtime
(sms as any).runtime = 'app';

export default sms;
