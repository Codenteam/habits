#!/usr/bin/env tsx
/**
 * Run Conversion - Example script demonstrating the Logic Converter
 *
 * This script shows how to use the LogicConverter to:
 * 1. Convert sample code to match specifications
 * 2. Generate new code based on a prompt
 */

import { createConverter } from "./logic-converter.js";
import type {
  ConversionContext,
  ConversionInput,
  GenerationPrompt,
  Instruction,
  SampleCode,
  Specification,
  SystemCode,
  TypeDefinition,
} from "./types.js";

// =============================================================================
// Example: Define specifications, instructions, types, and system code
// =============================================================================

// Example specifications that define how code should be structured
const specifications: Specification[] = [
  {
    id: "spec-1",
    name: "API Response Format",
    description: "All API handlers must return responses in a consistent format",
    content: `
All API responses must follow this structure:
- Success responses: { success: true, data: T, metadata?: object }
- Error responses: { success: false, error: { code: string, message: string, details?: object } }
- Always include proper HTTP status codes
- Use camelCase for all JSON keys
`,
    category: "API",
    priority: 10,
  },
  {
    id: "spec-2",
    name: "Error Handling",
    description: "Standard error handling patterns",
    content: `
Error handling requirements:
1. All async functions must use try-catch blocks
2. Errors must be logged with context before being thrown
3. Never expose internal error details to clients
4. Use custom error classes for different error types
5. Include error codes for programmatic handling
`,
    category: "Error Handling",
    priority: 9,
  },
  {
    id: "spec-3",
    name: "Naming Conventions",
    description: "Standard naming conventions for code",
    content: `
Naming conventions:
- Functions: camelCase, verb-first (e.g., getUserById, validateInput)
- Classes: PascalCase (e.g., UserService, ApiHandler)
- Interfaces: PascalCase with descriptive names (e.g., UserProfile, ApiResponse)
- Constants: UPPER_SNAKE_CASE (e.g., MAX_RETRY_COUNT, API_BASE_URL)
- Private members: prefix with underscore (e.g., _privateMethod)
`,
    category: "Style",
    priority: 8,
  },
];

// Example instructions for code generation/conversion
const instructions: Instruction[] = [
  {
    id: "inst-1",
    name: "TypeScript Strict Mode",
    content:
      "Always use strict TypeScript with proper type annotations. Avoid 'any' type unless absolutely necessary. Use 'unknown' for truly unknown types.",
    appliesTo: "always",
  },
  {
    id: "inst-2",
    name: "Documentation",
    content:
      "Add JSDoc comments to all public functions and classes. Include @param, @returns, and @throws tags where applicable.",
    appliesTo: "always",
    examples: [
      `/**
 * Fetches a user by their unique identifier.
 * @param userId - The unique identifier of the user
 * @returns The user profile if found
 * @throws {NotFoundError} When user doesn't exist
 */
async function getUserById(userId: string): Promise<UserProfile> { ... }`,
    ],
  },
  {
    id: "inst-3",
    name: "Async/Await Pattern",
    content:
      "Use async/await instead of raw promises. Always handle promise rejections. Use Promise.all for parallel operations.",
    appliesTo: "conversion",
  },
  {
    id: "inst-4",
    name: "Functional Style",
    content:
      "Prefer functional programming patterns: use map/filter/reduce over loops where appropriate. Keep functions pure when possible.",
    appliesTo: "generation",
  },
];

// Example type definitions that code must adhere to
const types: TypeDefinition[] = [
  {
    name: "ApiResponse",
    definition: `interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp: number;
    requestId: string;
  };
}`,
    description: "Standard API response wrapper type",
  },
  {
    name: "UserProfile",
    definition: `interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
}`,
    description: "User profile data structure",
  },
  {
    name: "UserPreferences",
    definition: `interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}`,
    description: "User preference settings",
  },
];

// Example system code that provides context
const systemCode: SystemCode[] = [
  {
    path: "src/utils/logger.ts",
    content: `import { createLogger } from 'winston';

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
});

export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context,
  });
}`,
    language: "typescript",
    description: "Logging utility used across the application",
  },
  {
    path: "src/errors/custom-errors.ts",
    content: `export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(\`\${resource} with id \${id} not found\`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}`,
    language: "typescript",
    description: "Custom error classes for structured error handling",
  },
];

// =============================================================================
// Example usage functions
// =============================================================================

/**
 * Example: Convert existing code to match specifications
 */
