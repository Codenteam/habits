/**
 * ActivePieces Schema Converter
 * 
 * Converts ActivePieces node definitions to Habits PieceSchema format for form generation.
 */

import {
  PieceSchema,
  ActionDefinition,
  FormField,
  AuthConfig,
  PlatformConverter,
  FormFieldType,
  ActivePiecesResponse,
  ActivePiecesActionConfig,
  ActivePiecesPropertyConfig,
  ActivePiecesAuthConfig
} from './types';

export class ActivePiecesConverter implements PlatformConverter<ActivePiecesResponse> {
  
  convertToPieceSchema(data: ActivePiecesResponse): PieceSchema {
    if (!data.success || !data.data) {
      throw new Error('Invalid ActivePieces response data');
    }

    const { schema } = data.data;
    const { pieces } = schema;

    return {
      name: schema.name,
      displayName: pieces.displayName || schema.displayName,
      version: schema.version,
      description: pieces.description,
      logoUrl: pieces.logoUrl,
      authors: pieces.authors,
      categories: pieces.categories,
      auth: this.convertAuth(pieces.auth || schema.auth),
      actions: this.convertActions(pieces._actions || {}),
      triggers: this.convertActions(pieces._triggers || {})
    };
  }

  private convertAuth(auth?: ActivePiecesAuthConfig): AuthConfig | undefined {
    if (!auth) return undefined;

    return {
      displayName: auth.displayName,
      description: auth.description,
      required: auth.required,
      type: this.mapFieldType(auth.type),
      fields: auth.type === 'OBJECT' ? [] : undefined
    };
  }

  private convertActions(actions: Record<string, ActivePiecesActionConfig>): Record<string, ActionDefinition> {
    const convertedActions: Record<string, ActionDefinition> = {};

    for (const [key, action] of Object.entries(actions)) {
      convertedActions[key] = {
        name: action.name,
        displayName: action.displayName,
        description: action.description,
        props: this.convertProperties(action.props || {}),
        requireAuth: action.requireAuth,
        errorHandlingOptions: action.errorHandlingOptions
      };
    }

    return convertedActions;
  }

  private convertProperties(props: Record<string, ActivePiecesPropertyConfig>): Record<string, FormField> {
    const convertedProps: Record<string, FormField> = {};

    for (const [key, prop] of Object.entries(props)) {
      convertedProps[key] = this.convertProperty(key, prop);
    }

    return convertedProps;
  }

  private convertProperty(name: string, prop: ActivePiecesPropertyConfig): FormField {
    const baseField: FormField = {
      id: name,
      displayName: prop.displayName,
      type: this.mapFieldType(prop.type),
      required: prop.required,
      description: prop.description,
      defaultValue: prop.defaultValue,
      refreshers: prop.refreshers
    };

    if (prop.options) {
      baseField.options = {
        disabled: prop.options.disabled || false,
        options: prop.options.options.map(opt => ({
          label: opt.label,
          value: opt.value
        }))
      };
    }

    if (prop.properties) {
      baseField.properties = {};
      for (const [nestedKey, nestedProp] of Object.entries(prop.properties)) {
        baseField.properties[nestedKey] = this.convertProperty(nestedKey, nestedProp);
      }
    }

    this.addValidationRules(baseField, prop);

    return baseField;
  }

  private mapFieldType(activePiecesType: string): FormFieldType {
    const typeMap: Record<string, FormFieldType> = {
      'SHORT_TEXT': 'SHORT_TEXT',
      'LONG_TEXT': 'LONG_TEXT',
      'NUMBER': 'NUMBER',
      'CHECKBOX': 'CHECKBOX',
      'DROPDOWN': 'DROPDOWN',
      'STATIC_DROPDOWN': 'STATIC_DROPDOWN',
      'DYNAMIC': 'DYNAMIC',
      'FILE': 'FILE',
      'JSON': 'JSON',
      'OBJECT': 'OBJECT',
      'ARRAY': 'ARRAY',
      'SECRET_TEXT': 'SECRET_TEXT',
      'DATE': 'DATE',
      'TIME': 'TIME',
      'DATE_TIME': 'DATE_TIME'
    };

    return typeMap[activePiecesType] || 'SHORT_TEXT';
  }

  private addValidationRules(field: FormField, prop: ActivePiecesPropertyConfig): void {
    field.validation = {};

    switch (field.type) {
      case 'NUMBER':
        if (prop.defaultValue !== undefined) {
          field.validation.min = typeof prop.defaultValue === 'number' ? 0 : undefined;
        }
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
      console.warn('Schema missing required name or displayName');
      return false;
    }

    if (!schema.actions || Object.keys(schema.actions).length === 0) {
      console.warn('Schema has no actions defined');
      return false;
    }

    for (const [actionKey, action] of Object.entries(schema.actions)) {
      if (!action.name || !action.displayName) {
        console.warn(`Action ${actionKey} missing required name or displayName`);
        return false;
      }

      for (const [propKey, prop] of Object.entries(action.props)) {
        if (prop.required && !prop.type) {
          console.warn(`Required prop ${propKey} in action ${actionKey} missing type`);
          return false;
        }
      }
    }

    return true;
  }

  getActionOptions(schema: PieceSchema): Array<{label: string, value: string}> {
    return Object.entries(schema.actions).map(([key, action]) => ({
      label: action.displayName,
      value: key
    }));
  }

  getActionProperties(schema: PieceSchema, actionKey: string): Record<string, FormField> {
    const action = schema.actions[actionKey];
    return action ? action.props : {};
  }

  actionRequiresAuth(schema: PieceSchema, actionKey: string): boolean {
    const action = schema.actions[actionKey];
    return action?.requireAuth || false;
  }
}

export function createActivePiecesConverter(): ActivePiecesConverter {
  return new ActivePiecesConverter();
}

export function convertActivePiecesResponse(jsonResponse: string | ActivePiecesResponse): PieceSchema {
  const converter = createActivePiecesConverter();
  
  let data: ActivePiecesResponse;
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
    throw new Error('Generated schema failed validation');
  }

  return schema;
}

export type { ActivePiecesResponse };
