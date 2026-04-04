const COMMANDS: &[&str] = &[
    "load_model",
    "unload_model",
    "chat",
    "list_models",
    "install_model",
    "get_model_info",
    "ensure_models_dir",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
