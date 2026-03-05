/**
 * Response helper for creating standard API responses
 */

import { StandardResponse } from '../types';

/**
 * Create a standard API response
 */
export function createResponse(
  success: boolean,
  data?: any,
  error?: string,
  execution_id?: string,
): StandardResponse {
  return {
    success,
    data,
    error,
    execution_id,
    timestamp: new Date().toISOString(),
  };
}
