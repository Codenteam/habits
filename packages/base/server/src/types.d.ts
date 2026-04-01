// Global type declarations for raw text imports
// Files matching *.local.txt are loaded as text by esbuild
declare module '*.local.txt' {
  const content: string;
  export default content;
}
