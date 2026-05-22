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
 * System prompt rules for UI generation - ensures AI generates proper YAML-driven UiSpec, not raw HTML
 */
const UI_GENERATION_RULES = `
You are a senior product designer + front-end engineer working with the Habits YAML-driven UI system.

Generate a \`frontend/index.yaml\` file (a UiSpec) — NOT raw HTML.
The YAML is compiled to a self-contained HTML page at request time by \`@ha-bits/cortex-core\`.

Do NOT output HTML. Output ONLY valid YAML that conforms to the UiSpec schema.

## Hard Constraints (MUST FOLLOW)

- Output MUST be a single YAML document starting with \`version: 1\`.
- No CSS gradients anywhere — the YAML engine uses only solid colors.
- Use human-friendly labels for all form fields (e.g., "email_address" → "Email Address").
- The POST call must be triggered only through form submission (actions), invisible to the user.
- Do not include any raw HTML, <style> blocks, or <script> tags.
- Always add \`# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml\` at the top.

## UiSpec Structure

\`\`\`yaml
# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml
version: 1

meta:
  id: {workflow-id}        # matches the habit workflow id
  title: {Human Title}
  icon: "🤖"

theme:
  preset: ha-bits-blue     # choose: ha-bits-blue, ha-bits-purple, ha-bits-cyan, ha-bits-emerald, ha-bits-red, aurora, cyberpunk, mobile-blue, tailwind-dark
  mode: dark

state:
  result: null             # all reactive state goes here

actions:
  run:
    method: POST
    endpoint: /api/{workflow-id}
    body: { field: "{{state.field}}" }
    responsePath: output
    onSuccess:
      set: { result: "$response" }
      toast: "Done!"
    onError:
      toast:
        message: "{{state.error}}"
        level: error

widgets:
  - kind: card
    title: {Title}
    children:
      - kind: form
        bindTo: state
        fields:
          - { name: field, type: text, label: Your Input, required: true }
        submit: { label: Run, action: run, loadingLabel: "Running..." }
  - kind: result-panel
    source: state.result
    showWhen: state.result
    title: Result
    sections:
      - { kind: json-dump, source: state.result, copy: true }
\`\`\`

## API Response Parsing (CRITICAL)

The response from \`POST /api/{workflow-id}\` always has \`output\` at the top level.
In the YAML, use \`responsePath: output\` and \`set: { result: "$response" }\` to capture it.
Access fields in templates as \`{{state.result.fieldName}}\`.

## Available Widget Kinds

- Layout: \`section\`, \`card\`, \`row\`, \`column\`, \`tabs\`, \`accordion\`, \`modal\`, \`split\`
- Input: \`form\`, \`button\`, \`action-button\`, \`copy-button\`, \`download-button\`, \`toggle\`, \`chip-group\`, \`radio-cards\`, \`tag-input\`
- Output: \`result-panel\`, \`pre\`, \`code-block\`, \`json-dump\`, \`markdown\`, \`text\`, \`heading\`, \`image\`, \`score-ring\`, \`bar-chart\`, \`progress-bar\`, \`metric-grid\`, \`stat-row\`, \`badge-list\`, \`data-table\`, \`kv-grid\`, \`list\`, \`checklist\`
- Feedback: \`status-banner\`, \`alert\`, \`empty-state\`, \`spinner\`, \`loading-steps\`
- Realtime: \`chat-panel\`, \`streaming-panel\`, \`streaming-text\`

## Form Field Types

\`text\`, \`email\`, \`number\`, \`date\`, \`textarea\`, \`select\`, \`chip-group\`, \`radio-cards\`, \`tag-input\`, \`file\`, \`image\`

## showWhen / hideWhen

Use template expressions for conditional rendering:
\`showWhen: state.result\` — shows widget when result is truthy
\`showWhen: "state.queue.length > 0"\` — JS expression
\`hideWhen: state.loading\` — hides when loading
`;

/**
 * Extract YAML from markdown code blocks if present, otherwise return the whole content
 */
