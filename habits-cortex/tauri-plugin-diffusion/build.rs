fn main() {
    tauri_plugin::Builder::new(&["generate_image", "list_models", "ensure_models_dir", "unload_model"])
        .build();
}
