/**
 * Directory Loaders - Load specs, instructions, types, and code from directories
 */

import * as fs from "fs";
import * as path from "path";
import type {
  ConversionContext,
  Instruction,
  Specification,
  SystemCode,
  TypeDefinition,
} from "./types.js";

// =============================================================================
// File System Utilities
// =============================================================================

/**
 * Recursively get all files in a directory
 */
export function getAllFiles(
  dirPath: string,
  extensions?: string[],
  arrayOfFiles: string[] = []
): string[] {
  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip common non-source directories
      if (!["node_modules", ".git", "dist", "build", ".next", "__pycache__"].includes(file)) {
        getAllFiles(fullPath, extensions, arrayOfFiles);
      }
    } else {
      if (!extensions || extensions.some((ext) => file.endsWith(ext))) {
        arrayOfFiles.push(fullPath);
      }
    }
  }

  return arrayOfFiles;
}

/**
 * Detect language from file extension
 */
export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".cs": "csharp",
    ".cpp": "cpp",
    ".c": "c",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".md": "markdown",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
  };
  return languageMap[ext] ?? "text";
}

// =============================================================================
// Specification Loaders
// =============================================================================

/**
 * Load specifications from a directory.
 * 
 * Supports:
 * - .md files: Title from first # heading, content is the rest
 * - .json files: Direct specification objects or arrays
 * - .yaml/.yml files: Same as JSON (requires parsing)
 * 
 * @param specsDir - Path to directory containing spec files
 * @param options - Loading options
 */
export function loadSpecsFromDirectory(
  specsDir: string,
  options: {
    /** File extensions to load (default: ['.md', '.json']) */
    extensions?: string[];
    /** Default category for specs */
    defaultCategory?: string;
  } = {}
): Specification[] {
  const { extensions = [".md", ".json", ".txt"], defaultCategory = "general" } = options;

  if (!fs.existsSync(specsDir)) {
    console.warn(`Specs directory not found: ${specsDir}`);
    return [];
  }

  const files = getAllFiles(specsDir, extensions);
  const specs: Specification[] = [];

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const relativePath = path.relative(specsDir, filePath);
    const fileName = path.basename(filePath, ext);

    try {
      const content = fs.readFileSync(filePath, "utf-8");

      if (ext === ".json") {
        // JSON file - can be a single spec or array of specs
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          specs.push(...parsed);
        } else {
          specs.push({
            id: parsed.id ?? `spec-${fileName}`,
            name: parsed.name ?? fileName,
            description: parsed.description ?? `Specification from ${relativePath}`,
            content: parsed.content ?? content,
            category: parsed.category ?? defaultCategory,
            priority: parsed.priority,
          });
        }
      } else if (ext === ".md" || ext === ".txt") {
        // Markdown/text file - extract title from first heading
        const lines = content.split("\n");
        let name = fileName;
        let description = `Specification from ${relativePath}`;
        let specContent = content;

        // Try to extract title from first # heading
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          name = titleMatch[1].trim();
          // Remove the title line from content
          specContent = content.replace(/^#\s+.+\n?/, "").trim();
        }

        // Try to extract description from first paragraph
        const firstParagraph = specContent.split("\n\n")[0];
        if (firstParagraph && firstParagraph.length < 200) {
          description = firstParagraph.replace(/\n/g, " ").trim();
        }

        // Derive category from subdirectory
        const category = path.dirname(relativePath);

        specs.push({
          id: `spec-${fileName}`,
          name,
          description,
          content: specContent,
          category: category !== "." ? category : defaultCategory,
        });
      }
    } catch (error) {
      console.warn(`Failed to load spec from ${filePath}:`, error);
    }
  }

  return specs;
}

/**
 * Load instructions from a directory
 */
