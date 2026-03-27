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

export interface TauriLibPlugin {
  name: string;
  init: string;
}

/**
 * Tauri Library (Rust)
 * Generates lib.rs for Tauri mobile applications
 */
export function getTauriLib(plugins: TauriLibPlugin[] = []): string {
  // Build plugin init lines
  const pluginInits = plugins.map(p => `        .plugin(${p.init})`).join('\n');
  const pluginSection = pluginInits ? `\n${pluginInits}` : '';

  return `use std::env;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri_plugin_log::{Target, TargetKind};
use log::LevelFilter;

static TEST_MODE: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn get_test_args() -> Option<(String, String)> {
    let args: Vec<String> = env::args().collect();
    let mut habit: Option<String> = None;
    let mut input: Option<String> = None;
    
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--habit" if i + 1 < args.len() => { habit = Some(args[i + 1].clone()); i += 2; }
            "--input" if i + 1 < args.len() => { input = Some(args[i + 1].clone()); i += 2; }
            "--test" => { TEST_MODE.store(true, Ordering::SeqCst); i += 1; }
            _ => { i += 1; }
        }
    }
    
    if TEST_MODE.load(Ordering::SeqCst) && habit.is_some() {
        Some((habit.unwrap(), input.unwrap_or_else(|| "{}".to_string())))
    } else {
        None
    }
}

#[tauri::command]
fn test_complete(result: String) {
    println!("{}", result);
    if TEST_MODE.load(Ordering::SeqCst) {
        std::process::exit(0);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        // Keyring plugin for secure secret storage via system keychain
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_dialog::init())
        // Logging plugin configuration:
        // - Outputs to stdout so logs appear in terminal when running the app
        // - Filters out verbose Tauri internal logs (tao, wry, tracing) 
        // - Custom format shows only the message (no timestamp/level/target prefix)
        //
        // To revert to default verbose format, replace .format(...) block with:
        //   .build())
        // Or for timestamped format:
        //   .format(|out, message, record| {
        //       out.finish(format_args!("[{}][{}] {}", record.target(), record.level(), message))
        //   })
        .plugin(tauri_plugin_log::Builder::new()
            .target(Target::new(TargetKind::Stdout))
            .level(LevelFilter::Trace)
            .level_for("tao", LevelFilter::Warn)
            .level_for("wry", LevelFilter::Warn)
            .level_for("tracing", LevelFilter::Warn)
            .format(|out, message, _record| {
                out.finish(format_args!("{}", message))
            })
            .build())${pluginSection}
        .invoke_handler(tauri::generate_handler![get_test_args, test_complete])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`;
}
