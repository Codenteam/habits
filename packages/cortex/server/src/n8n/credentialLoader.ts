/**
 * Credential Type Loading and Authentication
 * Handles loading credential type definitions and applying authentication
 */

import * as path from 'path';
import * as fs from 'fs';
import { customRequire } from '../utils/customRequire';
import { getModulePath, ModuleDefinition } from '../utils/moduleCloner';
import {
  IHttpRequestOptions,
  ICredentialType,
  IAuthenticateGeneric,
  ICredentialDataDecryptedObject,
} from './types';
import { LoggerFactory } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

// Cache for loaded credential types
const credentialTypeCache: Map<string, ICredentialType> = new Map();

/**
 * Load credential type definition from a module
 * This looks for .credentials.ts files and loads the credential class
 */
export function loadCredentialType(
  moduleDefinition: ModuleDefinition,
  credentialTypeName: string
): ICredentialType | null {
  // Check cache first
  if (credentialTypeCache.has(credentialTypeName)) {
    return credentialTypeCache.get(credentialTypeName)!;
  }

  if (!moduleDefinition) return null;

  try {
    const modulePath = getModulePath(moduleDefinition);
    if (!modulePath) return null;

    // Look for credentials directory
    const credentialsDir = path.join(modulePath, 'credentials');
    const distCredentialsDir = path.join(modulePath, 'dist', 'credentials');
    
    const dirsToCheck = [credentialsDir, distCredentialsDir];
    
    for (const dir of dirsToCheck) {
      if (!fs.existsSync(dir)) continue;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;
        
        const filePath = path.join(dir, file);
        try {
          const module = customRequire(filePath, dir);
          
          for (const key of Object.keys(module)) {
            const exported = module[key];
            if (exported && typeof exported === 'function') {
              try {
                const instance = new exported();
                if (instance && instance.name === credentialTypeName) {
                  credentialTypeCache.set(credentialTypeName, instance);
                  logger.log(`📋 Loaded credential type: ${credentialTypeName}`);
                  return instance;
                }
              } catch (e) {
                // Not a valid credential class, continue
              }
            }
          }
        } catch (e) {
          // Failed to load file, continue
        }
      }
    }
  } catch (error) {
    logger.warn(`Failed to load credential type ${credentialTypeName}: ${error}`);
  }
  
  return null;
}

/**
 * Resolve credential expression like ={{$credentials.xiApiKey}}
 */
export function resolveCredentialExpression(
  expression: string,
  credentials: ICredentialDataDecryptedObject
): string {
  // Match patterns like ={{$credentials.propertyName}}
  const match = expression.match(/^=\{\{\$credentials\.([^}]+)\}\}$/);
  if (match) {
    const propName = match[1];
    const value = credentials[propName];
    return value !== undefined ? String(value) : '';
  }
  return expression;
}

/**
 * Apply authentication from credential type definition to request options
 * This reads the `authenticate` property from the credential type and applies it generically
 */
export function applyCredentialAuthentication(
  requestOptions: IHttpRequestOptions,
  credentialType: ICredentialType,
  credentials: ICredentialDataDecryptedObject
): void {
  const auth = credentialType.authenticate;
  
  if (!auth) {
    logger.warn(`Credential type ${credentialType.name} has no authenticate property`);
    return;
  }

  // Handle IAuthenticateGeneric type
  if (typeof auth === 'object' && auth.type === 'generic') {
    const genericAuth = auth as IAuthenticateGeneric;
    const props = genericAuth.properties;
    
    // Apply headers
    if (props.headers) {
      const headers = requestOptions.headers as Record<string, string> || {};
      for (const [headerName, expression] of Object.entries(props.headers)) {
        const value = resolveCredentialExpression(String(expression), credentials);
        if (value) {
          headers[headerName] = value;
        }
      }
      requestOptions.headers = headers;
    }
    
    // Apply query parameters
    if (props.qs) {
      const qs = requestOptions.qs as Record<string, any> || {};
      for (const [paramName, expression] of Object.entries(props.qs)) {
        const value = resolveCredentialExpression(String(expression), credentials);
        if (value) {
          qs[paramName] = value;
        }
      }
      requestOptions.qs = qs;
    }
    
    // Apply body parameters
    if (props.body) {
      const body = requestOptions.body as Record<string, any> || {};
      for (const [bodyParam, expression] of Object.entries(props.body)) {
        const value = resolveCredentialExpression(String(expression), credentials);
        if (value) {
          body[bodyParam] = value;
        }
      }
      requestOptions.body = body;
    }
    
    // Apply basic auth
    if (props.auth) {
      const username = resolveCredentialExpression(
        String(props.auth.username || ''),
        credentials
      );
      const password = resolveCredentialExpression(
        String(props.auth.password || ''),
        credentials
      );
      requestOptions.auth = { username, password };
    }
    
    logger.log(`✅ Applied generic authentication from credential type: ${credentialType.name}`);
  } else if (typeof auth === 'function') {
    // Handle function-based authentication (advanced case)
    logger.warn(`Function-based authentication not yet supported for ${credentialType.name}`);
  }
}

/**
 * Apply credentials to request headers using credential type definitions
 * Falls back to common patterns if credential type is not found
 */
export function applyCredentialsToHeaders(
  headers: Record<string, string>,
  credentialTypeName: string,
  credentials: ICredentialDataDecryptedObject,
  moduleDefinition?: ModuleDefinition
): void {
  // Try to load credential type definition
  let credentialType: ICredentialType | null = null;
  if (moduleDefinition) {
    credentialType = loadCredentialType(moduleDefinition, credentialTypeName);
  }
  
  if (credentialType) {
    // Use the authenticate property from the credential type
    const tempOptions: IHttpRequestOptions = { url: '', headers };
    applyCredentialAuthentication(tempOptions, credentialType, credentials);
    Object.assign(headers, tempOptions.headers);
  } else {
    // Fallback: Apply common authentication patterns
    logger.warn(`Credential type ${credentialTypeName} not found, using fallback patterns`);
    applyFallbackAuthentication(headers, credentials);
  }
}

/**
 * Fallback authentication for when credential type definition is not available
 * Supports common patterns like apiKey, Authorization, etc.
 */
export function applyFallbackAuthentication(
  headers: Record<string, string>,
  credentials: ICredentialDataDecryptedObject
): void {
  // Check for common API key patterns
  if (credentials.apiKey) {
    headers['Authorization'] = `Bearer ${credentials.apiKey}`;
  }
  
  // Check for all credential properties that look like headers
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value !== 'string') continue;
    
    // Common header-like credential properties
    const headerMappings: Record<string, string> = {
      'xiApiKey': 'xi-api-key',
      'xApiKey': 'x-api-key',
      'authToken': 'Authorization',
      'bearerToken': 'Authorization',
      'accessToken': 'Authorization',
    };
    
    if (headerMappings[key]) {
      const headerName = headerMappings[key];
      if (headerName === 'Authorization' && !value.startsWith('Bearer ')) {
        headers[headerName] = `Bearer ${value}`;
      } else {
        headers[headerName] = value;
      }
    }
  }
}
