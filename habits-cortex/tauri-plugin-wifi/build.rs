const COMMANDS: &[&str] = &[
    "get_current_network",
    "is_connected",
    "list_saved_networks",
    "check_permissions",
    "request_permissions",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
