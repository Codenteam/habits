/**
 * @ha-bits/bit-httpbin
 * 
 * A declarative bit for the HTTPBin API - a service for testing HTTP requests.
 * This demonstrates the declarative node pattern where API calls are defined
 * through configuration rather than code.
 * 
 * No execute() method needed - routing configuration handles everything!
 */

import type { 
  IDeclarativeNodeType, 
  DeclarativeNodeDescription 
} from '@ha-bits/cortex-core';

/**
 * HTTPBin - Declarative API bit
 * 
 * Uses https://httpbin.org - a simple HTTP request/response service
 */
export class HTTPBin implements IDeclarativeNodeType {
  runtime: 'app' | 'server' | 'all' = 'all';
  description: DeclarativeNodeDescription = {
    displayName: 'HTTPBin',
    name: 'httpbin',
    icon: 'file:httpbin.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Interact with HTTPBin testing API',
    defaults: {
      name: 'HTTPBin',
    },
    inputs: ['main'],
    outputs: ['main'],
    
    // Base configuration for all requests
    requestDefaults: {
      baseURL: 'https://httpbin.org',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    
    properties: [
      // Operation selector
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'GET Request',
            value: 'get',
            description: 'Make a GET request and see what HTTPBin returns',
            routing: {
              request: {
                method: 'GET',
                url: '/get',
              },
            },
          },
          {
            name: 'POST Request',
            value: 'post',
            description: 'Make a POST request with data',
            routing: {
              request: {
                method: 'POST',
                url: '/post',
              },
            },
          },
          {
            name: 'Get IP',
            value: 'ip',
            description: 'Get your origin IP address',
            routing: {
              request: {
                method: 'GET',
                url: '/ip',
              },
            },
          },
          {
            name: 'Get Headers',
            value: 'headers',
            description: 'Get the request headers',
            routing: {
              request: {
                method: 'GET',
                url: '/headers',
              },
            },
          },
          {
            name: 'Get User Agent',
            value: 'userAgent',
            description: 'Get the user agent string',
            routing: {
              request: {
                method: 'GET',
                url: '/user-agent',
              },
            },
          },
          {
            name: 'Get UUID',
            value: 'uuid',
            description: 'Get a random UUID',
            routing: {
              request: {
                method: 'GET',
                url: '/uuid',
              },
            },
          },
          {
            name: 'Anything',
            value: 'anything',
            description: 'Returns anything passed in request data',
            routing: {
              request: {
                method: 'GET',
                url: '/anything',
              },
            },
          },
        ],
        default: 'get',
        description: 'The operation to perform',
      },
      
      // POST data field (only for POST operation)
      {
        displayName: 'Data',
        name: 'postData',
        type: 'json',
        default: '{}',
        description: 'JSON data to send in POST request',
        displayOptions: {
          show: {
            operation: ['post'],
          },
        },
        routing: {
          send: {
            type: 'body',
            value: '={{$value}}',
          },
        },
      },
      
      // Query parameters (for GET operations)
      {
        displayName: 'Query Parameters',
        name: 'queryParams',
        type: 'json',
        default: '{}',
        description: 'Query parameters to send with GET request',
        displayOptions: {
          show: {
            operation: ['get', 'anything'],
          },
        },
        routing: {
          send: {
            type: 'query',
            value: '={{$value}}',
          },
        },
      },
    ],
  };
}

// Export the node instance
export const httpBin = new HTTPBin();
