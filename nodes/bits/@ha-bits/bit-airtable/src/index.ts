/**
 * @ha-bits/bit-airtable
 *
 * Airtable integration for creating and reading records.
 * Uses Personal Access Tokens (PAT) with the Airtable REST API.
 *
 * @see https://airtable.com/developers/web/api/introduction
 */

import {
  AIRTABLE_API,
  airtableRequest,
  asString,
  optionalString,
  parseJsonValue,
  resolveToken,
  type AirtableContext,
} from './driver';
import {
  AIRTABLE_FIELD_TYPE_OPTIONS,
  createTableField,
  ensureTableFields,
  inferFieldType,
  parseColumnsInput,
  parseFieldTypesOverride,
  type AirtableFieldType,
  type AirtableTablesResponse,
} from './fields';
import { fetchListRecords, type AirtableRecord, type AirtableRecordsResponse } from './records';

type AirtablePollingContext = AirtableContext & {
  pollingStore?: {
    hasSeenItem: (itemId: string, itemDate?: string) => Promise<boolean>;
    markItemSeen: (itemId: string, itemDate: string, data?: unknown) => Promise<void>;
    getLastPolledDate: () => Promise<string | null>;
    setLastPolledDate: (date: string) => Promise<void>;
  };
  setSchedule?: (options: { cronExpression: string; timezone?: string }) => void;
};

