import { api } from './api';
import { FormValue, FormValidationResult } from './formBuilder/types';

export interface ValidationRequest {
  framework: string;
  moduleName: string;
  action: string;
  formData: FormValue;
  auth?: any;
}

export class FormBuilderAPI {
  
  /**
   * Verify authentication credentials
   */
  static async verifyAuth(framework: string, moduleName: string, authValue: any): Promise<{ isValid: boolean; message: string }> {
    try {
      const result = await api.verifyAuth(framework, moduleName, authValue);
      
      if (!result.success) {
        return {
          isValid: false,
          message: result.error || 'Authentication verification failed'
        };
      }

      return {
        isValid: result.data.isValid,
        message: result.data.message || (result.data.isValid ? 'Authentication verified successfully' : 'Authentication failed')
      };

    } catch (error) {
      console.error('Auth verification error:', error);
      return {
        isValid: false,
        message: 'Failed to connect to verification service'
      };
    }
  }

  /**
   * Validate form data against the server
   */
  static async validateForm(request: ValidationRequest): Promise<FormValidationResult> {
    try {
      const result = await api.validateForm(request);
      
      if (!result.success) {
        return {
          isValid: false,
          errors: { _form: result.error || 'Validation failed' }
        };
      }

      return {
        isValid: result.data.isValid,
        errors: result.data.errors || {},
        data: result.data.validatedData
      };

    } catch (error) {
      console.error('Form validation error:', error);
      return {
        isValid: false,
        errors: { _form: 'Failed to connect to validation service' }
      };
    }
  }



  /**
   * Check if module is available/installed
   */
  static async checkModule(framework: string, moduleName: string): Promise<boolean> {
    try {
      const result = await api.checkModuleAvailability(framework, moduleName);
      return result.available;

    } catch (error) {
      console.error('Error checking module availability:', error);
      return false;
    }
  }

  /**
   * Install a module
   */
  static async installModule(modulePath: string): Promise<boolean> {
    try {
      const [framework, moduleName] = modulePath.split('/', 2);
      await api.installModule(moduleName, framework);
      return true;

    } catch (error) {
      console.error('Error installing module:', error);
      return false;
    }
  }

  /**
   * Execute form data
   */
  static async executeForm(request: ValidationRequest & { async?: boolean }): Promise<any> {
    try {
      // First validate
      const validation = await this.validateForm(request);
      
      if (!validation.isValid) {
        throw new Error('Form validation failed: ' + Object.values(validation.errors).join(', '));
      }

      // Then execute
      const result = await api.executeModule({
        framework: request.framework,
        module: request.moduleName,
        params: {
          ...validation.data,
          action: request.action
        },
        // async_exec: request.async || false
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Execution failed');
      }

      return result.data;

    } catch (error) {
      console.error('Form execution error:', error);
      throw error;
    }
  }

  /**
   * Get execution status (for async executions)
   */
  static async getExecutionStatus(executionId: string): Promise<any> {
    try {
      const result = await api.getExecutionStatus(executionId);
      return result;

    } catch (error) {
      console.error('Error getting execution status:', error);
      throw error;
    }
  }

  /**
   * Populate options for a dynamic field
   */
  static async populateOptions(
    framework: string,
    moduleId: string,
    actionName: string,
    fieldName: string,
    currentValues: FormValue
  ): Promise<Array<{ label: string; value: any }>> {
    try {
      const result = await api.populateOptions(framework, moduleId, actionName, fieldName, currentValues);
      
      if (!result.success) {
        console.error('Options population failed:', result.error);
        return [];
      }

      return result.data?.options || [];

    } catch (error) {
      console.error('Error populating options:', error);
      return [];
    }
  }
}

// Convenience functions
export const verifyAuth = FormBuilderAPI.verifyAuth;
export const validateForm = FormBuilderAPI.validateForm;
export const checkModule = FormBuilderAPI.checkModule;
export const installModule = FormBuilderAPI.installModule;
export const executeForm = FormBuilderAPI.executeForm;
export const populateOptions = FormBuilderAPI.populateOptions;