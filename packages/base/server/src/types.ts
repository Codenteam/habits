/**
 * Shared types for the Base server
 */

export interface ExecuteRequest {
  framework: string;
  module: string;
  params: Record<string, any>;
  async_exec?: boolean;
}

export interface StandardResponse {
  success: boolean;
  data?: any;
  error?: string;
  execution_id?: string;
  timestamp: string;
}

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}