export function loadInstructionsFromDirectory(
  instructionsDir: string,
  options: {
    extensions?: string[];
    defaultAppliesTo?: "always" | "conversion" | "generation";
  } = {}
): Instruction[] {
  const { extensions = [".md", ".json", ".txt"], defaultAppliesTo = "always" } = options;

  if (!fs.existsSync(instructionsDir)) {
    console.warn(`Instructions directory not found: ${instructionsDir}`);
    return [];
  }

  const files = getAllFiles(instructionsDir, extensions);
  const instructions: Instruction[] = [];

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath, ext);

    try {
      const content = fs.readFileSync(filePath, "utf-8");

      if (ext === ".json") {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          instructions.push(...parsed);
        } else {
          instructions.push({
            id: parsed.id ?? `inst-${fileName}`,
            name: parsed.name ?? fileName,
            content: parsed.content ?? content,
            appliesTo: parsed.appliesTo ?? defaultAppliesTo,
            examples: parsed.examples,
          });
        }
      } else {
        // Markdown/text - name from heading or filename
        let name = fileName;
        let instContent = content;

        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          name = titleMatch[1].trim();
          instContent = content.replace(/^#\s+.+\n?/, "").trim();
        }

        // Check for appliesTo hint in filename
        let appliesTo = defaultAppliesTo;
        if (fileName.includes("conversion")) appliesTo = "conversion";
        else if (fileName.includes("generation")) appliesTo = "generation";

        instructions.push({
          id: `inst-${fileName}`,
          name,
          content: instContent,
          appliesTo,
        });
      }
    } catch (error) {
      console.warn(`Failed to load instruction from ${filePath}:`, error);
    }
  }

  return instructions;
}

// =============================================================================
// Type Definition Loaders
// =============================================================================

/**
 * Load type definitions from TypeScript files in a directory
 */
export function loadTypesFromDirectory(typesDir: string): TypeDefinition[] {
  if (!fs.existsSync(typesDir)) {
    console.warn(`Types directory not found: ${typesDir}`);
    return [];
  }

  const files = getAllFiles(typesDir, [".ts", ".tsx", ".d.ts"]);
  const types: TypeDefinition[] = [];

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const relativePath = path.relative(typesDir, filePath);

      // Extract interface and type definitions
      const interfaceRegex = /(?:\/\*\*[\s\S]*?\*\/\s*)?(export\s+)?interface\s+(\w+)[\s\S]*?(?=\n(?:export\s+)?(?:interface|type|class|const|function|enum)|$)/g;
      const typeRegex = /(?:\/\*\*[\s\S]*?\*\/\s*)?(export\s+)?type\s+(\w+)\s*=[\s\S]*?(?=\n(?:export\s+)?(?:interface|type|class|const|function|enum)|$)/g;

      let match;

      // Extract interfaces
      while ((match = interfaceRegex.exec(content)) !== null) {
        const name = match[2];
        const definition = match[0].trim();

        // Extract description from JSDoc if present
        const jsdocMatch = definition.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
        const description = jsdocMatch
          ? jsdocMatch[1].replace(/\s*\*\s*/g, " ").trim()
          : undefined;

        types.push({
          name,
          definition,
          description,
          sourcePath: relativePath,
        });
      }

      // Extract type aliases
      while ((match = typeRegex.exec(content)) !== null) {
        const name = match[2];
        const definition = match[0].trim();

        const jsdocMatch = definition.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
        const description = jsdocMatch
          ? jsdocMatch[1].replace(/\s*\*\s*/g, " ").trim()
          : undefined;

        types.push({
          name,
          definition,
          description,
          sourcePath: relativePath,
        });
      }
    } catch (error) {
      console.warn(`Failed to load types from ${filePath}:`, error);
    }
  }

  return types;
}

// =============================================================================
// System Code Loaders
// =============================================================================

/**
 * Load existing system code from a directory
 */
