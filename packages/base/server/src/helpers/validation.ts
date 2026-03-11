/**
 * Form validation helpers
 */

import * as path from "path";
import * as fs from "fs";
import { getModulePath, getModuleMainFile } from "@ha-bits/cortex/utils/moduleCloner";
import { getModuleName } from "@ha-bits/cortex/utils/moduleLoader";
import { customRequire } from "@ha-bits/cortex/utils/customRequire";
import { extractPiece } from './activepieces-loader';

// Type imports (compile-time only, not bundled)
import type { Piece } from "@activepieces/pieces-framework";

/**
 * Validate form data for a module action
 */
export async function validateFormData(
  framework: string,
  moduleDefinition: any,
  action: string,
  formData: Record<string, any>,
  auth?: any,
  fieldId?: string,
): Promise<{
  isValid: boolean;
  errors: Record<string, string>;
  validatedData?: Record<string, any>;
}> {
  const errors: Record<string, string> = {};
  let isValid = true;

  try {
    if (framework === "activepieces") {
      // Get the module schema to validate against
      const modulePathDir = getModulePath(moduleDefinition);
      const mainFile = getModuleMainFile(moduleDefinition);

      if (!mainFile) {
        throw new Error("Module main file not found");
      }

      // Import module to get piece definition
      const packageJsonPath = path.join(modulePathDir, "package.json");
      const module = customRequire(mainFile, modulePathDir);
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // JIT load activepieces and extract piece
      const piece = await extractPiece<Piece>({
        module,
        pieceName: getModuleName(moduleDefinition),
        pieceVersion: packageJson.version,
      });

      // Validate auth if required
      if (piece.auth && piece.auth.required && !auth) {
        errors.auth = "Authentication is required";
        isValid = false;
      }

      // Get action definition
      const actions = piece.actions() || {};
      const actionDefinition = actions[action];

      if (!actionDefinition) {
        errors._action = `Action '${action}' not found`;
        isValid = false;
        return { isValid, errors };
      }

      if (fieldId) {
        if (fieldId === "auth") {
          // Validate only auth field
          if (piece.auth && piece.auth.required && !auth) {
            errors.auth = "Authentication is required";
            isValid = false;
            return { isValid, errors };
          }

          // If auth has validate function, run it with await and check result
          if (piece.auth && typeof piece.auth.validate === "function") {
            try {
              const validationError = await piece.auth.validate(auth);
              if (validationError.valid === false) {
                errors.auth = validationError.error;
                isValid = false;
              }
            } catch (error) {
              errors.auth = "Failed to validate authentication";
              isValid = false;
            }
          }
        }
      }

      // Validate action properties
      const props = actionDefinition.props || {};

      for (const [propKey, prop] of Object.entries(props)) {
        const value = formData[propKey];
        const propDef = prop as any;

        // Check required fields
        if (
          propDef.required &&
          (value === undefined || value === null || value === "")
        ) {
          errors[propKey] = `${propDef.displayName || propKey} is required`;
          isValid = false;
          continue;
        }

        // Type validation
        if (value !== undefined && value !== null && value !== "") {
          const validationError = validateFieldValue(propKey, propDef, value);
          if (validationError) {
            errors[propKey] = validationError;
            isValid = false;
          }
        }
      }

      // Test auth connection if provided
      if (isValid && auth && piece.auth) {
        try {
          // Basic auth test
          if (typeof auth === "string" && auth.trim().length === 0) {
            errors.auth = "Invalid authentication credentials";
            isValid = false;
          }
        } catch (error) {
          errors.auth = "Failed to validate authentication credentials";
          isValid = false;
        }
      }
    } else if (framework === "n8n") {
      // Basic n8n validation - can be extended based on node definition
      if (!formData.operation) {
        errors.operation = "Operation is required";
        isValid = false;
      }
    }

    return {
      isValid,
      errors,
      validatedData: isValid
        ? { ...formData, auth: auth, _action: action }
        : undefined,
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: { _form: `Validation error: ${error.message}` },
    };
  }
}

/**
 * Verify authentication credentials for a module
 */
export async function verifyAuthCredentials(
  framework: string,
  moduleDefinition: any,
  auth: any,
): Promise<{ isValid: boolean; message: string }> {
  try {
    if (framework === "activepieces") {
      // Get the module schema to check auth requirements
      const modulePathDir = getModulePath(moduleDefinition);
      const mainFile = getModuleMainFile(moduleDefinition);

      if (!mainFile) {
        throw new Error("Module main file not found");
      }

      // Import module to get piece definition
      const module = customRequire(mainFile, modulePathDir);
      const packageJsonPath = path.join(modulePathDir, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // JIT load activepieces and extract piece
      const piece = await extractPiece<Piece>({
        module,
        pieceName: moduleDefinition.name || packageJson.name,
        pieceVersion: packageJson.version,
      });

      // Basic auth validation
      if (!piece.auth) {
        return {
          isValid: true,
          message: "No authentication required for this module",
        };
      }

      // Validate auth presence and format
      if (!auth || (typeof auth === "string" && auth.trim().length === 0)) {
        return {
          isValid: false,
          message: "Authentication credentials are required",
        };
      }

      // For API keys (most common case), check if it looks valid
      if (piece.auth.type === "SECRET_TEXT" && typeof auth === "string") {
        if (auth.length < 10) {
          return { isValid: false, message: "API key appears to be too short" };
        }

        return {
          isValid: true,
          message: "Authentication credentials appear valid",
        };
      }

      return { isValid: true, message: "Authentication format is valid" };
    } else if (framework === "n8n") {
      // Basic n8n auth validation
      if (!auth) {
        return {
          isValid: false,
          message: "Authentication credentials are required",
        };
      }

      return { isValid: true, message: "N8N authentication format is valid" };
    }

    return {
      isValid: false,
      message: "Unsupported framework for auth verification",
    };
  } catch (error: any) {
    return {
      isValid: false,
      message: `Auth verification error: ${error.message}`,
    };
  }
}

/**
 * Validate individual field values
 */
export function validateFieldValue(
  fieldName: string,
  fieldDef: any,
  value: any,
): string | null {
  const fieldDisplayName = fieldDef.displayName || fieldName;

  // Type-specific validation
  switch (fieldDef.type) {
    case "NUMBER":
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${fieldDisplayName} must be a valid number`;
      }
      break;

    case "SHORT_TEXT":
      if (typeof value === "string" && value.length > 255) {
        return `${fieldDisplayName} must be at most 255 characters`;
      }
      break;

    case "LONG_TEXT":
      if (typeof value === "string" && value.length > 10000) {
        return `${fieldDisplayName} must be at most 10,000 characters`;
      }
      break;

    case "JSON":
      if (typeof value === "string") {
        try {
          JSON.parse(value);
        } catch {
          return `${fieldDisplayName} must be valid JSON`;
        }
      }
      break;

    case "DROPDOWN":
    case "STATIC_DROPDOWN":
      if (fieldDef.options && fieldDef.options.options) {
        const validValues = fieldDef.options.options.map(
          (opt: any) => opt.value,
        );
        if (!validValues.includes(value)) {
          return `${fieldDisplayName} must be one of: ${validValues.join(", ")}`;
        }
      }
      break;
  }

  return null;
}
