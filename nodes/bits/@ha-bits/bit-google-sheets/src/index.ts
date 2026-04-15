/**
 * @ha-bits/bit-google-sheets
 * 
 * Google Sheets integration for Habits workflows.
 * Supports reading, writing, and appending data to Google Sheets.
 */

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

interface SheetRange {
  values: any[][];
}

// ============================================================================
// Google Sheets API Helper
// ============================================================================

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

async function getAccessToken(context: GoogleSheetsContext): Promise<string> {
  // If direct access token is provided
  if (context.propsValue.accessToken) {
    return context.propsValue.accessToken;
  }
  if (context.auth?.accessToken) {
    return context.auth.accessToken;
  }
  
  // If service account key is provided (JSON)
  const serviceAccountKey = context.propsValue.serviceAccountKey || context.auth?.serviceAccountKey;

  /**
   * Implementation removed: Keeping client ID and secret is no longer secure in stronghold. Service account authentication should be done externally and the access token provided directly to the bit. Maybe the vault can help here? 
   * 
   * TODO: Check Vault implementation for OAuth stuff and app secrets.
   */
  if (serviceAccountKey) {
    // Parse service account credentials
    let credentials: any;
    try {
      credentials = typeof serviceAccountKey === 'string' 
        ? JSON.parse(serviceAccountKey) 
        : serviceAccountKey;
    } catch {
      throw new Error('Invalid service account key JSON');
    }

    // Create JWT for service account auth
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    // Note: In a real implementation, you'd use a proper JWT library
    // For now, we'll require the access token directly
    throw new Error('Service account authentication requires the access token to be pre-generated. Please provide an access token.');
  }
  
  throw new Error('Google Sheets authentication required. Provide an access token or service account key.');
}

async function sheetsRequest(
  endpoint: string,
  method: string,
  accessToken: string,
  body?: any
): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${SHEETS_API_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Sheets API Error: ${response.status} - ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
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
    displayName: 'Google Account',
    description: 'Google account with Sheets access',
    required: true,
  },

  // ============================================================================
  // Actions
  // ============================================================================
  
  actions: {
    /**
     * Append Row
     * Add a new row to the end of a sheet
     */
    appendRow: {
      name: 'appendRow',
      displayName: 'Append Row',
      description: 'Append a new row to the end of a Google Sheet',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'Google OAuth access token',
          required: true,
        },
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

        // Parse values if it's a string
        let rowValues: any[];
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
          }
        );
        
        return {
          success: true,
          spreadsheetId,
          updatedRange: result.updates?.updatedRange || range,
          updatedRows: result.updates?.updatedRows || 1,
          updatedColumns: result.updates?.updatedColumns || rowValues.length,
        };
      },
    },

    /**
     * Read Range
     * Read data from a range of cells
     */
    readRange: {
      name: 'readRange',
      displayName: 'Read Range',
      description: 'Read data from a range of cells',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'Google OAuth access token',
          required: true,
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
        
        const result = await sheetsRequest(
          `/${spreadsheetId}/values/${encodeURIComponent(range)}`,
          'GET',
          accessToken
        );
        
        return {
          range: result.range,
          values: result.values || [],
          rowCount: (result.values || []).length,
        };
      },
    },

    /**
     * Write Range
     * Write data to a specific range
     */
    writeRange: {
      name: 'writeRange',
      displayName: 'Write Range',
      description: 'Write data to a specific range of cells',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'Google OAuth access token',
          required: true,
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

        // Parse values if it's a string
        let data: any[][];
        if (typeof values === 'string') {
          data = JSON.parse(values);
        } else {
          data = values;
        }

        // Ensure it's a 2D array
        if (!Array.isArray(data[0])) {
          data = [data];
        }

        console.log(`📊 Google Sheets: Writing to range ${range}...`);
        
        const result = await sheetsRequest(
          `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
          'PUT',
          accessToken,
          {
            values: data,
          }
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

    /**
     * Get Spreadsheet Info
     */
    getSpreadsheet: {
      name: 'getSpreadsheet',
      displayName: 'Get Spreadsheet Info',
      description: 'Get information about a spreadsheet, including sheet names',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'Google OAuth access token',
          required: true,
        },
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
          accessToken
        );
        
        return {
          spreadsheetId: result.spreadsheetId,
          title: result.properties?.title,
          sheets: (result.sheets || []).map((s: any) => ({
            sheetId: s.properties.sheetId,
            title: s.properties.title,
            index: s.properties.index,
            rowCount: s.properties.gridProperties?.rowCount,
            columnCount: s.properties.gridProperties?.columnCount,
          })),
        };
      },
    },

    /**
     * Clear Range
     */
    clearRange: {
      name: 'clearRange',
      displayName: 'Clear Range',
      description: 'Clear all values from a range',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'Google OAuth access token',
          required: true,
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
          {}
        );
        
        return {
          success: true,
          clearedRange: result.clearedRange,
        };
      },
    },
  },
};

export default googleSheetsBit;
