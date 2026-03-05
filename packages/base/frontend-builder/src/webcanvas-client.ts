import type { HostingDetectionResult, WebCanvasConfig, AIGenerationRequest, AIGenerationResponse, HabitDefinition, HabitContext } from './types';
import { extractInputFields } from '@habits/shared/variableUtils';

// API base URL for the base server
const API_BASE_URL = '/habits/base/api';

/**
 * Generate OpenAPI spec for a single habit by calling the base server API
 */
async function generateOpenAPISpecForHabit(habit: HabitDefinition): Promise<HabitDefinition> {
  // Skip if already has openApiSpec or has no nodes
  if (habit.openApiSpec || !habit.nodes || habit.nodes.length === 0) {
    return habit;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/serve/openapi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        habit: {
          id: habit.id,
          name: habit.name,
          description: habit.description,
          nodes: habit.nodes,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`Failed to generate OpenAPI spec for habit ${habit.id}:`, response.statusText);
      return habit;
    }

    const result = await response.json();
    if (result.success && result.data) {
      return { ...habit, openApiSpec: result.data };
    }
  } catch (error) {
    console.warn(`Error generating OpenAPI spec for habit ${habit.id}:`, error);
  }

  return habit;
}

/**
 * Generate OpenAPI specs for all habits in a context that don't have one
 */
async function enrichHabitContextWithOpenAPI(context: HabitContext): Promise<HabitContext> {
  const enrichedHabits = await Promise.all(
    context.habits.map(habit => generateOpenAPISpecForHabit(habit))
  );

  return {
    ...context,
    habits: enrichedHabits,
  };
}

/**
 * System prompt rules for UI generation - ensures AI generates proper website UIs, not API clients
 */
const UI_GENERATION_RULES = `
You are a senior product designer + front-end engineer.

Create a real HTML interface with primary call-to-action form that submits data via a specific POST request implemented in code.

Don't put any parts to the page that aren't necessary for the functionality.
## Hard Constraints (MUST FOLLOW)

The user must interact with a normal form (human-friendly labels).

The POST request must be triggered only as part of the form submission flow, invisible to the user.

If you violate any of the above, the output is invalid.

IMPORTANT: Make sure to add the javascript code that will submit any forms if needed.

## Website UI Requirements

- A full page layout
- Modern premium visual style: dark + glassmorphism OR clean light + bold typography
- Responsive layout (desktop-first + mobile)
- Polished states: hover/focus, inline validation errors, loading, success, failure
- Micro-interactions (subtle animations)
- No gradients at all. 

## Form Requirements (Human UX, Not Developer UX)

- Validation:
  - Required fields
  - Show inline error messages with professional styling
- Use human-friendly labels derived from API field names (e.g., "email_address" → "Email Address")
- Include proper form feedback: loading spinners, success messages, error handling
`;

/**
 * Extract HTML from markdown code blocks if present, otherwise return the whole content
 */
function extractHtmlFromResponse(content: string): string {
  if (!content) return '';
  
  // Try to extract from ```html ... ``` blocks
  const htmlBlockMatch = content.match(/```html\s*([\s\S]*?)```/i);
  if (htmlBlockMatch && htmlBlockMatch[1]) {
    return htmlBlockMatch[1].trim();
  }
  
  // Try to extract from generic ``` ... ``` blocks that contain HTML
  const genericBlockMatch = content.match(/```\s*([\s\S]*?)```/);
  if (genericBlockMatch && genericBlockMatch[1]) {
    const blockContent = genericBlockMatch[1].trim();
    // Check if it looks like HTML (starts with < or contains common HTML tags)
    if (blockContent.startsWith('<') || /<(html|head|body|div|style|script|form|input|button)/i.test(blockContent)) {
      return blockContent;
    }
  }
  
  // Return the whole content if no code blocks found
  return content.trim();
}

/**
 * Convert OpenAPI spec to REQUEST-like examples for AI consumption
 * Only includes POST endpoints starting with /api/
 */
