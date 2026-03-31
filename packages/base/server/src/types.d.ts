// Global type declarations for raw text imports
// Files matching *.local.js are loaded as text by esbuild
declare module '*.local.js' {
  const content: string;
  export default content;
}
