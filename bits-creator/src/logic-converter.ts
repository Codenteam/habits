/**
 * Logic Converter - Core conversion/generation engine using GitHub Copilot SDK
 */

import { CopilotClient, type CopilotSession } from "@github/copilot-sdk";
import type {
  ConversionContext,
  ConversionInput,
  ConversionResult,
  ConverterConfig,
  GeneratedFile,
  GenerationPrompt,
  Instruction,
  SampleCode,
  Specification,
  SystemCode,
  TypeDefinition,
} from "./types.js";


/**
 * LogicConverter - Converts or generates code using GitHub Copilot SDK
 *
 * This class takes specifications, instructions, types, and system code context,
 * then either converts sample code or generates new code based on a prompt.
 */
export class LogicConverter {
  private client: CopilotClient | null = null;
  private session: CopilotSession | null = null;
  private config: ConverterConfig;
  private isInitialized = false;

  constructor(config: Partial<ConverterConfig> = {}) {
    this.config = {
      copilot: {
        model: config.copilot?.model ?? "gpt-4.1",
        streaming: config.copilot?.streaming ?? true,
        logLevel: config.copilot?.logLevel ?? "info",
        ...config.copilot,
      },
      defaultLanguage: config.defaultLanguage ?? "typescript",
      outputDir: config.outputDir ?? "./output",
      autoWrite: config.autoWrite ?? false,
      verbose: config.verbose ?? false,
    };
  }