function convertOpenApiToRequest(openApiSpec: any, habit: HabitDefinition): string {
  const examples: string[] = [];
  
  const paths = openApiSpec.paths || {};
  
  // Extract input fields from habit nodes using shared utility
  const inputFields = habit.nodes ? extractInputFields(habit.nodes) : [];
  
  for (const [path, methods] of Object.entries(paths)) {
    // Only include paths starting with /api/
    if (!path.startsWith('/api/')) {
      continue;
    }
    
    for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
      // Only include POST methods
      if (method.toLowerCase() !== 'post') {
        continue;
      }
      
      const op = operation as any;
      const summary = op.summary || op.operationId || `${method.toUpperCase()} ${path}`;
      const habitPrefix = habit.name ? `[${habit.name}] ` : '';
      
      let request = `### ${habitPrefix}${summary}\n`;
      request += `\`\`\`${method.toUpperCase()} "${path}"`;
      
      // Add headers
      request += ` \\\n  with header "Content-Type: application/json"`;
      
      // Add request body example - use extracted input fields from habit nodes
      if (inputFields.length > 0) {
        const inputExample: Record<string, string> = {};
        inputFields.forEach(field => {
          inputExample[field] = `<${field} value>`;
        });
        request += ` \\\n  and data '${JSON.stringify(inputExample, null, 2).split('\n').join('\n  ')}'`;
      } else {
        // Fallback to OpenAPI schema if no input fields found in nodes
        const requestBody = op.requestBody?.content?.['application/json'];
        if (requestBody) {
          const schema = requestBody.schema;
          const example = requestBody.example || generateExampleFromSchema(schema);
          if (example) {
            request += ` \\\n  and data '${JSON.stringify(example, null, 2).split('\n').join('\n  ')}'`;
          }
        }
      }
      
      request += '\n```\n';
      
      // Add expected response - use habit's output mappings if available
      if (habit.output && Object.keys(habit.output).length > 0) {
        const outputExample: Record<string, string> = {};
        Object.keys(habit.output).forEach(key => {
          outputExample[key] = `<${key} value>`;
        });
        request += `\n\n**Expected Response:**\n\`\`\`json\n${JSON.stringify({ status: 'completed', output: outputExample }, null, 2)}\n\`\`\``;
      } else {
        // Fallback to OpenAPI response schema
        const responses = op.responses || {};
        const successResponse = responses['200'] || responses['201'] || responses['default'];
        if (successResponse) {
          const responseContent = successResponse.content?.['application/json'];
          if (responseContent) {
            const responseExample = responseContent.example || generateExampleFromSchema(responseContent.schema);
            if (responseExample) {
              // Remove internal fields
              if (responseExample.executionId) delete responseExample.executionId;
              if (responseExample.workflowId) delete responseExample.workflowId;
              if (responseExample.nodeResults) delete responseExample.nodeResults;
              if (responseExample.startTime) delete responseExample.startTime;
              if (responseExample.endTime) delete responseExample.endTime;
              request += `\n\n**Expected Response:**\n\`\`\`json\n${JSON.stringify(responseExample, null, 2)}\n\`\`\``;
            }
          }
        }
      }
      
      examples.push(request);
    }
  }
  return examples.join('\n\n---\n\n') || '';
}

/**
 * Format habit nodes for AI consumption - explains the backend workflow
 */
function formatHabitNodes(nodes: any[], habitName: string): string {
  if (!nodes || nodes.length === 0) {
    return '';
  }

  const nodeDescriptions = nodes.map((node, index) => {
    const nodeName = node.name || node.id || `Node ${index + 1}`;
    const nodeDescription = node.description || '';
    
    // let nodeInfo = `  ${index + 1}. **${nodeName}** (${nodeType})`;
    let nodeInfo = `  ${index + 1}. **${nodeName}**`;
    
    if (nodeDescription) {
      nodeInfo += `\n     - Description: ${nodeDescription}`;
    }
    
    // Include relevant node configuration
    if (node.config || node.settings) {
      const config = node.config || node.settings;
      const configKeys = Object.keys(config).slice(0, 5); // Limit to avoid prompt bloat
      if (configKeys.length > 0) {
        nodeInfo += `\n     - Config: ${configKeys.join(', ')}`;
      }
    }
    
    // Include input/output if available
    if (node.inputs) {
      const inputKeys = Array.isArray(node.inputs) 
        ? node.inputs.map((i: any) => i.name || i).join(', ')
        : Object.keys(node.inputs).join(', ');
      if (inputKeys) {
        nodeInfo += `\n     - Inputs: ${inputKeys}`;
      }
    }
    
    if (node.outputs) {
      const outputKeys = Array.isArray(node.outputs)
        ? node.outputs.map((o: any) => o.name || o).join(', ')
        : Object.keys(node.outputs).join(', ');
      if (outputKeys) {
        nodeInfo += `\n     - Outputs: ${outputKeys}`;
      }
    }
    
    return nodeInfo;
  });

  return `### Backend logic for "${habitName}"

This backend executes the following logic when called:

${nodeDescriptions.join('\n\n')}
`;
}

