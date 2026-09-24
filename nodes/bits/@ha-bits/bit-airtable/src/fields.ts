/**
 * Airtable schema field helpers.
 * @see https://airtable.com/developers/web/api/create-field
 */

import { airtableRequest } from './driver';

export type AirtableFieldType =
  | 'singleLineText'
  | 'email'
  | 'phoneNumber'
  | 'url'
  | 'number'
  | 'multilineText';

export interface AirtableFieldDefinition {
  id: string;
  name: string;
  type: string;
}

export interface AirtableTableMeta {
  id: string;
  name: string;
  description?: string;
  fields?: AirtableFieldDefinition[];
}

export interface AirtableTablesResponse {
  tables?: AirtableTableMeta[];
}

export interface EnsureFieldsResult {
  success: boolean;
  created: Array<{ name: string; id: string; type: string }>;
  skipped: string[];
  fields: AirtableFieldDefinition[];
}

const FIELD_TYPE_OPTIONS = [
  { label: 'Single line text', value: 'singleLineText' },
  { label: 'Email', value: 'email' },
  { label: 'Phone number', value: 'phoneNumber' },
  { label: 'URL', value: 'url' },
  { label: 'Number', value: 'number' },
  { label: 'Long text', value: 'multilineText' },
];

export const AIRTABLE_FIELD_TYPE_OPTIONS = FIELD_TYPE_OPTIONS;

export function inferFieldType(fieldName: string): AirtableFieldType {
  const normalized = fieldName.trim().toLowerCase();

  if (normalized.includes('email') || normalized === 'e-mail') {
    return 'email';
  }
  if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('tel')) {
    return 'phoneNumber';
  }
  if (
    normalized.includes('url') ||
    normalized.includes('website') ||
    normalized.includes('link')
  ) {
    return 'url';
  }
  if (
    normalized.includes('amount') ||
    normalized.includes('price') ||
    normalized.includes('total') ||
    normalized.includes('count') ||
    normalized.includes('qty') ||
    normalized.includes('quantity')
  ) {
    return 'number';
  }
  if (
    normalized.includes('note') ||
    normalized.includes('description') ||
    normalized.includes('comment') ||
    normalized.includes('message')
  ) {
    return 'multilineText';
  }

  return 'singleLineText';
}

export function parseColumnsInput(columns: unknown): string[] {
  if (Array.isArray(columns)) {
    return columns.map((column) => String(column).trim()).filter(Boolean);
  }

  if (typeof columns === 'string') {
    const trimmed = columns.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('columns must be a JSON array of field names');
      }
      return parsed.map((column) => String(column).trim()).filter(Boolean);
    }
    return trimmed.split(',').map((column) => column.trim()).filter(Boolean);
  }

  return [];
}

export function parseFieldTypesOverride(fieldTypes: unknown): Record<string, AirtableFieldType> {
  if (!fieldTypes) {
    return {};
  }

  let parsed: unknown = fieldTypes;
  if (typeof fieldTypes === 'string') {
    parsed = JSON.parse(fieldTypes);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('fieldTypes must be a JSON object mapping field names to Airtable types');
  }

  const result: Record<string, AirtableFieldType> = {};
  for (const [name, type] of Object.entries(parsed as Record<string, unknown>)) {
    result[name] = String(type) as AirtableFieldType;
  }
  return result;
}

export async function getTableFields(
  token: string,
  baseId: string,
  tableId: string,
): Promise<AirtableFieldDefinition[]> {
  const result = await airtableRequest<AirtableTablesResponse>(
    `/meta/bases/${baseId}/tables`,
    token,
  );

  const table = (result.tables || []).find((entry) => entry.id === tableId);
  if (!table) {
    throw new Error(`Table not found in base: ${tableId}`);
  }

  return (table.fields || []).map((field) => ({
    id: field.id,
    name: field.name,
    type: field.type,
  }));
}

export async function createTableField(
  token: string,
  baseId: string,
  tableId: string,
  name: string,
  type: AirtableFieldType,
  description?: string,
): Promise<AirtableFieldDefinition> {
  const body: Record<string, unknown> = { name, type };
  if (description) {
    body.description = description;
  }
  if (type === 'number') {
    body.options = { precision: 0 };
  }

  const created = await airtableRequest<AirtableFieldDefinition>(
    `/meta/bases/${baseId}/tables/${tableId}/fields`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );

  return {
    id: created.id,
    name: created.name,
    type: created.type,
  };
}

export async function ensureTableFields(
  token: string,
  baseId: string,
  tableId: string,
  columns: string[],
  fieldTypesOverride: Record<string, AirtableFieldType> = {},
): Promise<EnsureFieldsResult> {
  if (columns.length === 0) {
    throw new Error('At least one field name is required');
  }

  const existingFields = await getTableFields(token, baseId, tableId);
  const existingNames = new Set(existingFields.map((field) => field.name));
  const created: Array<{ name: string; id: string; type: string }> = [];
  const skipped: string[] = [];

  for (const column of columns) {
    if (existingNames.has(column)) {
      skipped.push(column);
      continue;
    }

    const type = fieldTypesOverride[column] || inferFieldType(column);
    const field = await createTableField(token, baseId, tableId, column, type);
    created.push({ name: field.name, id: field.id, type: field.type });
    existingNames.add(field.name);
  }

  const fields = await getTableFields(token, baseId, tableId);

  return {
    success: true,
    created,
    skipped,
    fields,
  };
}
