/**
 * Tauri Build Script Generator
 * Generates build.rs for Tauri applications
 */

export function getTauriBuildScript(): string {
  return `fn main() {
    tauri_build::build()
}
`;
}
