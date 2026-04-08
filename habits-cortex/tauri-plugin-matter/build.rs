const COMMANDS: &[&str] = &[
    "discover_devices",
    "get_devices",
    "get_device_state",
    "set_on_off",
    "set_level",
    "set_color",
    "commission_device",
    "remove_device",
];

fn main() {
    // Build for Android only - iOS uses WebView JavaScript bridges
    // The swift-rs library has issues targeting iOS from cargo build
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .build();
}
