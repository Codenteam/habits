/**
 * SMS Messaging Bit
 *
 * A mobile-only bit for sending and reading SMS messages.
 *
 * Platform support:
 * - Android: Full support for sending and reading SMS
 * - iOS: Can send SMS (opens composer for user confirmation), cannot read SMS
 */
import type { Bit } from '@ha-bits/cortex-core';
import * as driver from './driver';

export const sms: Bit = {
  displayName: 'SMS',
  runtime: 'app',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/126/126341.png',

  actions: {
    sendSms: {
      displayName: 'Send SMS',
      description: 'Send an SMS message to a phone number',
      props: {
        phoneNumber: {
          type: 'string',
          displayName: 'Phone Number',
          description: 'The recipient phone number (with country code, e.g., +1234567890)',
          required: true,
        },
        message: {
          type: 'string',
          displayName: 'Message',
          description: 'The SMS message content',
          required: true,
        },
        defaultCountryCode: {
          type: 'string',
          displayName: 'Default Country Code',
          description: 'Country code to use if not specified (e.g., +1)',
          required: false,
          default: '+1',
        },
      },
      run: async ({ props }) => {
        const phoneNumber = driver.formatPhoneNumber(
          props.phoneNumber,
          props.defaultCountryCode || '+1'
        );
        const result = await driver.sendSms(phoneNumber, props.message);
        return {
          ...result,
          phoneNumber,
          messageLength: props.message.length,
        };
      },
    },

    sendAlert: {
      displayName: 'Send Alert SMS',
      description: 'Send a pre-formatted alert SMS',
      props: {
        phoneNumber: {
          type: 'string',
          displayName: 'Phone Number',
          description: 'The recipient phone number',
          required: true,
        },
        alertType: {
          type: 'string',
          displayName: 'Alert Type',
          description: 'Type of alert to send',
          required: true,
          enum: ['arrival', 'departure', 'emergency', 'custom'],
        },
        location: {
          type: 'string',
          displayName: 'Location',
          description: 'Location name for the alert',
          required: false,
        },
        customMessage: {
          type: 'string',
          displayName: 'Custom Message',
          description: 'Custom message (for custom alert type)',
          required: false,
        },
      },
      run: async ({ props }) => {
        let message: string;
        const timestamp = new Date().toLocaleString();
        const location = props.location || 'the location';
        
        switch (props.alertType) {
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
            message = props.customMessage || `Alert from ${location} at ${timestamp}`;
            break;
          default:
            message = `Alert: ${location} - ${timestamp}`;
        }
        
        const phoneNumber = driver.formatPhoneNumber(props.phoneNumber);
        const result = await driver.sendSms(phoneNumber, message);
        
        return {
          ...result,
          alertType: props.alertType,
          phoneNumber,
          message,
        };
      },
    },

    readMessages: {
      displayName: 'Read Messages',
      description: 'Read SMS messages from the device (Android only)',
      props: {
        phoneNumber: {
          type: 'string',
          displayName: 'Phone Number',
          description: 'Filter by phone number (optional)',
          required: false,
        },
        limit: {
          type: 'number',
          displayName: 'Limit',
          description: 'Maximum number of messages to retrieve',
          required: false,
          default: 50,
        },
        folder: {
          type: 'string',
          displayName: 'Folder',
          description: 'Which folder to read from',
          required: false,
          default: 'all',
          enum: ['inbox', 'sent', 'all'],
        },
        unreadOnly: {
          type: 'boolean',
          displayName: 'Unread Only',
          description: 'Only retrieve unread messages',
          required: false,
          default: false,
        },
      },
      run: async ({ props }) => {
        const result = await driver.readSms({
          phoneNumber: props.phoneNumber,
          limit: props.limit || 50,
          folder: props.folder as 'inbox' | 'sent' | 'all',
          unreadOnly: props.unreadOnly || false,
        });
        
        return {
          ...result,
          retrievedCount: result.messages.length,
        };
      },
    },

    getUnreadCount: {
      displayName: 'Get Unread Count',
      description: 'Get the count of unread SMS messages (Android only)',
      props: {},
      run: async () => {
        const result = await driver.readSms({ unreadOnly: true, folder: 'inbox' });
        return {
          unreadCount: result.totalCount,
        };
      },
    },

    checkPermissions: {
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
    },

    requestPermissions: {
      displayName: 'Request Permissions',
      description: 'Request SMS permissions from the user',
      props: {
        sendSms: {
          type: 'boolean',
          displayName: 'Send SMS Permission',
          description: 'Request permission to send SMS',
          required: false,
          default: true,
        },
        readSms: {
          type: 'boolean',
          displayName: 'Read SMS Permission',
          description: 'Request permission to read SMS (Android only)',
          required: false,
          default: false,
        },
      },
      run: async ({ props }) => {
        const permissionsToRequest: ('sendSms' | 'readSms')[] = [];
        if (props.sendSms !== false) permissionsToRequest.push('sendSms');
        if (props.readSms) permissionsToRequest.push('readSms');
        
        const permissions = await driver.requestPermissions(permissionsToRequest);
        return {
          ...permissions,
          requested: permissionsToRequest,
          canSend: permissions.sendSms === 'granted',
          canRead: permissions.readSms === 'granted',
        };
      },
    },

    // Utility actions
    formatPhoneNumber: {
      displayName: 'Format Phone Number',
      description: 'Format a phone number to E.164 format',
      props: {
        phoneNumber: {
          type: 'string',
          displayName: 'Phone Number',
          description: 'The phone number to format',
          required: true,
        },
        defaultCountryCode: {
          type: 'string',
          displayName: 'Default Country Code',
          description: 'Country code to use if not specified (e.g., +1)',
          required: false,
          default: '+1',
        },
      },
      run: async ({ props }) => {
        const formatted = driver.formatPhoneNumber(
          props.phoneNumber,
          props.defaultCountryCode || '+1'
        );
        return {
          original: props.phoneNumber,
          formatted,
        };
      },
    },
  },

  triggers: {
    // SMS triggers would require background SMS listening which
    // requires special permissions and native service integration.
    // This is complex on both Android (needs to be default SMS app
    // or have specific receiver) and impossible on iOS.
    // 
    // For automation scenarios, use polling with readMessages action
    // or combine with other triggers (location, wifi) to send SMS.
  },
};

export default sms;