async function runConversionExample(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("CODE CONVERSION EXAMPLE");
  console.log("=".repeat(60) + "\n");

  // Sample code to convert (e.g., old JavaScript code)
  const sampleCode: SampleCode = {
    content: `
// Old JavaScript API handler
function getUser(req, res) {
  const userId = req.params.id;
  
  db.query('SELECT * FROM users WHERE id = ?', [userId], function(err, results) {
    if (err) {
      console.log('Error:', err);
      res.status(500).send('Internal error');
      return;
    }
    
    if (results.length === 0) {
      res.status(404).send('User not found');
      return;
    }
    
    res.json(results[0]);
  });
}
`,
    sourceLanguage: "javascript",
    targetLanguage: "typescript",
    filePath: "src/handlers/user.js",
    conversionNotes:
      "Convert to modern TypeScript with proper error handling and typing",
  };

  const context: ConversionContext = {
    specifications,
    instructions,
    types,
    systemCode,
    additionalContext:
      "This is part of an Express.js API that is being migrated to TypeScript",
  };

  const input: ConversionInput = {
    type: "code",
    code: sampleCode,
  };

  const converter = createConverter({
    verbose: true,
    copilot: {
      model: "gpt-4.1",
      streaming: true,
      logLevel: "info",
    },
  });

  try {
    const result = await converter.process(context, input);

    console.log("\n" + "-".repeat(60));
    console.log("CONVERSION RESULT");
    console.log("-".repeat(60));

    if (result.success) {
      console.log(`✅ Success: ${result.summary}`);
      console.log(`📁 Generated ${result.files.length} file(s)`);

      for (const file of result.files) {
        console.log(`\n--- ${file.path} ---`);
        console.log(file.content);
        if (file.explanation) {
          console.log(`\n📝 ${file.explanation}`);
        }
      }

      if (result.warnings?.length) {
        console.log("\n⚠️ Warnings:");
        result.warnings.forEach((w) => console.log(`  - ${w}`));
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }

    console.log(`\n⏱️ Duration: ${result.metadata.durationMs}ms`);
  } finally {
    await converter.destroy();
  }
}

/**
 * Example: Generate new code based on a prompt
 */
async function runGenerationExample(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("CODE GENERATION EXAMPLE");
  console.log("=".repeat(60) + "\n");

  const generationPrompt: GenerationPrompt = {
    description:
      "Create a UserService class that handles CRUD operations for users with proper validation and error handling",
    language: "typescript",
    outputPaths: ["src/services/user-service.ts"],
    features: [
      "Create, read, update, and delete user operations",
      "Input validation for all operations",
      "Proper error handling with custom error classes",
      "Logging of all operations",
      "Type-safe methods using the provided interfaces",
    ],
    constraints: [
      "Must use the existing logger utility",
      "Must throw appropriate custom errors from the error classes",
      "All public methods must be documented with JSDoc",
      "Must follow the naming conventions in specifications",
    ],
  };

  const context: ConversionContext = {
    specifications,
    instructions,
    types,
    systemCode,
  };

  const input: ConversionInput = {
    type: "prompt",
    prompt: generationPrompt,
  };

  const converter = createConverter({
    verbose: true,
    copilot: {
      model: "gpt-4.1",
      streaming: true,
      logLevel: "info",
    },
  });

  try {
    const result = await converter.process(context, input);

    console.log("\n" + "-".repeat(60));
    console.log("GENERATION RESULT");
    console.log("-".repeat(60));

    if (result.success) {
      console.log(`✅ Success: ${result.summary}`);
      console.log(`📁 Generated ${result.files.length} file(s)`);

      for (const file of result.files) {
        console.log(`\n--- ${file.path} ---`);
        console.log(file.content);
        if (file.explanation) {
          console.log(`\n📝 ${file.explanation}`);
        }
      }

      if (result.warnings?.length) {
        console.log("\n⚠️ Warnings:");
        result.warnings.forEach((w) => console.log(`  - ${w}`));
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }

    console.log(`\n⏱️ Duration: ${result.metadata.durationMs}ms`);
  } finally {
    await converter.destroy();
  }
}

// =============================================================================
// Main entry point
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? "help";

  switch (command) {
    case "convert":
      await runConversionExample();
      break;
    case "generate":
      await runGenerationExample();
      break;
    case "both":
      await runConversionExample();
      await runGenerationExample();
      break;
    case "help":
    default:
      console.log(`
Logic Converter - Code Conversion/Generation using GitHub Copilot SDK

Usage: npm run convert <command>

Commands:
  convert   - Run the code conversion example
  generate  - Run the code generation example
  both      - Run both examples
  help      - Show this help message

Prerequisites:
  1. GitHub Copilot CLI installed and authenticated
  2. Node.js >= 18.0.0
  3. Run 'npm install' to install dependencies

Examples:
  npm run convert convert    # Convert sample code
  npm run convert generate   # Generate new code
  npm run convert both       # Run both examples
`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
