const COMMANDS: &[&str] = &[
    "ensure_tables",
    "vector_insert",
    "vector_search",
    "vector_delete",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
