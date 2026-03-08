/**
 * @ha-bits/bit-jsonplaceholder
 * 
 * A declarative bit for the JSONPlaceholder API - a free fake REST API for testing.
 * This demonstrates the declarative node pattern where API calls are defined
 * through configuration rather than code.
 * 
 * No execute() method needed - routing configuration handles everything!
 */

import type { 
  IDeclarativeNodeType, 
  DeclarativeNodeDescription 
} from '@ha-bits/cortex';

/**
 * JSONPlaceholder - Declarative API bit
 * 
 * Uses https://jsonplaceholder.typicode.com - a free fake API for testing
 */
export class JSONPlaceholder implements IDeclarativeNodeType {
  description: DeclarativeNodeDescription = {
    displayName: 'JSONPlaceholder',
    name: 'jsonPlaceholder',
    icon: 'file:jsonplaceholder.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + " " + $parameter["resource"]}}',
    description: 'Interact with JSONPlaceholder fake REST API for testing',
    defaults: {
      name: 'JSONPlaceholder',
    },
    inputs: ['main'],
    outputs: ['main'],
    
    // Base configuration for all requests
    requestDefaults: {
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    
    properties: [
      // Resource selector
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Post', value: 'posts' },
          { name: 'Comment', value: 'comments' },
          { name: 'User', value: 'users' },
          { name: 'Todo', value: 'todos' },
        ],
        default: 'posts',
        description: 'The resource to interact with',
      },
      
      // Operations for Posts
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['posts'],
          },
        },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'Get all posts',
            routing: {
              request: {
                method: 'GET',
                url: '/posts',
              },
            },
          },
          {
            name: 'Get One',
            value: 'get',
            description: 'Get a single post by ID',
            routing: {
              request: {
                method: 'GET',
                url: '=/posts/{{$parameter["postId"]}}',
              },
            },
          },
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new post',
            routing: {
              request: {
                method: 'POST',
                url: '/posts',
                body: {
                  title: '={{$parameter["title"]}}',
                  body: '={{$parameter["body"]}}',
                  userId: '={{$parameter["userId"]}}',
                },
              },
            },
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update an existing post',
            routing: {
              request: {
                method: 'PUT',
                url: '=/posts/{{$parameter["postId"]}}',
                body: {
                  id: '={{$parameter["postId"]}}',
                  title: '={{$parameter["title"]}}',
                  body: '={{$parameter["body"]}}',
                  userId: '={{$parameter["userId"]}}',
                },
              },
            },
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a post',
            routing: {
              request: {
                method: 'DELETE',
                url: '=/posts/{{$parameter["postId"]}}',
              },
              output: {
                postReceive: [
                  {
                    type: 'set',
                    properties: {
                      value: '={{ { "deleted": true, "id": $parameter["postId"] } }}',
                    },
                  },
                ],
              },
            },
          },
        ],
        default: 'getAll',
      },
      
      // Operations for Users
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['users'],
          },
        },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'Get all users',
            routing: {
              request: {
                method: 'GET',
                url: '/users',
              },
            },
          },
          {
            name: 'Get One',
            value: 'get',
            description: 'Get a single user by ID',
            routing: {
              request: {
                method: 'GET',
                url: '=/users/{{$parameter["userId"]}}',
              },
            },
          },
        ],
        default: 'getAll',
      },
      
      // Operations for Comments
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['comments'],
          },
        },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'Get all comments',
            routing: {
              request: {
                method: 'GET',
                url: '/comments',
              },
            },
          },
          {
            name: 'Get by Post',
            value: 'getByPost',
            description: 'Get comments for a specific post',
            routing: {
              request: {
                method: 'GET',
                url: '=/posts/{{$parameter["postId"]}}/comments',
              },
            },
          },
        ],
        default: 'getAll',
      },
      
      // Operations for Todos
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['todos'],
          },
        },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'Get all todos',
            routing: {
              request: {
                method: 'GET',
                url: '/todos',
              },
            },
          },
          {
            name: 'Get One',
            value: 'get',
            description: 'Get a single todo by ID',
            routing: {
              request: {
                method: 'GET',
                url: '=/todos/{{$parameter["todoId"]}}',
              },
            },
          },
          {
            name: 'Get by User',
            value: 'getByUser',
            description: 'Get todos for a specific user',
            routing: {
              request: {
                method: 'GET',
                url: '/todos',
                qs: {
                  userId: '={{$parameter["userId"]}}',
                },
              },
            },
          },
        ],
        default: 'getAll',
      },
      
      // ===== Field Parameters =====
      
      // Post ID - for get/update/delete post, and get comments by post
      {
        displayName: 'Post ID',
        name: 'postId',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            resource: ['posts'],
            operation: ['get', 'update', 'delete'],
          },
        },
        default: 1,
        description: 'The ID of the post',
      },
      {
        displayName: 'Post ID',
        name: 'postId',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            resource: ['comments'],
            operation: ['getByPost'],
          },
        },
        default: 1,
        description: 'The ID of the post to get comments for',
      },
      
      // User ID - for filtering and creating
      {
        displayName: 'User ID',
        name: 'userId',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            resource: ['users'],
            operation: ['get'],
          },
        },
        default: 1,
        description: 'The ID of the user',
      },
      {
        displayName: 'User ID',
        name: 'userId',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            resource: ['todos'],
            operation: ['getByUser'],
          },
        },
        default: 1,
        description: 'The ID of the user to get todos for',
      },
      {
        displayName: 'User ID',
        name: 'userId',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            resource: ['posts'],
            operation: ['create', 'update'],
          },
        },
        default: 1,
        description: 'The user ID for the post author',
      },
      
      // Todo ID
      {
        displayName: 'Todo ID',
        name: 'todoId',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            resource: ['todos'],
            operation: ['get'],
          },
        },
        default: 1,
        description: 'The ID of the todo',
      },
      
      // Title - for create/update post
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['posts'],
            operation: ['create', 'update'],
          },
        },
        default: '',
        description: 'The title of the post',
      },
      
      // Body - for create/update post
      {
        displayName: 'Body',
        name: 'body',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['posts'],
            operation: ['create', 'update'],
          },
        },
        default: '',
        description: 'The body content of the post',
      },
      
      // Limit results
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['getAll'],
          },
        },
        default: 10,
        description: 'Maximum number of results to return (applied client-side)',
        routing: {
          output: {
            postReceive: [
              {
                type: 'limit',
                properties: {
                  maxResults: 10,
                },
              },
            ],
          },
        },
      },
    ],
  };
}

// Export the declarative node
export const jsonPlaceholder = new JSONPlaceholder();
export default jsonPlaceholder;
