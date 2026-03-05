/**
 * HTTP Request utilities for n8n node execution
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';
import {
  IHttpRequestOptions,
  IN8nHttpFullResponse,
  IN8nHttpResponse,
} from './types';
import { LoggerFactory } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

/**
 * Convert n8n request options to axios config
 */
export function convertN8nRequestToAxios(requestOptions: IHttpRequestOptions): AxiosRequestConfig {
  const { headers, method, timeout, auth, url, body, qs } = requestOptions;

  const axiosConfig: AxiosRequestConfig = {
    headers: (headers as Record<string, string>) ?? {},
    method: method || 'GET',
    timeout: timeout || 300000,
    url,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  };

  // Add query parameters
  if (qs) {
    axiosConfig.params = qs;
  }

  // Add authentication
  if (auth) {
    axiosConfig.auth = {
      username: auth.username || '',
      password: auth.password || '',
    };
  }

  // Add base URL
  if (requestOptions.baseURL) {
    axiosConfig.baseURL = requestOptions.baseURL;
  }

  // Handle redirect options
  if (requestOptions.disableFollowRedirect) {
    axiosConfig.maxRedirects = 0;
  }

  // Handle response encoding
  if (requestOptions.encoding) {
    axiosConfig.responseType = requestOptions.encoding as any;
  }

  // Handle SSL certificate validation
  if (requestOptions.skipSslCertificateValidation) {
    // Note: In a real implementation, we'd configure the https agent
    // For simplicity, we'll just note this option
  }

  // Handle body
  if (body) {
    if (body instanceof FormData) {
      axiosConfig.data = body;
      axiosConfig.headers = {
        ...axiosConfig.headers,
        ...body.getHeaders(),
      };
    } else if (body instanceof URLSearchParams) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      axiosConfig.data = body;
    } else if (typeof body === 'object' && Object.keys(body).length > 0) {
      axiosConfig.data = body;
    } else if (typeof body === 'string') {
      axiosConfig.data = body;
    }
  }

  // Add JSON accept header if requested
  if (requestOptions.json) {
    axiosConfig.headers = {
      ...axiosConfig.headers,
      Accept: 'application/json',
    };
  }

  // Add User-Agent header
  if (!axiosConfig.headers?.['User-Agent']) {
    axiosConfig.headers = {
      ...axiosConfig.headers,
      'User-Agent': 'n8n-habits-executor',
    };
  }

  // Handle ignoreHttpStatusErrors
  if (requestOptions.ignoreHttpStatusErrors) {
    axiosConfig.validateStatus = () => true;
  }

  return axiosConfig;
}

/**
 * Execute HTTP request (real implementation)
 */
export async function httpRequest(
  requestOptions: IHttpRequestOptions
): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
  // Remove empty body for GET/HEAD/OPTIONS
  const noBodyMethods = ['GET', 'HEAD', 'OPTIONS'];
  const method = (requestOptions.method || 'GET').toUpperCase();
  if (noBodyMethods.includes(method) && requestOptions.body && Object.keys(requestOptions.body).length === 0) {
    delete requestOptions.body;
  }

  const axiosConfig = convertN8nRequestToAxios(requestOptions);
  
  // Remove body for GET requests
  if (axiosConfig.data === undefined || (axiosConfig.method?.toUpperCase() === 'GET')) {
    delete axiosConfig.data;
  }

  logger.log(`🌐 Making HTTP request: ${axiosConfig.method} ${axiosConfig.url}`);
  
  try {
    const response: AxiosResponse = await axios(axiosConfig);

    if (requestOptions.returnFullResponse) {
      return {
        body: response.data,
        headers: response.headers as Record<string, string>,
        statusCode: response.status,
        statusMessage: response.statusText,
      };
    }

    return response.data;
  } catch (error: any) {
    if (error.response) {
      logger.error(`HTTP Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      throw new Error(`HTTP Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}