function extractYamlFromResponse(content: string): string {
  if (!content) return '';
  
  // Try to extract from ```yaml ... ``` blocks
  const yamlBlockMatch = content.match(/```yaml\s*([\s\S]*?)```/i);
  if (yamlBlockMatch && yamlBlockMatch[1]) {
    return yamlBlockMatch[1].trim();
  }

  // Try to extract from ```yml ... ``` blocks
  const ymlBlockMatch = content.match(/```yml\s*([\s\S]*?)```/i);
  if (ymlBlockMatch && ymlBlockMatch[1]) {
    return ymlBlockMatch[1].trim();
  }
  
  // Try to extract from generic ``` ... ``` blocks that contain YAML
  const genericBlockMatch = content.match(/```\s*([\s\S]*?)```/);
  if (genericBlockMatch && genericBlockMatch[1]) {
    const blockContent = genericBlockMatch[1].trim();
    // Check if it looks like YAML (starts with version: or # yaml-language-server)
    if (blockContent.startsWith('version:') || blockContent.startsWith('# yaml-language-server')) {
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
 * Get OpenAI-compatible base URL for different providers
 */
function getProviderBaseUrl(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com/v1';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/openai';
    default:
      return 'https://api.openai.com/v1';
  }
}

/**
 * Generate frontend HTML using AI - directly via OpenAI-compatible API
 */
async function generateWithOpenAICompatible(
  request: AIGenerationRequest,
  config: WebCanvasConfig,
  enhancedPrompt: string
): Promise<AIGenerationResponse> {
  const apiKey = config.apiKey || request.apiToken;
  if (!apiKey) {
    throw new Error('API key is required for direct provider mode');
  }

  const provider = request.provider || config.provider || 'openai';
  const model = request.model || config.model || 'gpt-4.1-mini';
  const baseUrl = getProviderBaseUrl(provider);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  
  // Add Anthropic-specific header for browser access
  if (provider === 'anthropic') {
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a senior product designer and front-end engineer. Generate clean, professional HTML code based on user requirements.'
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider} API failed: ${response.statusText}. ${errorText}`);
  }

  // Handle streaming response
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let accumulatedContent = '';

  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (request.onProgress) {
            const extractedYaml = extractYamlFromResponse(accumulatedContent);
            request.onProgress(extractedYaml, true);
          }
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE format: data: {...}\n\n
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
        
        for (const line of lines) {
          const data = line.replace(/^data: /, '').trim();
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulatedContent += content;
              
              if (request.onProgress) {
                const extractedYaml = extractYamlFromResponse(accumulatedContent);
                request.onProgress(extractedYaml, false);
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  const extractedYaml = extractYamlFromResponse(accumulatedContent);
  return { yaml: extractedYaml };
}

/**
 * Generate frontend YAML UiSpec using AI
 */
export async function generateWithAI(
  request: AIGenerationRequest,
  config: WebCanvasConfig,
  isHosted: boolean
): Promise<AIGenerationResponse> {
  
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
    const contextContent = buildMultiHabitContext(enrichedContext);;
    
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

Generate a \`frontend/index.yaml\` UiSpec that:
1. Provides user-friendly forms for each /api endpoint
2. Maps all required input fields to form fields based on the API specs
3. Displays appropriate feedback for API execution results (result-panel, metric-grid, etc.)
4. If multiple APIs exist, use a \`tabs\` or \`sidebar\` layout
5. All endpoints use /api without hostname (same host)
6. Only include widgets necessary for the functionality
7. Use human-friendly labels, no technical terms (API, workflow, node, endpoint, etc.) visible to the user
8. After the action succeeds, use \`set: { result: "$response" }\` to capture the output
9. Access output fields in templates as \`{{state.result.fieldName}}\`

Remember: the output MUST be valid YAML (a UiSpec), NOT HTML.`;
    }
  }

  // Return mock YAML if mock mode is enabled
  const forceMock = false;
  if (forceMock) {
    const mockYaml = `# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml
version: 1

meta:
  id: mock
  title: Mock Habit (${new Date().toISOString()})
  icon: "🤖"

theme:
  preset: ha-bits-blue
  mode: dark

state:
  result: null

widgets:
  - kind: text
    value: Mock YAML generated at ${new Date().toISOString()}
`;

    // Call progress callback if provided
    if (request.onProgress) {
      request.onProgress(mockYaml, true);
    }
    console.log(enhancedPrompt);
    return { yaml: mockYaml };
  }

  // Use OpenAI-compatible direct mode for external providers
  const provider = request.provider || config.provider || 'auto';
  if (provider !== 'auto' && provider !== 'intersect') {
    return generateWithOpenAICompatible(request, config, enhancedPrompt);
  }

  const url = buildWebCanvasUrl(config, isHosted);
  // WebCanvas API mode
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: enhancedPrompt,
      provider: request.provider || config.provider || 'auto',
      model: request.model || config.model || 'gpt-4.1-mini',
      // html: request.html,
      // Note: apiToken is intentionally omitted for Intersect provider - auth is via the Authorization header
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
            const extractedYaml = extractYamlFromResponse(accumulatedContent);
            request.onProgress(extractedYaml, true);
          }
          break;
        }
        
        // Decode the chunk and accumulate
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        
        // Send progress update with extracted YAML
        if (request.onProgress) {
          const extractedYaml = extractYamlFromResponse(accumulatedContent);
          request.onProgress(extractedYaml, false);
        }
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    // Fallback if no reader (shouldn't happen in browsers)
    accumulatedContent = await response.text();
    if (request.onProgress) {
      const extractedYaml = extractYamlFromResponse(accumulatedContent);
      request.onProgress(extractedYaml, true);
    }
  }
  
  // Extract YAML from markdown code blocks if present
  const extractedYaml = extractYamlFromResponse(accumulatedContent);
  
  // Check if the response is a JSON error from the Intersect API
  try {
    const parsed = JSON.parse(accumulatedContent.trim());
    if (parsed && parsed.ok === false && parsed.message) {
      throw new Error(`Intersect AI error: ${parsed.message}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Intersect AI error:')) {
      throw e;
    }
    // Not valid JSON or no ok:false - continue normally
  }
  
  // Normalize the response
  return {
    yaml: extractedYaml,
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
