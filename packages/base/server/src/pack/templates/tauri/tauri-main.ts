/**
 * Tauri Main Process (Rust)
 * Generates main.rs for Tauri applications
 */

export function getTauriMain(libName: string): string {
  // Convert lib name to valid Rust identifier (underscores)
  const rustLibName = libName.replace(/-/g, '_');
  
  return `// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ${rustLibName}_lib::run();
}
`;
}

/**
 * Tauri Library (Rust)
 * Generates lib.rs for Tauri mobile applications
 */
export function getTauriLib(): string {
  return `// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`;
}
