use base64::Engine;
use log::LevelFilter;
use serde::Serialize;
use std::env;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

#[cfg(all(debug_assertions, feature = "debug-tools", desktop))]
mod automation;

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
            "--habit" if i + 1 < args.len() => {
                habit = Some(args[i + 1].clone());
                i += 2;
            }
            "--workflow" if i + 1 < args.len() => {
                workflow = Some(args[i + 1].clone());
                i += 2;
            }
            "--input" if i + 1 < args.len() => {
                input = Some(args[i + 1].clone());
                i += 2;
            }
            "--test" => {
                test = true;
                i += 1;
            }
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

    CliArgs {
        habit,
        test,
        workflow,
        input,
    }
}

#[tauri::command]
fn test_complete(result: String) {
    println!("{}", result);
    if TEST_MODE.load(Ordering::SeqCst) {
        std::process::exit(0);
    }
}

#[tauri::command]
fn debug_log(message: String) {
    println!("[JS] {}", message);
}

/// Result from write_app_data_file command
#[derive(Debug, Clone, Serialize)]
pub struct WriteAppDataFileResult {
    pub success: bool,
    pub path: String,
    pub bytes_written: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Write a file to the app's data directory from base64 content.
/// Takes base64-encoded content and a relative path within app data dir.
/// Creates parent directories if needed.
/// Use append=true starting from chunk 2 to append to existing file (chunked transfer).
#[tauri::command]
async fn write_app_data_file(
    app_handle: tauri::AppHandle,
    base64_content: String,
    relative_path: String,
    append: Option<bool>,
) -> Result<WriteAppDataFileResult, String> {
    use std::fs::{self, OpenOptions};
    use std::io::Write;

    let append_mode = append.unwrap_or(false);

    // Get app data directory
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Build full path
    let full_path = app_data_dir.join(&relative_path);

    // Create parent directories if needed
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directories: {}", e))?;
    }

    // Decode base64
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_content)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let bytes_len = bytes.len();

    // Write or append to file
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .append(append_mode)
        .truncate(!append_mode)
        .open(&full_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    println!(
        "[write_app_data_file] {} {} bytes to {}",
        if append_mode { "Appended" } else { "Wrote" },
        bytes_len,
        full_path.display()
    );

    Ok(WriteAppDataFileResult {
        success: true,
        path: full_path.to_string_lossy().to_string(),
        bytes_written: bytes_len,
        error: None,
    })
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

/// Returns build-time feature flags to the frontend.
/// noExternalHabits: true when compiled with --features no-external-habits.
/// Used for App Store builds (iOS + macOS) where side-loading external habits is not allowed.
#[tauri::command]
fn get_app_config() -> serde_json::Value {
    serde_json::json!({
        "noExternalHabits": cfg!(feature = "no-external-habits")
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Parse CLI args early to set test mode
    let cli_args = parse_cli_args();
    if cli_args.test {
        TEST_MODE.store(true, Ordering::SeqCst);
    }

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_email::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sqlite_vec::init());

    // Add local-ai plugin on all platforms (desktop/iOS: Metal+Accelerate, Android: CPU-only)
    let builder = builder.plugin(tauri_plugin_local_ai::init());

    // Add webdriver plugin only when debug build and feature are both enabled
    #[cfg(all(debug_assertions, feature = "debug-tools"))]
    let builder = builder.plugin(tauri_plugin_webdriver::init());

    // Mobile-only plugins (iOS/Android) - commented out for initial release
    // These require permission declarations in Google Play Console:
    // - wifi: Requires location permission (Android uses location for WiFi scanning)
    // - matter: Requires Bluetooth + Location for device commissioning
    // - sms: Requires SMS permission declaration
    // - system-settings: Has Bluetooth control
    // #[cfg(any(target_os = "ios", target_os = "android"))]
    // let builder = builder
    //     .plugin(tauri_plugin_geolocation::init())
    //     .plugin(tauri_plugin_wifi::init())
    //     .plugin(tauri_plugin_matter::init())
    //     .plugin(tauri_plugin_sms::init())
    //     .plugin(tauri_plugin_system_settings::init());

    builder
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(Target::new(TargetKind::Stdout))
                .level(LevelFilter::Trace)
                .level_for("tao", LevelFilter::Warn)
                .level_for("wry", LevelFilter::Warn)
                .level_for("tracing", LevelFilter::Warn)
                .format(|out, message, _record| out.finish(format_args!("{}", message)))
                .build(),
        )
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            test_complete,
            get_cli_args,
            get_app_config,
            debug_log,
            write_app_data_file
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {
            #[cfg(all(debug_assertions, feature = "debug-tools", desktop))]
            automation::start_automation_server(_app_handle.clone());
        });
}
