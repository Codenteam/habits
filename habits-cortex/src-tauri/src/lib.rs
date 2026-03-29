use tauri_plugin_log::{Target, TargetKind};
use log::LevelFilter;
use std::sync::atomic::{AtomicBool, Ordering};
use std::env;
use std::path::Path;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{Manager, Emitter};

static TEST_MODE: AtomicBool = AtomicBool::new(false);
// Store file opened via file association (for Opened event)
static OPENED_FILE: Mutex<Option<String>> = Mutex::new(None);

/// CLI arguments for habits-cortex (parsed manually like standalone tauri pack)
#[derive(Debug, Clone, Serialize)]
pub struct CliArgs {
    pub habit: Option<String>,
    pub test: bool,
    pub workflow: Option<String>,
    pub input: Option<String>,
}

/// Parse CLI arguments manually (consistent with standalone tauri pack template)
fn parse_cli_args() -> CliArgs {
    let args: Vec<String> = env::args().collect();
    let mut habit: Option<String> = None;
    let mut workflow: Option<String> = None;
    let mut input: Option<String> = None;
    let mut test = false;
    
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--habit" if i + 1 < args.len() => { habit = Some(args[i + 1].clone()); i += 2; }
            "--workflow" if i + 1 < args.len() => { workflow = Some(args[i + 1].clone()); i += 2; }
            "--input" if i + 1 < args.len() => { input = Some(args[i + 1].clone()); i += 2; }
            "--test" => { test = true; i += 1; }
            arg => {
                // Check for .habit file passed directly (file association on Windows/Linux)
                if arg.ends_with(".habit") && habit.is_none() {
                    let path = Path::new(arg);
                    if path.exists() {
                        habit = Some(arg.to_string());
                    }
                }
                i += 1;
            }
        }
    }
    
    // Also check if a file was opened via file association
    if habit.is_none() {
        if let Ok(guard) = OPENED_FILE.lock() {
            if let Some(ref file) = *guard {
                habit = Some(file.clone());
            }
        }
    }
    
    CliArgs { habit, test, workflow, input }
}

#[tauri::command]
fn test_complete(result: String) {
    println!("{}", result);
    if TEST_MODE.load(Ordering::SeqCst) {
        std::process::exit(0);
    }
}

#[tauri::command]
fn get_cli_args() -> Option<CliArgs> {
    let args = parse_cli_args();
    if args.habit.is_some() || args.test {
        Some(args)
    } else {
        None
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Parse CLI args early to set test mode
    let cli_args = parse_cli_args();
    if cli_args.test {
        TEST_MODE.store(true, Ordering::SeqCst);
    }
    
    tauri::Builder::default()
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_email::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_log::Builder::new()
            .target(Target::new(TargetKind::Stdout))
            .level(LevelFilter::Trace)
            .level_for("tao", LevelFilter::Warn)
            .level_for("wry", LevelFilter::Warn)
            .level_for("tracing", LevelFilter::Warn)
            .format(|out, message, _record| {
                out.finish(format_args!("{}", message))
            })
            .build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![test_complete, get_cli_args])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {
            // Handle file associations (Opened event when file is opened with app)
            // Only available on desktop platforms
            #[cfg(desktop)]
            if let tauri::RunEvent::Opened { urls } = &_event {
                for url in urls {
                    // Convert file:// URL to path
                    if let Ok(path) = url.to_file_path() {
                        if let Some(path_str) = path.to_str() {
                            if path_str.ends_with(".habit") {
                                // Store the opened file path
                                if let Ok(mut guard) = OPENED_FILE.lock() {
                                    *guard = Some(path_str.to_string());
                                }
                                // Emit event to frontend so it can reload
                                if let Some(window) = _app_handle.get_webview_window("main") {
                                    let _ = window.emit("habit-file-opened", path_str);
                                }
                            }
                        }
                    }
                }
            }
        });
}
