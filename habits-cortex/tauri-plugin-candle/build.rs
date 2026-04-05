const COMMANDS: &[&str] = &[
    "chat",
    "vision_chat",
    "generate_image",
    "list_models",
    "ensure_models_dir",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
