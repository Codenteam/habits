/**
 * @ha-bits/bit-google-sheets
 *
 * Google Sheets integration for Habits workflows.
 * Supports reading, writing, and appending data to Google Sheets.
 */

import { createHash } from 'crypto';
import { fetchRange, sheetsRequest } from './sheets';

// ============================================================================
// Types
// ============================================================================

interface GoogleSheetsContext {
  auth?: {
    accessToken?: string;
    refreshToken?: string;
    serviceAccountKey?: string;
  };
  propsValue: Record<string, any>;
}

type GoogleSheetsPollingContext = GoogleSheetsContext & {
  pollingStore?: {
    hasSeenItem: (itemId: string, itemDate?: string) => Promise<boolean>;
    markItemSeen: (itemId: string, itemDate: string, data?: unknown) => Promise<void>;
    getLastPolledDate: () => Promise<string | null>;
    setLastPolledDate: (date: string) => Promise<void>;
  };
  setSchedule?: (options: { cronExpression: string; timezone?: string }) => void;
};

// ============================================================================
// Auth
// ============================================================================

async function getAccessToken(context: GoogleSheetsContext): Promise<string> {
  const fromProps = context.propsValue.accessToken;
  if (typeof fromProps === 'string' && fromProps.trim()) {
    return fromProps.trim();
  }

  if (context.auth?.accessToken) {
    return context.auth.accessToken;
  }

  const serviceAccountKey = context.propsValue.serviceAccountKey || context.auth?.serviceAccountKey;

  if (serviceAccountKey) {
    let credentials: Record<string, unknown>;
    try {
      credentials = typeof serviceAccountKey === 'string'
        ? JSON.parse(serviceAccountKey)
        : serviceAccountKey;
    } catch {
      throw new Error('Invalid service account key JSON');
    }

    const now = Math.floor(Date.now() / 1000);
    void credentials;
    void now;
    throw new Error('Service account authentication requires the access token to be pre-generated. Please provide an access token.');
  }

  throw new Error('No OAuth token. Please authorize Google Sheets access first.');
}

/** Dedup key from spreadsheet + range + full row content (stable when rows shift). */
function buildRowItemId(spreadsheetId: string, range: string, row: unknown[]): string {
  const contentHash = createHash('sha256').update(JSON.stringify(row)).digest('hex');
  return `${spreadsheetId}:${range}:content:${contentHash}`;
}

// ============================================================================
// Bit Definition
// ============================================================================

