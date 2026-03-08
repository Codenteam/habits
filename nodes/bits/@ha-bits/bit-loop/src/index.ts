/**
 * @ha-bits/bit-loop
 * 
 * Loop and split bit for iterating over arrays and objects.
 * Provides functionality for splitting data, iterating, and aggregating results.
 */

export interface LoopContext {
  propsValue: {
    items: any;
    batchSize?: number;
  };
}

export interface SplitContext {
  propsValue: {
    text: string;
    separator: string;
    limit?: number;
  };
}

export interface AggregateContext {
  propsValue: {
    items: any;
    operation: string;
    property?: string;
  };
}

const loopBit = {
  displayName: 'Loop / Split',
  description: 'Loop over arrays, split data, and aggregate results in workflows',
  logoUrl: 'lucide:Repeat',
  
  actions: {
    /**
     * Split an array into individual items (for parallel processing)
     */
    splitOut: {
      name: 'splitOut',
      displayName: 'Split Out (Loop Items)',
      description: 'Split an array into individual items for iteration. Each item becomes a separate execution.',
      props: {
        items: {
          type: 'JSON',
          displayName: 'Items',
          description: 'Array of items to split and iterate over',
          required: true,
          defaultValue: '[]',
        },
        batchSize: {
          type: 'NUMBER',
          displayName: 'Batch Size',
          description: 'Number of items per batch (0 or empty = 1 item per iteration)',
          required: false,
          defaultValue: 1,
        },
      },
      async run(context: LoopContext) {
        let { items, batchSize = 1 } = context.propsValue;
        
        // Parse items if string
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            items = [items]; // Single item
          }
        }
        
        // Ensure items is an array
        if (!Array.isArray(items)) {
          items = [items];
        }
        
        // Handle batch size
        const size = Math.max(1, Number(batchSize) || 1);
        
        // Split into batches
        const batches: any[][] = [];
        for (let i = 0; i < items.length; i += size) {
          batches.push(items.slice(i, i + size));
        }
        
        console.log(`🔄 Split Out: ${items.length} items into ${batches.length} batch(es) of size ${size}`);
        
        // Return iteration info
        return {
          totalItems: items.length,
          batchSize: size,
          totalBatches: batches.length,
          batches,
          // For workflows that need individual items
          items,
          // Current item info (for single iteration mode)
          currentBatch: batches[0] || [],
          currentIndex: 0,
        };
      },
    },
    
    /**
     * Split text by separator
     */
    splitText: {
      name: 'splitText',
      displayName: 'Split Text',
      description: 'Split a text string by a separator into an array',
      props: {
        text: {
          type: 'SHORT_TEXT',
          displayName: 'Text',
          description: 'The text to split',
          required: true,
        },
        separator: {
          type: 'SHORT_TEXT',
          displayName: 'Separator',
          description: 'The separator to split by (e.g., comma, newline, etc.)',
          required: true,
          defaultValue: ',',
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of splits (0 = no limit)',
          required: false,
          defaultValue: 0,
        },
      },
      async run(context: SplitContext) {
        const { text, separator, limit = 0 } = context.propsValue;
        
        // Handle special separators
        let sep = separator;
        if (separator === '\\n') sep = '\n';
        if (separator === '\\t') sep = '\t';
        if (separator === '\\r\\n') sep = '\r\n';
        
        const parts = limit > 0 
          ? String(text).split(sep, limit) 
          : String(text).split(sep);
        
        // Trim whitespace from parts
        const trimmedParts = parts.map(p => p.trim()).filter(p => p.length > 0);
        
        console.log(`🔄 Split Text: "${text.substring(0, 50)}..." by "${separator}" into ${trimmedParts.length} parts`);
        
        return {
          original: text,
          separator,
          parts: trimmedParts,
          count: trimmedParts.length,
        };
      },
    },
    
    /**
     * Iterate with index
     */
    enumerate: {
      name: 'enumerate',
      displayName: 'Enumerate',
      description: 'Add index numbers to items in an array',
      props: {
        items: {
          type: 'JSON',
          displayName: 'Items',
          description: 'Array of items to enumerate',
          required: true,
          defaultValue: '[]',
        },
        startIndex: {
          type: 'NUMBER',
          displayName: 'Start Index',
          description: 'Starting index number',
          required: false,
          defaultValue: 0,
        },
      },
      async run(context: { propsValue: { items: any; startIndex?: number } }) {
        let { items, startIndex = 0 } = context.propsValue;
        
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            items = [items];
          }
        }
        
        if (!Array.isArray(items)) {
          items = [items];
        }
        
        const start = Number(startIndex) || 0;
        const enumerated = items.map((item: any, idx: number) => ({
          index: start + idx,
          item,
        }));
        
        console.log(`🔄 Enumerate: ${items.length} items starting at index ${start}`);
        
        return {
          items: enumerated,
          count: enumerated.length,
        };
      },
    },
    
    /**
     * Aggregate items back together
     */
    aggregate: {
      name: 'aggregate',
      displayName: 'Aggregate',
      description: 'Combine and aggregate items from loop iterations',
      props: {
        items: {
          type: 'JSON',
          displayName: 'Items',
          description: 'Array of items to aggregate',
          required: true,
          defaultValue: '[]',
        },
        operation: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Operation',
          description: 'The aggregation operation to perform',
          required: true,
          defaultValue: 'collect',
          options: {
            options: [
              { label: 'Collect (Array)', value: 'collect' },
              { label: 'Sum', value: 'sum' },
              { label: 'Average', value: 'average' },
              { label: 'Min', value: 'min' },
              { label: 'Max', value: 'max' },
              { label: 'Count', value: 'count' },
              { label: 'Join (String)', value: 'join' },
              { label: 'First', value: 'first' },
              { label: 'Last', value: 'last' },
              { label: 'Unique', value: 'unique' },
              { label: 'Flatten', value: 'flatten' },
            ],
          },
        },
        property: {
          type: 'SHORT_TEXT',
          displayName: 'Property Path',
          description: 'Property to aggregate (for objects). E.g., "value" or "data.amount"',
          required: false,
        },
        joinSeparator: {
          type: 'SHORT_TEXT',
          displayName: 'Join Separator',
          description: 'Separator for join operation',
          required: false,
          defaultValue: ', ',
        },
      },
      async run(context: { propsValue: { items: any; operation: string; property?: string; joinSeparator?: string } }) {
        let { items, operation, property, joinSeparator = ', ' } = context.propsValue;
        
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            items = [items];
          }
        }
        
        if (!Array.isArray(items)) {
          items = [items];
        }
        
        // Extract property values if specified
        const getNestedValue = (obj: any, path: string): any => {
          return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
        };
        
        const values = property 
          ? items.map((item: any) => getNestedValue(item, property)).filter((v: any) => v !== undefined)
          : items;
        
        let result: any;
        
        switch (operation) {
          case 'collect':
            result = values;
            break;
          case 'sum':
            result = values.reduce((sum: number, v: any) => sum + Number(v), 0);
            break;
          case 'average':
            result = values.length > 0 
              ? values.reduce((sum: number, v: any) => sum + Number(v), 0) / values.length 
              : 0;
            break;
          case 'min':
            result = Math.min(...values.map(Number));
            break;
          case 'max':
            result = Math.max(...values.map(Number));
            break;
          case 'count':
            result = values.length;
            break;
          case 'join':
            result = values.map(String).join(joinSeparator);
            break;
          case 'first':
            result = values[0];
            break;
          case 'last':
            result = values[values.length - 1];
            break;
          case 'unique':
            result = [...new Set(values.map((v: any) => JSON.stringify(v)))].map(v => JSON.parse(v as string));
            break;
          case 'flatten':
            result = values.flat(Infinity);
            break;
          default:
            result = values;
        }
        
        console.log(`🔄 Aggregate: ${operation} on ${items.length} items = ${typeof result === 'object' ? JSON.stringify(result).substring(0, 100) : result}`);
        
        return {
          operation,
          inputCount: items.length,
          result,
        };
      },
    },
    
    /**
     * Filter items based on condition
     */
    filter: {
      name: 'filter',
      displayName: 'Filter Items',
      description: 'Filter array items based on a property condition',
      props: {
        items: {
          type: 'JSON',
          displayName: 'Items',
          description: 'Array of items to filter',
          required: true,
          defaultValue: '[]',
        },
        property: {
          type: 'SHORT_TEXT',
          displayName: 'Property',
          description: 'Property to filter by (leave empty for primitive values)',
          required: false,
        },
        operator: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Operator',
          description: 'Filter condition',
          required: true,
          defaultValue: 'equals',
          options: {
            options: [
              { label: 'Equals', value: 'equals' },
              { label: 'Not Equals', value: 'notEquals' },
              { label: 'Contains', value: 'contains' },
              { label: 'Greater Than', value: 'greaterThan' },
              { label: 'Less Than', value: 'lessThan' },
              { label: 'Is Truthy', value: 'truthy' },
              { label: 'Is Falsy', value: 'falsy' },
              { label: 'Exists', value: 'exists' },
            ],
          },
        },
        value: {
          type: 'SHORT_TEXT',
          displayName: 'Value',
          description: 'Value to compare against',
          required: false,
        },
      },
      async run(context: { propsValue: { items: any; property?: string; operator: string; value?: any } }) {
        let { items, property, operator, value } = context.propsValue;
        
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            items = [items];
          }
        }
        
        if (!Array.isArray(items)) {
          items = [items];
        }
        
        const getValue = (item: any): any => {
          if (!property) return item;
          return property.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, item);
        };
        
        const filtered = items.filter((item: any) => {
          const itemValue = getValue(item);
          
          switch (operator) {
            case 'equals':
              return String(itemValue) === String(value);
            case 'notEquals':
              return String(itemValue) !== String(value);
            case 'contains':
              return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
            case 'greaterThan':
              return Number(itemValue) > Number(value);
            case 'lessThan':
              return Number(itemValue) < Number(value);
            case 'truthy':
              return !!itemValue;
            case 'falsy':
              return !itemValue;
            case 'exists':
              return itemValue !== undefined && itemValue !== null;
            default:
              return true;
          }
        });
        
        console.log(`🔄 Filter: ${items.length} items -> ${filtered.length} items (${operator})`);
        
        return {
          original: items,
          filtered,
          originalCount: items.length,
          filteredCount: filtered.length,
          removedCount: items.length - filtered.length,
        };
      },
    },
    
    /**
     * Map/transform items
     */
    map: {
      name: 'map',
      displayName: 'Map / Transform',
      description: 'Transform each item in an array by extracting or modifying properties',
      props: {
        items: {
          type: 'JSON',
          displayName: 'Items',
          description: 'Array of items to transform',
          required: true,
          defaultValue: '[]',
        },
        extractProperty: {
          type: 'SHORT_TEXT',
          displayName: 'Extract Property',
          description: 'Property path to extract from each item (e.g., "data.name")',
          required: false,
        },
        template: {
          type: 'JSON',
          displayName: 'Template',
          description: 'JSON template for transformation. Use {{property}} for values.',
          required: false,
        },
      },
      async run(context: { propsValue: { items: any; extractProperty?: string; template?: any } }) {
        let { items, extractProperty, template } = context.propsValue;
        
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            items = [items];
          }
        }
        
        if (!Array.isArray(items)) {
          items = [items];
        }
        
        const getNestedValue = (obj: any, path: string): any => {
          return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
        };
        
        let mapped: any[];
        
        if (extractProperty) {
          // Simple property extraction
          mapped = items.map((item: any) => getNestedValue(item, extractProperty));
        } else if (template) {
          // Template-based transformation
          const tmpl = typeof template === 'string' ? JSON.parse(template) : template;
          mapped = items.map((item: any) => {
            const result: any = {};
            for (const [key, val] of Object.entries(tmpl)) {
              if (typeof val === 'string' && val.startsWith('{{') && val.endsWith('}}')) {
                const propPath = val.slice(2, -2).trim();
                result[key] = getNestedValue(item, propPath);
              } else {
                result[key] = val;
              }
            }
            return result;
          });
        } else {
          // No transformation
          mapped = items;
        }
        
        console.log(`🔄 Map: Transformed ${items.length} items`);
        
        return {
          original: items,
          mapped,
          count: mapped.length,
        };
      },
    },
    
    /**
     * Generate a range of numbers
     */
    range: {
      name: 'range',
      displayName: 'Generate Range',
      description: 'Generate an array of numbers in a range',
      props: {
        start: {
          type: 'NUMBER',
          displayName: 'Start',
          description: 'Starting number',
          required: true,
          defaultValue: 0,
        },
        end: {
          type: 'NUMBER',
          displayName: 'End',
          description: 'Ending number (exclusive)',
          required: true,
          defaultValue: 10,
        },
        step: {
          type: 'NUMBER',
          displayName: 'Step',
          description: 'Step increment',
          required: false,
          defaultValue: 1,
        },
      },
      async run(context: { propsValue: { start: number; end: number; step?: number } }) {
        const { start, end, step = 1 } = context.propsValue;
        
        const s = Number(start) || 0;
        const e = Number(end) || 10;
        const st = Number(step) || 1;
        
        const items: number[] = [];
        if (st > 0) {
          for (let i = s; i < e; i += st) {
            items.push(i);
          }
        } else if (st < 0) {
          for (let i = s; i > e; i += st) {
            items.push(i);
          }
        }
        
        console.log(`🔄 Range: Generated ${items.length} numbers from ${s} to ${e} step ${st}`);
        
        return {
          start: s,
          end: e,
          step: st,
          items,
          count: items.length,
        };
      },
    },
  },
  
  triggers: {},
};

export const loopUtils = loopBit;
export default loopBit;
