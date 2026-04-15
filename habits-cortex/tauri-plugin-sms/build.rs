const COMMANDS: &[&str] = &[
    "send_sms",
    "read_sms",
    "check_permissions",
    "request_permissions",
];

fn main() {
    // Build for Android only - iOS uses WebView JavaScript bridges
    // The swift-rs library has issues targeting iOS from cargo build
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .build();
}
