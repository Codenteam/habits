/**
 * Airtable record API response shapes.
 * @see https://airtable.com/developers/web/api/get-record
 * @see https://airtable.com/developers/web/api/create-records
 */

import { airtableRequest } from './driver';

export type AirtableRecordFields = Record<string, unknown>;

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: AirtableRecordFields;
}

export interface AirtableRecordsResponse {
  records?: AirtableRecord[];
}

export interface MappedAirtableRecord {
  recordId: string;
  createdTime: string;
  fields: AirtableRecordFields;
}

export interface ListRecordsOptions {
  maxRecords?: number;
  filterByFormula?: string;
}

/** Fetch records from a table — shared by listRecords action and newRecords trigger. */
export async function fetchListRecords(
  token: string,
  baseId: string,
  tableId: string,
  options: ListRecordsOptions = {},
): Promise<MappedAirtableRecord[]> {
  const maxRecords = Number(options.maxRecords || 10);
  const params = new URLSearchParams();
  params.set('pageSize', String(Math.min(Math.max(maxRecords, 1), 100)));
  if (options.filterByFormula) {
    params.set('filterByFormula', options.filterByFormula);
  }

  const result = await airtableRequest<AirtableRecordsResponse>(
    `/${baseId}/${tableId}?${params.toString()}`,
    token,
  );

  return (result.records || []).map((record) => ({
    recordId: record.id,
    createdTime: record.createdTime,
    fields: record.fields,
  }));
}
