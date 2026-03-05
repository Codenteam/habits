/**
 * N8N Schema Converter
 * 
 * Converts N8N node definitions to Habits PieceSchema format for form generation.
 */

import {
  PieceSchema,
  ActionDefinition,
  FormField,
  AuthConfig,
  PlatformConverter,
  FormFieldType,
  N8NProperty,
  N8NNodeDefinition,
  N8NResponse
} from './types';

export class N8NConverter implements PlatformConverter<N8NResponse> {
  
  convertToPieceSchema(data: N8NResponse): PieceSchema {
    if (!data.success || !data.data) {
      throw new Error('Invalid N8N response data');
    }

    const { schema } = data.data;

    return {
      name: schema.name,
      displayName: schema.displayName,
      version: schema.version.toString(),
      description: schema.description,
      categories: schema.group,
      auth: this.convertCredentials(schema.credentials),
      actions: this.convertActions(schema),
      triggers: {}
    };
  }

  private convertCredentials(credentials?: Array<{ name: string; required?: boolean }>): AuthConfig | undefined {
    if (!credentials || credentials.length === 0) {
      return undefined;
    }

    const firstCred = credentials[0];
    
    return {
      displayName: `${firstCred.name} Authentication`,
      description: `Authentication credentials for ${firstCred.name}`,
      required: firstCred.required || false,
      type: 'OBJECT',
      fields: []
    };
  }

  private convertActions(schema: N8NNodeDefinition): Record<string, ActionDefinition> {
    const operationProperty = schema.properties.find(prop => prop.name === 'operation');
    
    if (!operationProperty || !operationProperty.options) {
      return {
        'default': {
          name: 'default',
          displayName: schema.displayName,
          description: schema.description,
          props: this.convertProperties(schema.properties),
          requireAuth: schema.credentials && schema.credentials.length > 0
        }
      };
    }

    const actions: Record<string, ActionDefinition> = {};
    
    for (const option of operationProperty.options) {
      const operationName = option.value;
      const operationDisplayName = option.name;
      const operationProps = this.getOperationProperties(schema.properties, operationName);
      
      actions[operationName] = {
        name: operationName,
        displayName: operationDisplayName,
        description: `${schema.displayName} - ${operationDisplayName}`,
        props: operationProps,
        requireAuth: schema.credentials && schema.credentials.length > 0
      };
    }

    return actions;
  }

  private getOperationProperties(properties: N8NProperty[], operation: string): Record<string, FormField> {
    const props: Record<string, FormField> = {};

    for (const prop of properties) {
      if (prop.name === 'operation') continue;

      if (prop.displayOptions?.show?.operation && !prop.displayOptions.show.operation.includes(operation)) {
        continue;
      }

      if (prop.displayOptions?.hide?.operation && prop.displayOptions.hide.operation.includes(operation)) {
        continue;
      }

      props[prop.name] = this.convertProperty(prop);
    }

    return props;
  }

  private convertProperties(properties: N8NProperty[]): Record<string, FormField> {
    const props: Record<string, FormField> = {};

    for (const prop of properties) {
      props[prop.name] = this.convertProperty(prop);
    }

    return props;
  }

  private convertProperty(prop: N8NProperty): FormField {
    const field: FormField = {
      id: prop.name,
      displayName: prop.displayName,
      type: this.mapFieldType(prop.type, prop.typeOptions),
      required: prop.required,
      description: prop.description,
      defaultValue: prop.default
    };

    if (prop.options) {
      field.options = {
        disabled: false,
        options: prop.options.map(opt => ({
          label: opt.name,
          value: opt.value
        }))
      };
    }

    this.addValidationRules(field, prop);

    return field;
  }

  private mapFieldType(n8nType: string, typeOptions?: N8NProperty['typeOptions']): FormFieldType {
    const typeMap: Record<string, FormFieldType> = {
      'string': 'SHORT_TEXT',
      'number': 'NUMBER',
      'boolean': 'CHECKBOX',
      'options': 'STATIC_DROPDOWN',
      'collection': 'OBJECT',
      'multiOptions': 'ARRAY',
      'json': 'JSON',
      'dateTime': 'DATE_TIME',
      'color': 'SHORT_TEXT',
      'resourceLocator': 'DYNAMIC',
      'fixedCollection': 'OBJECT'
    };

    if (n8nType === 'string') {
      if (typeOptions?.password) {
        return 'SECRET_TEXT';
      }
      if (typeOptions?.rows && typeOptions.rows > 1) {
        return 'LONG_TEXT';
      }
    }

    return typeMap[n8nType] || 'SHORT_TEXT';
  }

  private addValidationRules(field: FormField, _prop: N8NProperty): void {
    field.validation = {};

    switch (field.type) {
      case 'NUMBER':
        break;
      case 'SHORT_TEXT':
        field.validation.maxLength = 255;
        break;
      case 'LONG_TEXT':
        field.validation.maxLength = 10000;
        break;
    }

    if (Object.keys(field.validation).length === 0) {
      delete field.validation;
    }
  }

  validateSchema(schema: PieceSchema): boolean {
    if (!schema.name || !schema.displayName) {
      console.warn('N8N Schema missing required name or displayName');
      return false;
    }

    if (!schema.actions || Object.keys(schema.actions).length === 0) {
      console.warn('N8N Schema has no actions defined');
      return false;
    }

    return true;
  }

  getOperationOptions(schema: PieceSchema): Array<{label: string, value: string}> {
    return Object.entries(schema.actions).map(([key, action]) => ({
      label: action.displayName,
      value: key
    }));
  }

  operationRequiresAuth(schema: PieceSchema, operationKey: string): boolean {
    const action = schema.actions[operationKey];
    return action?.requireAuth || false;
  }
}

export function createN8NConverter(): N8NConverter {
  return new N8NConverter();
}

export function convertN8NResponse(jsonResponse: string | N8NResponse): PieceSchema {
  const converter = createN8NConverter();
  
  let data: N8NResponse;
  if (typeof jsonResponse === 'string') {
    try {
      data = JSON.parse(jsonResponse);
    } catch (error) {
      throw new Error('Invalid JSON response');
    }
  } else {
    data = jsonResponse;
  }

  const schema = converter.convertToPieceSchema(data);
  
  if (!converter.validateSchema(schema)) {
    throw new Error('Generated N8N schema failed validation');
  }

  return schema;
}

export type { N8NResponse, N8NNodeDefinition, N8NProperty };
