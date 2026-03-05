/**
 * Tauri Cargo.toml Generator
 * Generates Cargo.toml for Tauri applications
 */

export interface TauriCargoOptions {
  appName: string;
  version?: string;
}

export function getTauriCargo(options: TauriCargoOptions): string {
  const { appName, version = '1.0.0' } = options;
  const packageName = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return `[package]
name = "${packageName}"
version = "${version}"
description = "${appName} - Habits Desktop App"
authors = ["you"]
license = ""
repository = ""
edition = "2021"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[lib]
name = "${packageName.replace(/-/g, '_')}_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[[bin]]
name = "${packageName}"
path = "src/main.rs"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-http = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[features]
# This feature is used for production builds or when a different method of serving the content is used
# DO NOT REMOVE!!
custom-protocol = ["tauri/custom-protocol"]
`;
}