const airtableBit = {
  id: 'airtable',
  displayName: 'Airtable',
  description: 'Create, read, update, and delete Airtable records',
  logoUrl: 'lucide:Table',
  runtime: 'all',

  auth: {
    type: 'SECRET_TEXT',
    displayName: 'Personal Access Token',
    description:
      'Airtable personal access token with data.records:read, data.records:write, schema.bases:read, and schema.bases:write scopes',
    required: true,
  },

  actions: {
    createRecord: {
      name: 'createRecord',
      displayName: 'Create Record',
      description: 'Create one or more records in an Airtable table',
      props: {
        personalAccessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Personal Access Token',
          description: 'Overrides bit-level PAT when provided',
          required: false,
        },
        baseId: {
          type: 'SHORT_TEXT',
          displayName: 'Base ID',
          description: 'Airtable base ID (app...)',
          required: true,
        },
        tableId: {
          type: 'SHORT_TEXT',
          displayName: 'Table ID',
          description: 'Airtable table ID (tbl...)',
          required: true,
        },
        fields: {
          type: 'JSON',
          displayName: 'Fields',
          description: 'Record fields keyed by field name, e.g. {"Name":"Alice","Email":"a@b.com"}',
          required: true,
        },
        typecast: {
          type: 'CHECKBOX',
          displayName: 'Typecast',
          description: 'Automatically convert string values to cell types when possible',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: AirtableContext) {
        const token = resolveToken(context);
        const baseId = asString(context.propsValue.baseId, 'baseId');
        const tableId = asString(context.propsValue.tableId, 'tableId');
        const fields = parseJsonValue<Record<string, unknown>>(context.propsValue.fields, 'fields');
        const typecast = context.propsValue.typecast !== false;

        const result = await airtableRequest<AirtableRecordsResponse>(
          `/${baseId}/${tableId}`,
          token,
          {
            method: 'POST',
            body: JSON.stringify({
              records: [{ fields }],
              typecast,
            }),
          },
        );

        const record = result.records?.[0];
        if (!record) {
          throw new Error('Airtable did not return a created record');
        }

        return {
          success: true,
          recordId: record.id,
          createdTime: record.createdTime,
          fields: record.fields,
        };
      },
    },

    listRecords: {
      name: 'listRecords',
      displayName: 'List Records',
      description: 'List records from an Airtable table',
      props: {
        personalAccessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Personal Access Token',
          required: false,
        },
        baseId: {
          type: 'SHORT_TEXT',
          displayName: 'Base ID',
          required: true,
        },
        tableId: {
          type: 'SHORT_TEXT',
          displayName: 'Table ID',
          required: true,
        },
        maxRecords: {
          type: 'NUMBER',
          displayName: 'Max Records',
          required: false,
          defaultValue: 10,
        },
        filterByFormula: {
          type: 'SHORT_TEXT',
          displayName: 'Filter By Formula',
          required: false,
        },
      },
      async run(context: AirtableContext) {
        const token = resolveToken(context);
        const baseId = asString(context.propsValue.baseId, 'baseId');
        const tableId = asString(context.propsValue.tableId, 'tableId');
        const maxRecords = Number(context.propsValue.maxRecords || 10);
        const filterByFormula = optionalString(context.propsValue.filterByFormula);

        const records = await fetchListRecords(token, baseId, tableId, {
          maxRecords,
          filterByFormula,
        });

        return {
          records,
          count: records.length,
        };
      },
    },

    getRecord: {
      name: 'getRecord',
      displayName: 'Get Record',
      description: 'Fetch a single Airtable record by ID',
      props: {
        personalAccessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Personal Access Token',
          required: false,
        },
        baseId: {
          type: 'SHORT_TEXT',
          displayName: 'Base ID',
          required: true,
        },
        tableId: {
          type: 'SHORT_TEXT',
          displayName: 'Table ID',
          required: true,
        },
        recordId: {
          type: 'SHORT_TEXT',
          displayName: 'Record ID',
          required: true,
        },
      },
      async run(context: AirtableContext) {
        const token = resolveToken(context);
        const baseId = asString(context.propsValue.baseId, 'baseId');
        const tableId = asString(context.propsValue.tableId, 'tableId');
        const recordId = asString(context.propsValue.recordId, 'recordId');

        const result = await airtableRequest<AirtableRecord>(
          `/${baseId}/${tableId}/${recordId}`,
          token,
        );

        return {
          recordId: result.id,
          createdTime: result.createdTime,
          fields: result.fields,
        };
      },
    },

    updateRecord: {
      name: 'updateRecord',
      displayName: 'Update Record',
      description: 'Update field values on an existing Airtable record',
      props: {
        personalAccessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Personal Access Token',
          required: false,
        },
        baseId: {
          type: 'SHORT_TEXT',
          displayName: 'Base ID',
          required: true,
        },
        tableId: {
          type: 'SHORT_TEXT',
          displayName: 'Table ID',
          required: true,
        },
        recordId: {
          type: 'SHORT_TEXT',
          displayName: 'Record ID',
          required: true,
        },
        fields: {
          type: 'JSON',
          displayName: 'Fields',
          description: 'Record fields keyed by field name',
          required: true,
        },
        typecast: {
          type: 'CHECKBOX',
          displayName: 'Typecast',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: AirtableContext) {
        const token = resolveToken(context);
        const baseId = asString(context.propsValue.baseId, 'baseId');
        const tableId = asString(context.propsValue.tableId, 'tableId');
        const recordId = asString(context.propsValue.recordId, 'recordId');
        const fields = parseJsonValue<Record<string, unknown>>(context.propsValue.fields, 'fields');
        const typecast = context.propsValue.typecast !== false;

        const result = await airtableRequest<AirtableRecord>(
          `/${baseId}/${tableId}/${recordId}`,
          token,
          {
            method: 'PATCH',
            body: JSON.stringify({ fields, typecast }),
          },
        );

        return {
          success: true,
          recordId: result.id,
          createdTime: result.createdTime,
          fields: result.fields,
        };
      },
    },

    deleteRecord: {
      name: 'deleteRecord',
      displayName: 'Delete Record',
      description: 'Delete a single record from an Airtable table by record ID',
      props: {
        personalAccessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Personal Access Token',
          required: false,
        },
        baseId: {
          type: 'SHORT_TEXT',
          displayName: 'Base ID',
          required: true,
        },
        tableId: {
          type: 'SHORT_TEXT',
          displayName: 'Table ID',
          required: true,
        },
        recordId: {
          type: 'SHORT_TEXT',
          displayName: 'Record ID',
          required: true,
        },
      },
      async run(context: AirtableContext) {
        const token = resolveToken(context);
        const baseId = asString(context.propsValue.baseId, 'baseId');
        const tableId = asString(context.propsValue.tableId, 'tableId');
        const recordId = asString(context.propsValue.recordId, 'recordId');

        const url = `${AIRTABLE_API}/${baseId}/${tableId}/${recordId}`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 404) {
          return {
            success: true,
            recordId,
            deleted: false,
            notFound: true,
          };
        }

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Airtable API error (${response.status}): ${error}`);
        }

        const text = await response.text();
        let parsed: { deleted?: boolean; id?: string } = {};
        if (text) {
          try {
            parsed = JSON.parse(text) as { deleted?: boolean; id?: string };
          } catch {
            parsed = {};
          }
        }

        return {
          success: true,
          recordId: parsed.id || recordId,
          deleted: parsed.deleted !== false,
          notFound: false,
        };
      },
    },

    createField: {
      name: 'createField',
      displayName: 'Create Field',
      description: 'Create a new column in an Airtable table',
      props: {
        personalAccessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Personal Access Token',
          required: false,
        },
        baseId: {
          type: 'SHORT_TEXT',
          displayName: 'Base ID',
          required: true,
        },
        tableId: {
          type: 'SHORT_TEXT',
          displayName: 'Table ID',
          required: true,
        },
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Field Name',
          description: 'Display name for the new Airtable column',
          required: true,
        },
        type: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Field Type',
          required: false,
          defaultValue: 'singleLineText',
          options: {
            options: AIRTABLE_FIELD_TYPE_OPTIONS,
          },
        },
        description: {
          type: 'SHORT_TEXT',
          displayName: 'Description',
          required: false,
        },
      },
      async run(context: AirtableContext) {
        const token = resolveToken(context);
        const baseId = asString(context.propsValue.baseId, 'baseId');
        const tableId = asString(context.propsValue.tableId, 'tableId');
        const name = asString(context.propsValue.name, 'name');
        const type = (optionalString(context.propsValue.type) || inferFieldType(name)) as AirtableFieldType;
        const description = optionalString(context.propsValue.description);

        const field = await createTableField(token, baseId, tableId, name, type, description);

        return {
          success: true,
          fieldId: field.id,
          name: field.name,
          type: field.type,
        };
      },
    },

    ensureFields: {
      name: 'ensureFields',
      displayName: 'Ensure Fields',
      description:
        'Create any missing Airtable columns for the given field names. Existing columns are skipped.',
      props: {
        personalAccessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Personal Access Token',
          required: false,
        },
        baseId: {
          type: 'SHORT_TEXT',
          displayName: 'Base ID',
          required: true,
        },
        tableId: {
          type: 'SHORT_TEXT',
          displayName: 'Table ID',
          required: true,
        },
        columns: {
          type: 'JSON',
          displayName: 'Columns',
          description: 'Array of field names, e.g. ["Name","Email","Phone"]',
          required: true,
        },
        fieldTypes: {
          type: 'JSON',
          displayName: 'Field Types',
          description: 'Optional map of field name to Airtable type, e.g. {"Email":"email"}',
          required: false,
        },
      },
      async run(context: AirtableContext) {
        const token = resolveToken(context);
        const baseId = asString(context.propsValue.baseId, 'baseId');
        const tableId = asString(context.propsValue.tableId, 'tableId');
        const columns = parseColumnsInput(context.propsValue.columns);
        const fieldTypes = parseFieldTypesOverride(context.propsValue.fieldTypes);

        return ensureTableFields(token, baseId, tableId, columns, fieldTypes);
      },
    },

    listTables: {
      name: 'listTables',
      displayName: 'List Tables',
      description: 'List tables and field metadata for an Airtable base',
      props: {
        personalAccessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Personal Access Token',
          required: false,
        },
        baseId: {
          type: 'SHORT_TEXT',
          displayName: 'Base ID',
          required: true,
        },
      },
      async run(context: AirtableContext) {
        const token = resolveToken(context);
        const baseId = asString(context.propsValue.baseId, 'baseId');

        const result = await airtableRequest<AirtableTablesResponse>(
          `/meta/bases/${baseId}/tables`,
          token,
        );

        return {
          tables: (result.tables || []).map((table) => ({
            id: table.id,
            name: table.name,
            description: table.description || null,
            fields: (table.fields || []).map((field) => ({
              id: field.id,
              name: field.name,
              type: field.type,
            })),
          })),
          count: result.tables?.length || 0,
        };
      },
    },
  },

  triggers: {
    newRecords: {
      name: 'newRecords',
      displayName: 'New Records (polling)',
      description:
        'Polls an Airtable table on a schedule and returns records not seen before (deduplicated by record ID).',
      type: 'POLLING',
      props: {
        personalAccessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Personal Access Token',
          required: false,
        },
        baseId: {
          type: 'SHORT_TEXT',
          displayName: 'Base ID',
          required: true,
        },
        tableId: {
          type: 'SHORT_TEXT',
          displayName: 'Table ID',
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
        maxRecords: {
          type: 'NUMBER',
          displayName: 'Max Records',
          description: 'Maximum records to check per poll (default: 100)',
          required: false,
          defaultValue: 100,
        },
      },
      async onEnable(context: AirtablePollingContext): Promise<void> {
        const cronExpression = optionalString(context.propsValue.cronExpression) || '*/1 * * * *';
        const timezone = optionalString(context.propsValue.timezone) || 'UTC';
        context.setSchedule?.({ cronExpression, timezone });
      },
      async onDisable(_context: AirtablePollingContext): Promise<void> {
        // Server stops cron jobs on shutdown.
      },
      async run(context: AirtablePollingContext) {
        const token = resolveToken(context);
        const baseId = asString(context.propsValue.baseId, 'baseId');
        const tableId = asString(context.propsValue.tableId, 'tableId');
        const maxRecords = Number(context.propsValue.maxRecords || 100);
        const pollingStore = context.pollingStore;

        const records = await fetchListRecords(token, baseId, tableId, { maxRecords });
        const pollTimestamp = new Date().toISOString();
        const newRecords = [];

        for (const record of records) {
          const { recordId, createdTime } = record;

          if (pollingStore) {
            const seen = await pollingStore.hasSeenItem(recordId, createdTime);
            if (seen) {
              continue;
            }
            await pollingStore.markItemSeen(recordId, createdTime, {
              recordId,
              fields: record.fields,
            });
          }

          newRecords.push(record);
        }

        if (pollingStore) {
          await pollingStore.setLastPolledDate(pollTimestamp);
        }

        console.log(
          `[bit-airtable] newRecords poll: ${newRecords.length} new record(s) from ${baseId}/${tableId}`,
        );

        return newRecords;
      },
      async test(_context: AirtablePollingContext) {
        return [
          {
            recordId: 'rec00000000000000',
            createdTime: new Date().toISOString(),
            fields: { Name: 'Sample Record', Email: 'sample@example.com' },
          },
        ];
      },
      sampleData: {
        recordId: 'rec00000000000000',
        createdTime: new Date().toISOString(),
        fields: { Name: 'Sample Record', Email: 'sample@example.com' },
      },
    },
  },
};

export const airtable = airtableBit;
export default airtableBit;
