/**
 * Tauri Cargo.toml Generator
 * Generates Cargo.toml for Tauri applications
 */

export interface TauriCargoPlugin {
  name: string;
  cargo: string;
}

export interface TauriCargoOptions {
  appName: string;
  version?: string;
  /** Additional Tauri plugins required by bits */
  plugins?: TauriCargoPlugin[];
}

export function getTauriCargo(options: TauriCargoOptions): string {
  const { appName, version = '1.0.0', plugins = [] } = options;
  const packageName = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Build plugin dependencies
  const pluginDeps = plugins.map(p => p.cargo).join('\n');
  const pluginSection = pluginDeps ? `\n${pluginDeps}` : '';

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
tauri-plugin-log = "2"
tauri-plugin-keyring = "0.1"
tauri-plugin-dialog = "2"
log = "0.4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"${pluginSection}

[features]
# This feature is used for production builds or when a different method of serving the content is used
# DO NOT REMOVE!!
custom-protocol = ["tauri/custom-protocol"]
[profile.dev]
incremental = true # Compile your binary in smaller steps.
[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
strip = true        # Remove debug symbols
panic = "abort"     # Smaller panic handler
overflow-checks = false  # Disable overflow checks for smaller binary
incremental = false      # Disable incremental compilation for better optimization
`;
}