/**
 * Build context section for a single habit
 */
function buildHabitContextSection(habit: HabitDefinition): string {
  const sections: string[] = [];
  
  // Habit header
  sections.push(`## API: ${habit.name}${habit.id ? `` : ''}`);
  
  if (habit.description) {
    sections.push(`**Description:** ${habit.description}`);
  }
  
  // Include nodes/workflow information
  if (habit.nodes && habit.nodes.length > 0) {
    sections.push(formatHabitNodes(habit.nodes, habit.name));
  }
  // Include API endpoints with REQUEST examples
  if (habit.openApiSpec) {
    const requestExamples = convertOpenApiToRequest(habit.openApiSpec, habit);
    sections.push(`### API Endpoints\n${requestExamples}`);
  }
  
  return sections.join('\n\n');
}

/**
 * Build the complete context for multiple habits
 */
function buildMultiHabitContext(context: HabitContext): string {
  const contextParts: string[] = [];
  
  if (context.habits.length > 0) {
    contextParts.push(`# Available Endpoints (${context.habits.length} total)\n`);
    contextParts.push('The frontend should be able to interact with the following APIs:\n');
    
    for (const habit of context.habits) {
      contextParts.push(buildHabitContextSection(habit));
      contextParts.push('\n---\n');
    }
  }
  
  // Additional context/description
  if (context.description) {
    contextParts.push(`## Additional Context\n${context.description}`);
  }
  
  return contextParts.join('\n\n');
}

/**
 * Generate example data from OpenAPI schema
 */
function generateExampleFromSchema(schema: any, depth = 0): any {
  if (!schema || depth > 5) return null;
  
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  
  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'date') return '2024-01-15';
      if (schema.format === 'date-time') return '2024-01-15T10:30:00Z';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uri') return 'https://example.com';
      return schema.description?.slice(0, 20) || 'string';
    case 'number':
    case 'integer':
      return schema.minimum ?? schema.maximum ?? 0;
    case 'boolean':
      return true;
    case 'array':
      const itemExample = generateExampleFromSchema(schema.items, depth + 1);
      return itemExample ? [itemExample] : [];
    case 'object':
      const obj: Record<string, any> = {};
      const properties = schema.properties || {};
      for (const [key, propSchema] of Object.entries(properties)) {
        const val = generateExampleFromSchema(propSchema as any, depth + 1);
        if (val !== null) obj[key] = val;
      }
      return Object.keys(obj).length > 0 ? obj : null;
    default:
      // Handle anyOf, oneOf, allOf
      if (schema.anyOf) return generateExampleFromSchema(schema.anyOf[0], depth + 1);
      if (schema.oneOf) return generateExampleFromSchema(schema.oneOf[0], depth + 1);
      if (schema.allOf) {
        const merged: any = {};
        for (const s of schema.allOf) {
          const ex = generateExampleFromSchema(s, depth + 1);
          if (ex && typeof ex === 'object') Object.assign(merged, ex);
        }
        return Object.keys(merged).length > 0 ? merged : null;
      }
      return null;
  }
}

/**
 * Check if the application is hosted on intersect.site by attempting to fetch the API key
 */
