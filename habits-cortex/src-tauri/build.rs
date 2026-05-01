fn main() {
    // Link Accelerate framework for iOS/macOS (required by candle's accelerate feature)
    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    if target_os == "ios" || target_os == "macos" {
        println!("cargo:rustc-link-lib=framework=Accelerate");
    }

    tauri_build::build()
}
