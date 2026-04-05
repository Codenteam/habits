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
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
