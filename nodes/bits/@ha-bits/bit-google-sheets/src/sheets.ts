/**
 * Shared Google Sheets API helpers.
 */

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SheetRangeResult {
  range: string;
  values: unknown[][];
  rowCount: number;
}

export async function sheetsRequest(
  endpoint: string,
  method: string,
  accessToken: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const url = endpoint.startsWith('http') ? endpoint : `${SHEETS_API_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
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

/** Fetch cell values for a range — shared by readRange action and newRows trigger. */
export async function fetchRange(
  accessToken: string,
  spreadsheetId: string,
  range: string,
): Promise<SheetRangeResult> {
  const result = await sheetsRequest(
    `/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    'GET',
    accessToken,
  );

  const values = (result.values as unknown[][]) || [];

  return {
    range: String(result.range || range),
    values,
    rowCount: values.length,
  };
}
