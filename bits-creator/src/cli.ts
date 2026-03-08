#!/usr/bin/env tsx
/**
 * CLI - Command-line interface for the Logic Converter
 * 
 * Run with directories:
 *   npx tsx src/cli.ts --specs ./specs --code ./src --prompt "Create a user service"
 *   npx tsx src/cli.ts --specs ./specs --code ./src --convert ./legacy-code
 */

import * as fs from "fs";
import * as path from "path";
import { createConverter } from "./logic-converter.js";
import {
  loadContextFromDirectories,
  loadInputCode,
  type DirectoryConfig,
} from "./loaders.js";
import type { ConversionResult, GenerationPrompt } from "./types.js";

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CliArgs {
  // Context directories
  specsDir?: string;
  instructionsDir?: string;
  typesDir?: string;
  codeDir?: string;
  additionalContext?: string;

  // Input
  convertPath?: string;  // Path to code to convert
  prompt?: string;       // Generation prompt

  // Options
  outputDir?: string;
  model?: string;
  verbose?: boolean;
  dryRun?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--specs":
      case "-s":
        result.specsDir = nextArg;
        i++;
        break;
      case "--instructions":
      case "-i":
        result.instructionsDir = nextArg;
        i++;
        break;
      case "--types":
      case "-t":
        result.typesDir = nextArg;
        i++;
        break;
      case "--code":
      case "-c":
        result.codeDir = nextArg;
        i++;
        break;
      case "--context":
        result.additionalContext = nextArg;
        i++;
        break;
      case "--convert":
        result.convertPath = nextArg;
        i++;
        break;
      case "--prompt":
      case "-p":
        result.prompt = nextArg;
        i++;
        break;
      case "--output":
      case "-o":
        result.outputDir = nextArg;
        i++;
        break;
      case "--model":
      case "-m":
        result.model = nextArg;
        i++;
        break;
      case "--verbose":
      case "-v":
        result.verbose = true;
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        Logic Converter CLI                                     ║
║           Convert or generate code using GitHub Copilot SDK                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  npx tsx src/cli.ts [options]

CONTEXT OPTIONS (define what rules the generated code should follow):
  --specs, -s <dir>          Directory containing specification files (.md, .json)
  --instructions, -i <dir>   Directory containing instruction files
  --types, -t <dir>          Directory containing TypeScript type definitions
  --code, -c <dir>           Directory containing existing system code for reference
  --context <file>           Additional context (file path or inline text)

INPUT OPTIONS (what to convert or generate):
  --convert <path>           Convert code from file or directory
  --prompt, -p <text>        Generate code from a natural language prompt

OUTPUT OPTIONS:
  --output, -o <dir>         Output directory for generated files (default: ./output)
  --dry-run                  Show what would be generated without writing files

OTHER OPTIONS:
  --model, -m <model>        Model to use (default: gpt-4.1)
  --verbose, -v              Enable verbose logging
  --help, -h                 Show this help message

EXAMPLES:

  1. Generate code based on specs and a prompt:
     npx tsx src/cli.ts \\
       --specs ./specs \\
       --types ./src/types \\
       --prompt "Create a UserService with CRUD operations"

  2. Convert legacy code to match specs:
     npx tsx src/cli.ts \\
       --specs ./specs \\
       --code ./src \\
       --convert ./legacy/old-handlers.js \\
       --output ./src/handlers

  3. Generate with existing code context:
     npx tsx src/cli.ts \\
       --specs ./docs/specs \\
       --instructions ./docs/instructions \\
       --types ./src/types \\
       --code ./src \\
       --prompt "Add authentication middleware" \\
       --verbose

DIRECTORY STRUCTURE:

  specs/                     # Specification files
  ├── api-format.md          # Markdown specs (title from # heading)
  ├── error-handling.md
  └── naming-conventions.json # JSON specs

  instructions/              # Instruction files  
  ├── typescript-strict.md
  └── documentation.md

  types/                     # TypeScript type definitions
  ├── api.ts
  └── user.ts

  src/                       # Existing code for reference
  ├── utils/
  └── services/

FILE FORMATS:

  Markdown specs (.md):
    # API Response Format
    
    All API responses must follow this structure:
    - Success: { success: true, data: T }
    - Error: { success: false, error: { code, message } }

  JSON specs (.json):
    {
      "id": "spec-api",
      "name": "API Format",
      "description": "Standard API response format",
      "content": "All responses must...",
      "category": "API",
      "priority": 10
    }
`);
}

// =============================================================================
// Main CLI
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || process.argv.length <= 2) {
    printHelp();
    return;
  }

  // Validate we have either --convert or --prompt
  if (!args.convertPath && !args.prompt) {
    console.error("❌ Error: You must specify either --convert <path> or --prompt <text>");
    console.error("   Run with --help for usage information.");
    process.exit(1);
  }

  // Load context from directories
  console.log("\n📂 Loading context from directories...\n");

  const directoryConfig: DirectoryConfig = {
    specsDir: args.specsDir,
    instructionsDir: args.instructionsDir,
    typesDir: args.typesDir,
    codeDir: args.codeDir,
    additionalContext: args.additionalContext,
  };

  const context = loadContextFromDirectories(directoryConfig);

  // Check if we have any context
  const hasContext =
    context.specifications.length > 0 ||
    context.instructions.length > 0 ||
    context.types.length > 0 ||
    context.systemCode.length > 0;

  if (!hasContext) {
    console.warn("⚠️  Warning: No context loaded. Consider providing --specs, --types, or --code directories.");
  }

  // Create converter
  const converter = createConverter({
    verbose: args.verbose,
    outputDir: args.outputDir ?? "./output",
    copilot: {
      model: args.model ?? "gpt-4.1",
      streaming: true,
      logLevel: args.verbose ? "debug" : "info",
    },
  });

  try {
    let results: ConversionResult[] = [];

    if (args.convertPath) {
      // Convert existing code
      console.log(`\n🔄 Converting code from: ${args.convertPath}\n`);

      const inputs = loadInputCode(args.convertPath, {
        targetLanguage: "typescript",
      });

      console.log(`   Found ${inputs.length} file(s) to convert\n`);

      for (const input of inputs) {
        console.log(`   Converting: ${input.code.filePath}`);
        const result = await converter.process(context, input);
        results.push(result);
      }
    } else if (args.prompt) {
      // Generate from prompt
      console.log(`\n✨ Generating code from prompt:\n   "${args.prompt}"\n`);

      const generationPrompt: GenerationPrompt = {
        description: args.prompt,
        language: "typescript",
      };

      const result = await converter.process(context, {
        type: "prompt",
        prompt: generationPrompt,
      });
      results.push(result);
    }

    // Process results
    console.log("\n" + "═".repeat(60));
    console.log("RESULTS");
    console.log("═".repeat(60) + "\n");

    const outputDir = args.outputDir ?? "./output";

    for (const result of results) {
      if (result.success) {
        console.log(`✅ ${result.summary}`);
        console.log(`   Generated ${result.files.length} file(s)\n`);

        for (const file of result.files) {
          const outputPath = path.join(outputDir, file.path);
          
          console.log(`   📄 ${file.path}`);
          if (file.explanation) {
            console.log(`      ${file.explanation}`);
          }

          if (!args.dryRun) {
            // Ensure directory exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(outputPath, file.content);
            console.log(`      → Written to: ${outputPath}`);
          } else {
            console.log(`      → (dry-run) Would write to: ${outputPath}`);
          }
          console.log();
        }

        if (result.warnings?.length) {
          console.log("   ⚠️  Warnings:");
          result.warnings.forEach((w) => console.log(`      - ${w}`));
        }
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }

      console.log(`   ⏱️  Duration: ${result.metadata.durationMs}ms\n`);
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalFiles = results.reduce((sum, r) => sum + r.files.length, 0);

    console.log("─".repeat(60));
    console.log(`Summary: ${successful} succeeded, ${failed} failed, ${totalFiles} files generated`);
    
    if (!args.dryRun && totalFiles > 0) {
      console.log(`Output directory: ${path.resolve(outputDir)}`);
    }

  } finally {
    await converter.destroy();
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