const googleSheetsBit = {
  displayName: 'Google Sheets',
  description: 'Read, write, and append data to Google Sheets',
  logoUrl: 'lucide:Table',
  runtime: 'all',

  auth: {
    type: 'OAUTH2',
    displayName: 'Google Sheets',
    description: 'Connect to Google Sheets using OAuth2',
    required: true,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    extraAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },

  actions: {
    appendRow: {
      name: 'appendRow',
      displayName: 'Append Row',
      description: 'Append a new row to the end of a Google Sheet',
      props: {
        spreadsheetId: {
          type: 'SHORT_TEXT',
          displayName: 'Spreadsheet ID',
          description: 'The ID of the spreadsheet (from the URL)',
          required: true,
        },
        sheetName: {
          type: 'SHORT_TEXT',
          displayName: 'Sheet Name',
          description: 'Name of the sheet/tab (e.g., "Sheet1" or "Invoices")',
          required: true,
          defaultValue: 'Sheet1',
        },
        values: {
          type: 'JSON',
          displayName: 'Values',
          description: 'Array of values for the new row, e.g., ["Value1", "Value2", 123]',
          required: true,
        },
      },

      async run(context: GoogleSheetsContext): Promise<any> {
        const accessToken = await getAccessToken(context);
        const { spreadsheetId, sheetName, values } = context.propsValue;

        if (!spreadsheetId || !sheetName || !values) {
          throw new Error('Spreadsheet ID, sheet name, and values are required');
        }

        let rowValues: unknown[];
        if (typeof values === 'string') {
          try {
            rowValues = JSON.parse(values);
          } catch {
            rowValues = [values];
          }
        } else if (Array.isArray(values)) {
          rowValues = values;
        } else {
          rowValues = [values];
        }

        console.log(`📊 Google Sheets: Appending row to ${sheetName}...`);

        const range = `${sheetName}!A:Z`;
        const result = await sheetsRequest(
          `/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          'POST',
          accessToken,
          {
            values: [rowValues],
          },
        );

        const updates = result.updates as Record<string, unknown> | undefined;

        return {
          success: true,
          spreadsheetId,
          updatedRange: updates?.updatedRange || range,
          updatedRows: updates?.updatedRows || 1,
          updatedColumns: updates?.updatedColumns || rowValues.length,
        };
      },
    },

    readRange: {
      name: 'readRange',
      displayName: 'Read Range',
      description: 'Read data from a range of cells',
      props: {
        spreadsheetId: {
          type: 'SHORT_TEXT',
          displayName: 'Spreadsheet ID',
          description: 'The ID of the spreadsheet',
          required: true,
        },
        range: {
          type: 'SHORT_TEXT',
          displayName: 'Range',
          description: 'A1 notation range (e.g., "Sheet1!A1:D10")',
          required: true,
        },
      },

      async run(context: GoogleSheetsContext): Promise<any> {
        const accessToken = await getAccessToken(context);
        const { spreadsheetId, range } = context.propsValue;

        if (!spreadsheetId || !range) {
          throw new Error('Spreadsheet ID and range are required');
        }

        console.log(`📊 Google Sheets: Reading range ${range}...`);

        return fetchRange(accessToken, spreadsheetId, range);
      },
    },

    writeRange: {
      name: 'writeRange',
      displayName: 'Write Range',
      description: 'Write data to a specific range of cells',
      props: {
        spreadsheetId: {
          type: 'SHORT_TEXT',
          displayName: 'Spreadsheet ID',
          description: 'The ID of the spreadsheet',
          required: true,
        },
        range: {
          type: 'SHORT_TEXT',
          displayName: 'Range',
          description: 'A1 notation range (e.g., "Sheet1!A1:D10")',
          required: true,
        },
        values: {
          type: 'JSON',
          displayName: 'Values',
          description: '2D array of values, e.g., [["A1", "B1"], ["A2", "B2"]]',
          required: true,
        },
      },

      async run(context: GoogleSheetsContext): Promise<any> {
        const accessToken = await getAccessToken(context);
        const { spreadsheetId, range, values } = context.propsValue;

        if (!spreadsheetId || !range || !values) {
          throw new Error('Spreadsheet ID, range, and values are required');
        }

        let data: unknown[][];
        if (typeof values === 'string') {
          data = JSON.parse(values);
        } else {
          data = values;
        }

        if (!Array.isArray(data[0])) {
          data = [data];
        }

        console.log(`📊 Google Sheets: Writing to range ${range}...`);

        const result = await sheetsRequest(
          `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
          'PUT',
          accessToken,
          { values: data },
        );

        return {
          success: true,
          spreadsheetId,
          updatedRange: result.updatedRange,
          updatedRows: result.updatedRows,
          updatedColumns: result.updatedColumns,
          updatedCells: result.updatedCells,
        };
      },
    },

    getSpreadsheet: {
      name: 'getSpreadsheet',
      displayName: 'Get Spreadsheet Info',
      description: 'Get information about a spreadsheet, including sheet names',
      props: {
        spreadsheetId: {
          type: 'SHORT_TEXT',
          displayName: 'Spreadsheet ID',
          description: 'The ID of the spreadsheet',
          required: true,
        },
      },

      async run(context: GoogleSheetsContext): Promise<any> {
        const accessToken = await getAccessToken(context);
        const { spreadsheetId } = context.propsValue;

        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID is required');
        }

        console.log(`📊 Google Sheets: Getting spreadsheet info...`);

        const result = await sheetsRequest(
          `/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
          'GET',
          accessToken,
        );

        const sheets = (result.sheets as Array<{ properties: Record<string, unknown> }>) || [];

        return {
          spreadsheetId: result.spreadsheetId,
          title: (result.properties as Record<string, unknown>)?.title,
          sheets: sheets.map((s) => ({
            sheetId: s.properties.sheetId,
            title: s.properties.title,
            index: s.properties.index,
            rowCount: (s.properties.gridProperties as Record<string, unknown>)?.rowCount,
            columnCount: (s.properties.gridProperties as Record<string, unknown>)?.columnCount,
          })),
        };
      },
    },

    clearRange: {
      name: 'clearRange',
      displayName: 'Clear Range',
      description: 'Clear all values from a range',
      props: {
        spreadsheetId: {
          type: 'SHORT_TEXT',
          displayName: 'Spreadsheet ID',
          description: 'The ID of the spreadsheet',
          required: true,
        },
        range: {
          type: 'SHORT_TEXT',
          displayName: 'Range',
          description: 'A1 notation range to clear',
          required: true,
        },
      },

      async run(context: GoogleSheetsContext): Promise<any> {
        const accessToken = await getAccessToken(context);
        const { spreadsheetId, range } = context.propsValue;

        if (!spreadsheetId || !range) {
          throw new Error('Spreadsheet ID and range are required');
        }

        console.log(`📊 Google Sheets: Clearing range ${range}...`);

        const result = await sheetsRequest(
          `/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
          'POST',
          accessToken,
          {},
        );

        return {
          success: true,
          clearedRange: result.clearedRange,
        };
      },
    },
  },

  triggers: {
    newRows: {
      name: 'newRows',
      displayName: 'New Rows (polling)',
      description:
        'Polls a Google Sheet range on a schedule and returns rows not seen before (deduplicated by spreadsheet + row content hash).',
      type: 'POLLING',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'Optional OAuth access token override (for polling without interactive auth)',
          required: false,
        },
        spreadsheetId: {
          type: 'SHORT_TEXT',
          displayName: 'Spreadsheet ID',
          description: 'The ID of the spreadsheet',
          required: true,
        },
        range: {
          type: 'SHORT_TEXT',
          displayName: 'Range',
          description: 'A1 notation range (e.g., "Sheet1!A1:D100")',
          required: true,
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Poll Interval',
          description: 'Cron expression (default: every 1 minute)',
          required: false,
          defaultValue: '*/1 * * * *',
        },
        timezone: {
          type: 'SHORT_TEXT',
          displayName: 'Timezone',
          required: false,
          defaultValue: 'UTC',
        },
        hasHeaderRow: {
          type: 'CHECKBOX',
          displayName: 'Has Header Row',
          description: 'Skip the first row when returning new data rows',
          required: false,
          defaultValue: true,
        },
      },
      async onEnable(context: GoogleSheetsPollingContext): Promise<void> {
        const cronExpression = context.propsValue.cronExpression || '*/1 * * * *';
        const timezone = context.propsValue.timezone || 'UTC';
        context.setSchedule?.({ cronExpression, timezone });
      },
      async onDisable(_context: GoogleSheetsPollingContext): Promise<void> {
        // Server stops cron jobs on shutdown.
      },
      async run(context: GoogleSheetsPollingContext) {
        const accessToken = await getAccessToken(context);
        const { spreadsheetId, range } = context.propsValue;
        const hasHeaderRow = context.propsValue.hasHeaderRow !== false;
        const pollingStore = context.pollingStore;

        if (!spreadsheetId || !range) {
          throw new Error('Spreadsheet ID and range are required');
        }

        const result = await fetchRange(accessToken, spreadsheetId, range);
        const pollTimestamp = new Date().toISOString();
        const newRows: Array<{
          spreadsheetId: string;
          range: string;
          rowIndex: number;
          values: unknown[];
        }> = [];

        for (let i = 0; i < result.values.length; i++) {
          if (hasHeaderRow && i === 0) {
            continue;
          }

          const row = result.values[i];
          const rowIndex = i + 1;
          const itemId = buildRowItemId(spreadsheetId, range, row);

          if (pollingStore) {
            const seen = await pollingStore.hasSeenItem(itemId);
            if (seen) {
              continue;
            }
            await pollingStore.markItemSeen(itemId, pollTimestamp, {
              spreadsheetId,
              range: result.range,
              rowIndex,
              values: row,
            });
          }

          newRows.push({
            spreadsheetId,
            range: result.range,
            rowIndex,
            values: row,
          });
        }

        if (pollingStore) {
          await pollingStore.setLastPolledDate(pollTimestamp);
        }

        console.log(
          `[bit-google-sheets] newRows poll: ${newRows.length} new row(s) from ${spreadsheetId} ${range}`,
        );

        return newRows;
      },
      async test(_context: GoogleSheetsPollingContext) {
        return [
          {
            spreadsheetId: 'sheet123',
            range: 'Sheet1!A1:D2',
            rowIndex: 2,
            values: ['ID-001', 'Alice', 'alice@example.com', 'Active'],
          },
        ];
      },
      sampleData: {
        spreadsheetId: 'sheet123',
        range: 'Sheet1!A1:D2',
        rowIndex: 2,
        values: ['ID-001', 'Alice', 'alice@example.com', 'Active'],
      },
    },
  },
};

export default googleSheetsBit;
