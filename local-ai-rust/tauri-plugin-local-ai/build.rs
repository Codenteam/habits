const COMMANDS: &[&str] = &[
    // Text generation
    "generate_text",
    "create_text_generator",
    "text_generator_generate",
    // Image captioning
    "caption_image",
    "create_image_captioner",
    "image_captioner_caption",
    // Image generation
    "generate_image",
    "create_image_generator",
    "image_generator_generate",
    // Audio transcription
    "transcribe_audio",
    "create_transcriber",
    "transcriber_transcribe",
    // Text to voice
    "synthesize_speech",
    "create_voice_synthesizer",
    "voice_synthesizer_synthesize",
    // Utilities
    "get_version",
    "has_metal_support",
    "has_cuda_support",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
