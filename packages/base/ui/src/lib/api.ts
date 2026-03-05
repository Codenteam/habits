import axios from 'axios';
import type { AvailableModuleDefinition, ExecutionRequest, Workflow } from '../types/workflow';
import { ExportBundle } from '@ha-bits/core';

// API-specific execution result (different from shared workflow ExecutionResult)
interface APIExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  execution_id?: string;
}

const API_BASE_URL = '/habits/base/api';

export const api = {
  // Module management
  async getModules(): Promise<AvailableModuleDefinition[]> {
    const response = await axios.get(`${API_BASE_URL}/modules`);
    // API returns { success: true, data: [...] }
    return response.data.data || [];
  },

  async installModule(framework: string,moduleName:string ): Promise<void> {
    await axios.post(`${API_BASE_URL}/modules/install`, { framework, module: moduleName });
  },

  async addModule(moduleData: { 
    framework: string; 
    source: 'github' | 'npm' | 'script'; 
    repository: string;
    scriptContent?: string;
    scriptLanguage?: string;
  }): Promise<void> {
    const response = await axios.post(`${API_BASE_URL}/modules/add`, moduleData);
    // API returns { success: boolean, data?: ..., error?: string }
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add module');
    }
  },

  async checkModuleAvailability(framework: string, moduleName: string): Promise<{ available: boolean; module?: any }> {
    const path = `${API_BASE_URL}/modules/check/${framework}/${encodeURIComponent(moduleName)}`;
    const response = await axios.get(path);
    return response.data.data;
  },



  async getModuleSchema(framework: string, moduleName: string): Promise<{ schema?: any; error?: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/modules/schema/${framework}/${encodeURIComponent(moduleName)}`);
      return response.data.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to get module schema' };
    }
  },

  // Execution
  async executeModule(request: ExecutionRequest): Promise<APIExecutionResult> {
    const response = await axios.post(`${API_BASE_URL}/execute`, request);
    // API returns { success: true, data: {...}, execution_id?: string }
    return {
      success: response.data.success,
      data: response.data.data,
      error: response.data.error,
      execution_id: response.data.execution_id,
    };
  },

  async getExecutionStatus(executionId: string): Promise<APIExecutionResult> {
    const response = await axios.get(`${API_BASE_URL}/status/${executionId}`);
    return {
      success: response.data.success,
      data: response.data.data,
      error: response.data.error,
      execution_id: executionId,
    };
  },

  // Form validation and management
  async validateForm(request: { framework: string; moduleName: string; action: string; formData: any; auth?: any }): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/forms/validate`, request);
    return response.data;
  },

  async verifyAuth(framework: string, moduleName: string, auth: any): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/forms/verify-auth`, {
      framework,
      moduleName,
      auth
    });
    return response.data;
  },

  async populateOptions(framework: string, moduleId: string, actionName: string, fieldName: string, currentValues: any): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/forms/populate-options`, {
      framework,
      moduleId,
      actionName,
      fieldName,
      currentValues
    });
    return response.data;
  },

  // Server management
  async startServer(data: ExportBundle): Promise<APIExecutionResult> {
    const response = await axios.post(`${API_BASE_URL}/serve/start`, data);
    return {
      success: response.data.success,
      data: response.data.data,
      error: response.data.error,
    };
  },

  async stopServer(): Promise<APIExecutionResult> {
    const response = await axios.post(`${API_BASE_URL}/serve/stop`);
    return {
      success: response.data.success,
      data: response.data.data,
      error: response.data.error,
    };
  },

  async getServerStatus(): Promise<{ running: boolean; port?: number }> {
    const response = await axios.get(`${API_BASE_URL}/serve/status`);
    return response.data.data;
  },

  async checkServeStatus(port?: number): Promise<{
    processRunning: boolean;
    portInUse: boolean;
    portPid: number | null;
    port: number;
    trackedProcessRunning: boolean;
  }> {
    const url = port ? `${API_BASE_URL}/serve/check?port=${port}` : `${API_BASE_URL}/serve/check`;
    const response = await axios.get(url);
    return response.data.data;
  },

  async killServeProcess(): Promise<APIExecutionResult> {
    const response = await axios.post(`${API_BASE_URL}/serve/kill-process`);
    return {
      success: response.data.success,
      data: response.data.data,
      error: response.data.error,
    };
  },

  async killPort(port: number): Promise<APIExecutionResult> {
    const response = await axios.post(`${API_BASE_URL}/serve/kill-port`, { port });
    return {
      success: response.data.success,
      data: response.data.data,
      error: response.data.error,
    };
  },

  async generateOpenAPISpec(habit: any, serverUrl?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/serve/openapi`, {
        habit,
        serverUrl,
      });
      return {
        success: response.data.success,
        data: response.data.data,
        error: response.data.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to generate OpenAPI spec',
      };
    }
  },

  // Workflow management (for future backend storage)
  async saveWorkflow(workflow: Workflow): Promise<void> {
    // TODO: Implement backend workflow storage
    console.log('Saving workflow:', workflow);
  },

  async loadWorkflow(_workflowId: string): Promise<Workflow> {
    // TODO: Implement backend workflow storage
    throw new Error('Not implemented');
  },

  // Binary export (SEA)
  async checkBinarySupport(): Promise<{
    supported: boolean;
    version: string;
    message?: string;
    currentPlatform: string;
    supportedPlatforms: string[];
    mobile?: {
      gradleVersion?: string | null;
      javaVersion?: string | null;
      cordovaVersion?: string | null;
      androidSdkVersion?: string | null;
      xcodeVersion?: string | null;
      xcodebuildVersion?: string | null;
      androidHome?: string;
      androidSdkRoot?: string;
      compatibility?: {
        compatible: boolean;
        javaVersion: number;
        gradleVersion: string;
        minJava?: number;
        maxJava?: number;
        recommended?: number;
        message: string;
      };
    };
    desktop?: {
      electronVersion?: string | null;
      electronBuilderVersion?: string | null;
      tauriVersion?: string | null;
      cargoVersion?: string | null;
      rustcVersion?: string | null;
    };
  }> {
    const response = await axios.get(`${API_BASE_URL}/export/binary/support`);
    return response.data.data;
  },

  async exportBinary(data: {
    habits: any[];
    serverConfig: { port: number; openapi?: boolean; webhookTimeout?: number };
    envContent?: string;
    frontendHtml?: string;
    platform?: string;
  }): Promise<Blob> {
    const response = await axios.post(`${API_BASE_URL}/export/binary`, data, {
      responseType: 'blob',
      timeout: 300000, // 5 minute timeout for binary generation
    });
    return response.data;
  },

  async exportDocker(data: {
    habits: any[];
    serverConfig: { port: number; openapi?: boolean; webhookTimeout?: number };
    envContent: string;
    frontendHtml?: string;
    stackYaml: string;
    habitFiles: Array<{ filename: string; content: string }>;
    stackName?: string;
  }): Promise<Blob> {
    const response = await axios.post(`${API_BASE_URL}/export/pack/docker`, data, {
      responseType: 'blob',
      timeout: 60000, // 1 minute timeout for Docker package generation
    });
    return response.data;
  },

  // AI Generation
  async generateFromPrompt(prompt: string): Promise<Blob> {
    const response = await axios.post(`/habits/bits-creator/create-habit`, { prompt }, {
      responseType: 'blob',
      timeout: 300000, // 5 minute timeout for AI generation
    });
    return response.data;
  },
};
