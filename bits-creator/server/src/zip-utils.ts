import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Zip a directory to a buffer
 * @param dirPath - The path to the directory to zip
 * @returns Promise with the zip buffer
 */
export async function zipDirectory(dirPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    archive.directory(dirPath, false);
    archive.finalize();
  });
}

/**
 * Zip specific files to a buffer
 * @param files - Array of { name, content } objects
 * @returns Promise with the zip buffer
 */
export async function zipFiles(
  files: Array<{ name: string; content: string | Buffer }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }

    archive.finalize();
  });
}

/**
 * Get the hello-world example directory path
 */
export function getHelloWorldExamplePath(): string {
  // Navigate from bits-creator/server/src to examples/hello-world
  // __dirname = bits-creator/server/src
  // workspaceRoot = ../../.. = habits (3 levels up)
  const workspaceRoot = path.resolve(__dirname, "../../..");
  return path.join(workspaceRoot, "examples", "hello-world");
}

/**
 * Get hello-world example files as array
 */
export async function getHelloWorldFiles(): Promise<
  Array<{ name: string; content: string }>
> {
  const examplePath = getHelloWorldExamplePath();
  const files: Array<{ name: string; content: string }> = [];

  const fileNames = ["habit.yaml", "stack.yaml", "habit.test.yaml"];

  for (const fileName of fileNames) {
    const filePath = path.join(examplePath, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      files.push({ name: fileName, content });
    }
  }

  return files;
}