export async function detectHostingEnvironment(): Promise<HostingDetectionResult> {
  try {
    const response = await fetch('/api/get-or-create-api-key', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const apiKey = data.apiKey || data.api_key || data.token || '';
      // Get tenant URL from current origin when hosted
      const tenantUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      return {
        isHosted: true,
        tenantUrl,
        apiKey,
      };
    }

    // If we get a 404 or other error, we're not on intersect.site
    return {
      isHosted: false,
    };
  } catch (error) {
    // Network error or CORS issue - definitely not on intersect.site
    return {
      isHosted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build the WebCanvas API URL based on configuration
 */
export function buildWebCanvasUrl(config: WebCanvasConfig, isHosted: boolean): string {
  if (isHosted) {
    // When hosted on intersect.site, use relative URL
    return '/canvas/webcanvas/ai';
  }
  
  // When not hosted, use tenant URL
  if (!config.tenantUrl) {
    throw new Error('Tenant URL is required when not hosted on intersect.site');
  }
  
  // Normalize tenant URL
  let baseUrl = config.tenantUrl.trim();
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  return `${baseUrl}/canvas/webcanvas/ai`;
}

/**
 * Generate frontend HTML using AI
 */
export async function generateWithAI(
  request: AIGenerationRequest,
  config: WebCanvasConfig,
  isHosted: boolean
): Promise<AIGenerationResponse> {


  const url = buildWebCanvasUrl(config, isHosted);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add API key for non-hosted environments
  if (!isHosted && config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }
  
  if (isHosted) {
    headers['x-forwarded-for'] = 'localhost';
  }

  // Build enhanced prompt with context if provided
  // Start with the UI generation rules to ensure proper website output
  let enhancedPrompt = `${UI_GENERATION_RULES}

---

## User Request:
${request.prompt}`;
  
  if (request.context) {
    // Enrich habit context with OpenAPI specs if needed (generate them now)
    const enrichedContext = await enrichHabitContextWithOpenAPI(request.context as HabitContext);
    const contextContent = buildMultiHabitContext(enrichedContext);
    
    if (contextContent.trim()) {
      enhancedPrompt = `${UI_GENERATION_RULES}

---

## User Request:
${request.prompt}

---

# Backend Context & API Endpoints

The following define the backend behavior. 
${contextContent}

---

## Generation Instructions

Generate a professional website frontend that:
1. Provides user-friendly forms for each /api endpoint
2. Handles all required input fields based on the API specs
3. Displays appropriate feedback for API execution results
4. If multiple APIs exist, consider a navigation or tabbed interface
5. The frontend and the backend are on the same host, so use /api without hostname for backend stuff
6. Don't add any buttons that aren't necessary for a real website UI. 
7. Add tailwind to the html
8. Don't include any technical details, raw JSON, or HTTP request information in the visible UI. Nor technical works like API, workflow, node, endpoint, etc. The user should only see a polished website interface with forms and feedback, not any developer-centric information.

Remember: this must be a real website UI, NOT an API testing tool. The user should never see raw JSON, HTTP methods, or request details on the screen.`;
    }
  }

    // Return mock HTML if mock mode is enabled
  const forceMock = false;
  if (forceMock) {
    const mockHtml = `<!DOCTYPE html>
<html lang="en">
Test HTML Date: ${new Date().toISOString()}
<script type="text/javascript">

</script>
</html>`;

    // Call progress callback if provided
    if (request.onProgress) {
      request.onProgress(mockHtml, true);
    }
    console.log(enhancedPrompt);
    return { html: mockHtml };
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: enhancedPrompt,
      provider: request.provider || config.provider || 'auto',
      model: request.model || config.model || 'gpt-4.1-mini',
      // html: request.html,
      apiToken: request.apiToken || config.apiKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI generation failed: ${response.statusText}. ${errorText}`);
  }

  // Handle streaming text response
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let accumulatedContent = '';

  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Final progress callback
          if (request.onProgress) {
            const extractedHtml = extractHtmlFromResponse(accumulatedContent);
            request.onProgress(extractedHtml, true);
          }
          break;
        }
        
        // Decode the chunk and accumulate
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        
        // Send progress update with extracted HTML
        if (request.onProgress) {
          const extractedHtml = extractHtmlFromResponse(accumulatedContent);
          request.onProgress(extractedHtml, false);
        }
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    // Fallback if no reader (shouldn't happen in browsers)
    accumulatedContent = await response.text();
    if (request.onProgress) {
      const extractedHtml = extractHtmlFromResponse(accumulatedContent);
      request.onProgress(extractedHtml, true);
    }
  }
  
  // Extract HTML from markdown code blocks if present
  const extractedHtml = extractHtmlFromResponse(accumulatedContent);
  
  // Normalize the response
  return {
    html: extractedHtml,
  };
}

/**
 * Validate tenant URL format
 */
export function validateTenantUrl(url: string): boolean {
  if (!url) return false;
  
  // Allow URLs with or without protocol
  const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
  
  try {
    const parsed = new URL(urlWithProtocol);
    // Check if it's a valid intersect.site subdomain
    return parsed.hostname.endsWith('.intersect.site') || 
    parsed.hostname.endsWith('.intersect.test') || 
           parsed.hostname === 'intersect.site' ||
           parsed.hostname === 'localhost' ||
           parsed.hostname === 'intersect.test' ;
  } catch {
    return false;
  }
}
