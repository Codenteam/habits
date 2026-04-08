const COMMANDS: &[&str] = &[
    "get_volume",
    "set_volume",
    "set_mute",
    "get_ringer_mode",
    "set_ringer_mode",
    "get_bluetooth_state",
    "set_bluetooth",
    "get_dnd_state",
    "set_dnd",
];

fn main() {
    // Build for Android only - iOS uses WebView JavaScript bridges
    // The swift-rs library has issues targeting iOS from cargo build
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .build();
}