  /**
   * Initialize the Copilot client and create a session
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.log("Initializing Copilot client...");

    this.client = new CopilotClient({
      cliPath: this.config.copilot.cliPath,
      logLevel: this.config.copilot.logLevel,
    });

    await this.client.start();
    this.log("Copilot client started");

    this.session = await this.client.createSession({
      model: this.config.copilot.model,
      streaming: this.config.copilot.streaming,
      provider: this.config.copilot.provider,
      systemMessage: {
        mode: "append",
        content: this.getBaseSystemMessage(),
      },
    });

    this.log(`Session created: ${this.session.sessionId}`);
    this.isInitialized = true;
  }

  /**
   * Convert sample code based on the provided context
   */
  async convertCode(
    context: ConversionContext,
    input: { type: "code"; code: SampleCode }
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      await this.initialize();

      const prompt = this.buildConversionPrompt(context, input.code);
      this.log("Sending conversion request...");

      if (this.config.verbose) {
        console.log("\n--- Conversion Prompt ---\n");
        console.log(prompt);
        console.log("\n--- End Prompt ---\n");
      }

      const result = await this.sendAndParse(prompt);

      return {
        success: true,
        files: result.files,
        summary: result.summary,
        warnings: result.warnings,
        metadata: {
          durationMs: Date.now() - startTime,
          model: this.config.copilot.model,
        },
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        summary: "Conversion failed",
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          durationMs: Date.now() - startTime,
          model: this.config.copilot.model,
        },
      };
    }
  }

  /**
   * Generate new code based on a prompt and the provided context
   */
  async generateCode(
    context: ConversionContext,
    input: { type: "prompt"; prompt: GenerationPrompt }
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      await this.initialize();

      const prompt = this.buildGenerationPrompt(context, input.prompt);
      this.log("Sending generation request...");

      if (this.config.verbose) {
        console.log("\n--- Generation Prompt ---\n");
        console.log(prompt);
        console.log("\n--- End Prompt ---\n");
      }

      const result = await this.sendAndParse(prompt);

      return {
        success: true,
        files: result.files,
        summary: result.summary,
        warnings: result.warnings,
        metadata: {
          durationMs: Date.now() - startTime,
          model: this.config.copilot.model,
        },
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        summary: "Generation failed",
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          durationMs: Date.now() - startTime,
          model: this.config.copilot.model,
        },
      };
    }
  }

  /**
   * Process any conversion input (code or prompt)
   */
  async process(
    context: ConversionContext,
    input: ConversionInput
  ): Promise<ConversionResult> {
    if (input.type === "code") {
      return this.convertCode(context, input);
    } else {
      return this.generateCode(context, input);
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.session) {
      await this.session.destroy();
      this.session = null;
    }
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }
    this.isInitialized = false;
    this.log("Resources cleaned up");
  }

  // ==========================================================================
  // Private methods
  // ==========================================================================

  private getBaseSystemMessage(): string {
    return `
You are an expert code converter and generator. Your role is to:
1. Analyze provided specifications, instructions, type definitions, and existing system code
2. Convert sample code OR generate new code that strictly adheres to all provided context
3. Produce clean, well-documented, production-ready code

IMPORTANT OUTPUT FORMAT:
- You MUST respond with valid JSON that can be parsed
- Use this exact JSON structure for your response:
{
  "files": [
    {
      "path": "path/to/file.ts",
      "content": "// file content here",
      "language": "typescript",
      "explanation": "Brief explanation of what this file does"
    }
  ],
  "summary": "Overall summary of what was generated/converted",
  "warnings": ["Any warnings or notes about the conversion"]
}

RULES:
- Follow ALL specifications exactly
- Apply ALL instructions that are relevant
- Use ONLY the types provided (or compatible types)
- Match the coding style of existing system code when provided
- Include proper TypeScript types for all generated code
- Add helpful comments where appropriate
- Handle edge cases and error scenarios
- Escape any special characters in the JSON string values properly
`;
  }

  private buildConversionPrompt(
    context: ConversionContext,
    code: SampleCode
  ): string {
    const sections: string[] = [];

    // Add specifications
    if (context.specifications.length > 0) {
      sections.push(this.formatSpecifications(context.specifications));
    }

    // Add instructions (filter for conversion-relevant ones)
    const relevantInstructions = context.instructions.filter(
      (i) => !i.appliesTo || i.appliesTo === "always" || i.appliesTo === "conversion"
    );
    if (relevantInstructions.length > 0) {
      sections.push(this.formatInstructions(relevantInstructions));
    }

    // Add type definitions
    if (context.types.length > 0) {
      sections.push(this.formatTypes(context.types));
    }

    // Add system code for reference
    if (context.systemCode.length > 0) {
      sections.push(this.formatSystemCode(context.systemCode));
    }

    // Add additional context if provided
    if (context.additionalContext) {
      sections.push(`## Additional Context\n\n${context.additionalContext}`);
    }

    // Add the code to convert
    sections.push(`## Code to Convert

**Source Language:** ${code.sourceLanguage}
**Target Language:** ${code.targetLanguage ?? this.config.defaultLanguage}
${code.filePath ? `**Original File:** ${code.filePath}` : ""}
${code.conversionNotes ? `**Conversion Notes:** ${code.conversionNotes}` : ""}

\`\`\`${code.sourceLanguage}
${code.content}
\`\`\`

Please convert this code to adhere to all the specifications, instructions, and types provided above.
Respond with valid JSON in the format specified in your system instructions.`);

    return sections.join("\n\n---\n\n");
  }

  private buildGenerationPrompt(
    context: ConversionContext,
    prompt: GenerationPrompt
  ): string {
    const sections: string[] = [];

    // Add specifications
    if (context.specifications.length > 0) {
      sections.push(this.formatSpecifications(context.specifications));
    }

    // Add instructions (filter for generation-relevant ones)
    const relevantInstructions = context.instructions.filter(
      (i) => !i.appliesTo || i.appliesTo === "always" || i.appliesTo === "generation"
    );
    if (relevantInstructions.length > 0) {
      sections.push(this.formatInstructions(relevantInstructions));
    }

    // Add type definitions
    if (context.types.length > 0) {
      sections.push(this.formatTypes(context.types));
    }

    // Add system code for reference
    if (context.systemCode.length > 0) {
      sections.push(this.formatSystemCode(context.systemCode));
    }

    // Add additional context if provided
    if (context.additionalContext) {
      sections.push(`## Additional Context\n\n${context.additionalContext}`);
    }

    // Add the generation request
    const featuresSection = prompt.features?.length
      ? `\n**Required Features:**\n${prompt.features.map((f: string) => `- ${f}`).join("\n")}`
      : "";

    const constraintsSection = prompt.constraints?.length
      ? `\n**Constraints:**\n${prompt.constraints.map((c: string) => `- ${c}`).join("\n")}`
      : "";

    const outputPathsSection = prompt.outputPaths?.length
      ? `\n**Suggested Output Files:**\n${prompt.outputPaths.map((p: string) => `- ${p}`).join("\n")}`
      : "";

    sections.push(`## Generation Request

**Description:** ${prompt.description}
**Target Language:** ${prompt.language ?? this.config.defaultLanguage}
${featuresSection}
${constraintsSection}
${outputPathsSection}

Please generate code that fulfills this request while adhering to all the specifications, instructions, and types provided above.
Respond with valid JSON in the format specified in your system instructions.`);

    return sections.join("\n\n---\n\n");
  }

  private formatSpecifications(specs: Specification[]): string {
    const sortedSpecs = [...specs].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    const specTexts = sortedSpecs.map(
      (spec) => `### ${spec.name}${spec.category ? ` (${spec.category})` : ""}

${spec.description}

${spec.content}`
    );

    return `## Specifications\n\n${specTexts.join("\n\n")}`;
  }

  private formatInstructions(instructions: Instruction[]): string {
    const instructionTexts = instructions.map((inst) => {
      let text = `### ${inst.name}\n\n${inst.content}`;
      if (inst.examples?.length) {
        text += `\n\n**Examples:**\n${inst.examples.map((e) => `\`\`\`\n${e}\n\`\`\``).join("\n")}`;
      }
      return text;
    });

    return `## Instructions\n\n${instructionTexts.join("\n\n")}`;
  }

  private formatTypes(types: TypeDefinition[]): string {
    const typeTexts = types.map(
      (t) => `### ${t.name}${t.description ? ` - ${t.description}` : ""}
${t.sourcePath ? `*Source: ${t.sourcePath}*\n` : ""}
\`\`\`typescript
${t.definition}
\`\`\``
    );

    return `## Type Definitions\n\n${typeTexts.join("\n\n")}`;
  }

  private formatSystemCode(code: SystemCode[]): string {
    const codeTexts = code.map(
      (c) => `### ${c.path}${c.description ? ` - ${c.description}` : ""}

\`\`\`${c.language}
${c.content}
\`\`\``
    );

    return `## Existing System Code (for reference)\n\n${codeTexts.join("\n\n")}`;
  }

  private async sendAndParse(prompt: string): Promise<{
    files: GeneratedFile[];
    summary: string;
    warnings?: string[];
  }> {
    if (!this.session) {
      throw new Error("Session not initialized");
    }

    // Set up streaming output if enabled
    let fullResponse = "";

    if (this.config.copilot.streaming) {
      this.session.on("assistant.message_delta", (event: { data: { deltaContent: string } }) => {
        if (this.config.verbose) {
          process.stdout.write(event.data.deltaContent);
        }
        fullResponse += event.data.deltaContent;
      });
    }

    const response = await this.session.sendAndWait({ prompt });

    if (!response) {
      throw new Error("No response received from Copilot");
    }

    const content = response.data.content;
    if (!content) {
      throw new Error("Empty response content from Copilot");
    }

    // Parse the JSON response
    return this.parseResponse(content);
  }

  private parseResponse(content: string): {
    files: GeneratedFile[];
    summary: string;
    warnings?: string[];
  } {
    // Try to extract JSON from the response
    // The response might have markdown code blocks or other text around it
    let jsonStr = content;

    // Try to find JSON in code blocks
    const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON object
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }

    try {
      const parsed = JSON.parse(jsonStr);

      // Validate the structure
      if (!Array.isArray(parsed.files)) {
        throw new Error("Response missing 'files' array");
      }

      return {
        files: parsed.files.map((f: unknown) => {
          const file = f as Record<string, unknown>;
          return {
            path: String(file.path ?? "output.ts"),
            content: String(file.content ?? ""),
            language: String(file.language ?? "typescript"),
            explanation: file.explanation ? String(file.explanation) : undefined,
          };
        }),
        summary: String(parsed.summary ?? "Code generated successfully"),
        warnings: Array.isArray(parsed.warnings)
          ? parsed.warnings.map(String)
          : undefined,
      };
    } catch (error) {
      // If JSON parsing fails, try to extract code blocks as files
      this.log("Failed to parse JSON response, attempting fallback extraction...");

      const codeBlocks = this.extractCodeBlocks(content);
      if (codeBlocks.length > 0) {
        return {
          files: codeBlocks,
          summary: "Code extracted from response (JSON parsing failed)",
          warnings: ["Response was not valid JSON, code extracted from markdown blocks"],
        };
      }

      throw new Error(
        `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private extractCodeBlocks(content: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] ?? "typescript";
      const code = match[2];

      // Skip JSON blocks
      if (language.toLowerCase() === "json") continue;

      files.push({
        path: `output-${index}.${this.getExtension(language)}`,
        content: code.trim(),
        language,
      });
      index++;
    }

    return files;
  }

  private getExtension(language: string): string {
    const extensions: Record<string, string> = {
      typescript: "ts",
      javascript: "js",
      python: "py",
      rust: "rs",
      go: "go",
      java: "java",
      csharp: "cs",
      cpp: "cpp",
      c: "c",
      ruby: "rb",
      php: "php",
      swift: "swift",
      kotlin: "kt",
      scala: "scala",
    };
    return extensions[language.toLowerCase()] ?? language;
  }

  private log(message: string): void {
    if (this.config.verbose || this.config.copilot.logLevel === "debug") {
      console.log(`[LogicConverter] ${message}`);
    }
  }
}

/**
 * Factory function to create a LogicConverter instance
 */
export function createConverter(
  config?: Partial<ConverterConfig>
): LogicConverter {
  return new LogicConverter(config);
}
