/**
 * @ha-bits/bit-google-calendar
 * 
 * Google Calendar integration with OAuth2 authentication.
 * Provides calendar event fetching and OAuth token management.
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';

interface AuthContext {
  auth: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  propsValue: Record<string, any>;
}

interface TokenContext extends AuthContext {
  propsValue: {
    code?: string;
    refreshToken?: string;
    accessToken?: string;
    scopes?: string;
  };
}

interface ListEventsContext extends AuthContext {
  propsValue: {
    accessToken: string;
    refreshToken?: string;
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: string;
  };
}

function createOAuth2Client(auth: AuthContext['auth']): OAuth2Client {
  return new google.auth.OAuth2(
    auth.clientId,
    auth.clientSecret,
    auth.redirectUri
  );
}

const googleCalendarBit = {
  displayName: 'Google Calendar',
  description: 'Google Calendar integration with OAuth2 for fetching events and managing calendars',
  logoUrl: 'lucide:Calendar',
  
  auth: {
    type: 'CUSTOM' as const,
    props: {
      clientId: {
        type: 'SECRET_TEXT',
        displayName: 'Client ID',
        description: 'Google OAuth2 Client ID',
        required: true,
      },
      clientSecret: {
        type: 'SECRET_TEXT',
        displayName: 'Client Secret',
        description: 'Google OAuth2 Client Secret',
        required: true,
      },
      redirectUri: {
        type: 'SHORT_TEXT',
        displayName: 'Redirect URI',
        description: 'OAuth callback URL (e.g., http://localhost:3000/api/auth/callback)',
        required: true,
      },
    },
  },
  
  actions: {
    /**
     * Generate OAuth authorization URL
     */
    getAuthUrl: {
      name: 'getAuthUrl',
      displayName: 'Get Auth URL',
      description: 'Generate Google OAuth authorization URL for user consent',
      props: {
        scopes: {
          type: 'SHORT_TEXT',
          displayName: 'Scopes',
          description: 'OAuth scopes (comma-separated). Default: calendar.readonly,gmail.send',
          required: false,
          defaultValue: 'https://www.googleapis.com/auth/calendar.readonly,https://www.googleapis.com/auth/gmail.send',
        },
        state: {
          type: 'SHORT_TEXT',
          displayName: 'State',
          description: 'Optional state parameter for CSRF protection',
          required: false,
        },
        accessType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Access Type',
          description: 'Type of access (offline for refresh tokens)',
          required: false,
          defaultValue: 'offline',
          options: {
            options: [
              { label: 'Offline (with refresh token)', value: 'offline' },
              { label: 'Online', value: 'online' },
            ],
          },
        },
      },
      async run(context: AuthContext & { propsValue: { scopes?: string; state?: string; accessType?: string } }) {
        const oauth2Client = createOAuth2Client(context.auth);
        
        const scopes = context.propsValue.scopes?.split(',').map(s => s.trim()) || [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/gmail.send',
        ];
        
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: context.propsValue.accessType || 'offline',
          scope: scopes,
          state: context.propsValue.state,
          prompt: 'consent', // Force consent to get refresh token
        });
        
        console.log('📅 Generated Google OAuth URL');
        
        return {
          authUrl,
          scopes,
        };
      },
    },
    
    /**
     * Exchange authorization code for tokens
     */
    exchangeCode: {
      name: 'exchangeCode',
      displayName: 'Exchange Code for Tokens',
      description: 'Exchange OAuth authorization code for access and refresh tokens',
      props: {
        code: {
          type: 'SHORT_TEXT',
          displayName: 'Authorization Code',
          description: 'The authorization code from OAuth callback',
          required: true,
        },
      },
      async run(context: TokenContext) {
        const oauth2Client = createOAuth2Client(context.auth);
        
        const { tokens } = await oauth2Client.getToken(context.propsValue.code!);
        
        console.log('📅 Exchanged code for tokens');
        
        return {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          tokenType: tokens.token_type,
          scope: tokens.scope,
        };
      },
    },
    
    /**
     * Refresh access token using refresh token
     */
    refreshToken: {
      name: 'refreshToken',
      displayName: 'Refresh Access Token',
      description: 'Get a new access token using a refresh token',
      props: {
        refreshToken: {
          type: 'SECRET_TEXT',
          displayName: 'Refresh Token',
          description: 'The refresh token to use',
          required: true,
        },
      },
      async run(context: TokenContext) {
        const oauth2Client = createOAuth2Client(context.auth);
        
        oauth2Client.setCredentials({
          refresh_token: context.propsValue.refreshToken,
        });
        
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        console.log('📅 Refreshed access token');
        
        return {
          accessToken: credentials.access_token,
          expiryDate: credentials.expiry_date,
          refreshToken: credentials.refresh_token || context.propsValue.refreshToken,
        };
      },
    },
    
    /**
     * List calendar events
     */
    listEvents: {
      name: 'listEvents',
      displayName: 'List Events',
      description: 'Fetch calendar events for a date range',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'OAuth access token',
          required: true,
        },
        refreshToken: {
          type: 'SECRET_TEXT',
          displayName: 'Refresh Token',
          description: 'OAuth refresh token (for auto-refresh)',
          required: false,
        },
        calendarId: {
          type: 'SHORT_TEXT',
          displayName: 'Calendar ID',
          description: 'Calendar ID (default: primary)',
          required: false,
          defaultValue: 'primary',
        },
        timeMin: {
          type: 'SHORT_TEXT',
          displayName: 'Start Time',
          description: 'Start of time range (ISO 8601). Default: now',
          required: false,
        },
        timeMax: {
          type: 'SHORT_TEXT',
          displayName: 'End Time',
          description: 'End of time range (ISO 8601). Default: 7 days from now',
          required: false,
        },
        maxResults: {
          type: 'NUMBER',
          displayName: 'Max Results',
          description: 'Maximum number of events to return',
          required: false,
          defaultValue: 100,
        },
        singleEvents: {
          type: 'CHECKBOX',
          displayName: 'Expand Recurring',
          description: 'Expand recurring events into single instances',
          required: false,
          defaultValue: true,
        },
        orderBy: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Order By',
          description: 'Sort order for events',
          required: false,
          defaultValue: 'startTime',
          options: {
            options: [
              { label: 'Start Time', value: 'startTime' },
              { label: 'Updated', value: 'updated' },
            ],
          },
        },
      },
      async run(context: ListEventsContext) {
        const oauth2Client = createOAuth2Client(context.auth);
        
        const credentials: Credentials = {
          access_token: context.propsValue.accessToken,
        };
        if (context.propsValue.refreshToken) {
          credentials.refresh_token = context.propsValue.refreshToken;
        }
        oauth2Client.setCredentials(credentials);
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        const now = new Date();
        const defaultTimeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const response = await calendar.events.list({
          calendarId: context.propsValue.calendarId || 'primary',
          timeMin: context.propsValue.timeMin || now.toISOString(),
          timeMax: context.propsValue.timeMax || defaultTimeMax.toISOString(),
          maxResults: context.propsValue.maxResults || 100,
          singleEvents: context.propsValue.singleEvents !== false,
          orderBy: context.propsValue.orderBy || 'startTime',
        });
        
        const events = response.data.items || [];
        
        // Transform events to a cleaner format
        const transformedEvents = events.map((event: calendar_v3.Schema$Event) => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          attendees: event.attendees?.map(a => ({
            email: a.email,
            displayName: a.displayName,
            responseStatus: a.responseStatus,
            organizer: a.organizer,
            self: a.self,
          })) || [],
          organizer: event.organizer,
          created: event.created,
          updated: event.updated,
          htmlLink: event.htmlLink,
          status: event.status,
        }));
        
        console.log(`📅 Fetched ${transformedEvents.length} calendar events`);
        
        return {
          events: transformedEvents,
          count: transformedEvents.length,
          calendarId: context.propsValue.calendarId || 'primary',
          timeRange: {
            min: context.propsValue.timeMin || now.toISOString(),
            max: context.propsValue.timeMax || defaultTimeMax.toISOString(),
          },
        };
      },
    },
    
    /**
     * Get a single event by ID
     */
    getEvent: {
      name: 'getEvent',
      displayName: 'Get Event',
      description: 'Get details of a specific calendar event',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'OAuth access token',
          required: true,
        },
        calendarId: {
          type: 'SHORT_TEXT',
          displayName: 'Calendar ID',
          description: 'Calendar ID (default: primary)',
          required: false,
          defaultValue: 'primary',
        },
        eventId: {
          type: 'SHORT_TEXT',
          displayName: 'Event ID',
          description: 'The ID of the event to retrieve',
          required: true,
        },
      },
      async run(context: AuthContext & { propsValue: { accessToken: string; calendarId?: string; eventId: string } }) {
        const oauth2Client = createOAuth2Client(context.auth);
        oauth2Client.setCredentials({ access_token: context.propsValue.accessToken });
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        const response = await calendar.events.get({
          calendarId: context.propsValue.calendarId || 'primary',
          eventId: context.propsValue.eventId,
        });
        
        const event = response.data;
        
        console.log(`📅 Retrieved event: ${event.summary}`);
        
        return {
          id: event.id,
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          attendees: event.attendees?.map(a => ({
            email: a.email,
            displayName: a.displayName,
            responseStatus: a.responseStatus,
            organizer: a.organizer,
            self: a.self,
          })) || [],
          organizer: event.organizer,
          created: event.created,
          updated: event.updated,
          htmlLink: event.htmlLink,
          status: event.status,
        };
      },
    },
    
    /**
     * Get user's email from token
     */
    getUserInfo: {
      name: 'getUserInfo',
      displayName: 'Get User Info',
      description: 'Get user email and profile info from access token',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'OAuth access token',
          required: true,
        },
      },
      async run(context: AuthContext & { propsValue: { accessToken: string } }) {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${context.propsValue.accessToken}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to get user info: ${response.statusText}`);
        }
        
        const userInfo = await response.json();
        
        console.log(`📅 Retrieved user info for: ${userInfo.email}`);
        
        return {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          id: userInfo.id,
        };
      },
    },
  },
  
  triggers: {},
};

export const googleCalendar = googleCalendarBit;
export default googleCalendarBit;
