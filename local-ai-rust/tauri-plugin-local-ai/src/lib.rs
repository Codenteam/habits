//! Tauri v2 Plugin for Local AI inference
//!
//! This plugin provides local AI capabilities including:
//! - Text generation (Qwen2)
//! - Image captioning (BLIP)
//! - Image generation (Stable Diffusion)
//! - Audio transcription (Whisper)
//! - Text-to-voice (MetaVoice)

use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod error;
mod state;

pub use error::{Error, Result};
pub use state::*;

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("local-ai")
        .invoke_handler(tauri::generate_handler![
            // Text generation
            commands::generate_text,
            commands::create_text_generator,
            commands::text_generator_generate,
            // Image captioning
            commands::caption_image,
            commands::create_image_captioner,
            commands::image_captioner_caption,
            // Image generation
            commands::generate_image,
            commands::create_image_generator,
            commands::image_generator_generate,
            // Audio transcription
            commands::transcribe_audio,
            commands::create_transcriber,
            commands::transcriber_transcribe,
            // Text to voice
            commands::synthesize_speech,
            commands::create_voice_synthesizer,
            commands::voice_synthesizer_synthesize,
            // Utilities
            commands::get_version,
            commands::has_metal_support,
            commands::has_cuda_support,
            // Model management
            commands::list_models,
            commands::ensure_models_dir,
            commands::download_file,
        ])
        .setup(|app, _api| {
            // Get the app data directory from Tauri's path resolver
            let models_dir = app.path()
                .app_data_dir()
                .unwrap_or_else(|_| {
                    dirs::data_dir()
                        .unwrap_or_else(|| std::path::PathBuf::from("."))
                        .join("com.codenteam-oss.habits")
                })
                .join("models");
            
            log::info!("Local AI plugin initialized with models dir: {:?}", models_dir);
            
            // Initialize the state manager with the correct models directory
            app.manage(LocalAiState::new(models_dir));
            Ok(())
        })
        .build()
}