export function loadCodeFromDirectory(
  codeDir: string,
  options: {
    /** File extensions to include */
    extensions?: string[];
    /** Maximum file size in bytes (default: 100KB) */
    maxFileSize?: number;
    /** Files/patterns to exclude */
    exclude?: string[];
  } = {}
): SystemCode[] {
  const {
    extensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java"],
    maxFileSize = 100 * 1024,
    exclude = ["*.test.*", "*.spec.*", "*.min.*"],
  } = options;

  if (!fs.existsSync(codeDir)) {
    console.warn(`Code directory not found: ${codeDir}`);
    return [];
  }

  const files = getAllFiles(codeDir, extensions);
  const systemCode: SystemCode[] = [];

  for (const filePath of files) {
    const relativePath = path.relative(codeDir, filePath);

    // Check exclusions
    if (exclude.some((pattern) => {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      return regex.test(relativePath);
    })) {
      continue;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.size > maxFileSize) {
        console.warn(`Skipping large file: ${relativePath} (${stat.size} bytes)`);
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const language = detectLanguage(filePath);

      // Try to extract a description from file header comment
      let description: string | undefined;
      const headerMatch = content.match(/^\/\*\*\s*([\s\S]*?)\s*\*\//);
      if (headerMatch) {
        description = headerMatch[1]
          .replace(/\s*\*\s*/g, " ")
          .trim()
          .slice(0, 200);
      }

      systemCode.push({
        path: relativePath,
        content,
        language,
        description,
      });
    } catch (error) {
      console.warn(`Failed to load code from ${filePath}:`, error);
    }
  }

  return systemCode;
}

// =============================================================================
// Combined Context Loader
// =============================================================================

export interface DirectoryConfig {
  /** Directory containing specification files (.md, .json) */
  specsDir?: string;
  /** Directory containing instruction files */
  instructionsDir?: string;
  /** Directory containing type definition files (.ts) */
  typesDir?: string;
  /** Directory containing existing system code */
  codeDir?: string;
  /** Additional context as a string or file path */
  additionalContext?: string;
}

/**
 * Load a complete ConversionContext from directories
 * 
 * @example
 * ```typescript
 * const context = await loadContextFromDirectories({
 *   specsDir: './specs',
 *   instructionsDir: './instructions',
 *   typesDir: './src/types',
 *   codeDir: './src',
 * });
 * ```
 */
export function loadContextFromDirectories(config: DirectoryConfig): ConversionContext {
  const specs = config.specsDir ? loadSpecsFromDirectory(config.specsDir) : [];
  const instructions = config.instructionsDir
    ? loadInstructionsFromDirectory(config.instructionsDir)
    : [];
  const types = config.typesDir ? loadTypesFromDirectory(config.typesDir) : [];
  const systemCode = config.codeDir ? loadCodeFromDirectory(config.codeDir) : [];

  let additionalContext = config.additionalContext;
  // If additionalContext looks like a file path, try to read it
  if (additionalContext && fs.existsSync(additionalContext)) {
    additionalContext = fs.readFileSync(additionalContext, "utf-8");
  }

  console.log(`Loaded context:
  - ${specs.length} specifications
  - ${instructions.length} instructions
  - ${types.length} type definitions
  - ${systemCode.length} system code files`);

  return {
    specifications: specs,
    instructions,
    types,
    systemCode,
    additionalContext,
  };
}

/**
 * Load code to convert from a file or directory
 */
export function loadInputCode(
  inputPath: string,
  options: {
    targetLanguage?: string;
    conversionNotes?: string;
  } = {}
): { type: "code"; code: import("./types.js").SampleCode }[] {
  const stat = fs.statSync(inputPath);
  const inputs: { type: "code"; code: import("./types.js").SampleCode }[] = [];

  if (stat.isFile()) {
    const content = fs.readFileSync(inputPath, "utf-8");
    inputs.push({
      type: "code",
      code: {
        content,
        sourceLanguage: detectLanguage(inputPath),
        targetLanguage: options.targetLanguage ?? "typescript",
        filePath: inputPath,
        conversionNotes: options.conversionNotes,
      },
    });
  } else if (stat.isDirectory()) {
    const files = getAllFiles(inputPath);
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf-8");
      inputs.push({
        type: "code",
        code: {
          content,
          sourceLanguage: detectLanguage(filePath),
          targetLanguage: options.targetLanguage ?? "typescript",
          filePath: path.relative(inputPath, filePath),
          conversionNotes: options.conversionNotes,
        },
      });
    }
  }

  return inputs;
}
