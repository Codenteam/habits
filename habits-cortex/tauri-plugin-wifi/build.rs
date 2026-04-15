const COMMANDS: &[&str] = &[
    "get_current_network",
    "is_connected",
    "list_saved_networks",
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
