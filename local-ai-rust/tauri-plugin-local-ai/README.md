# tauri-plugin-local-ai

Tauri v2 plugin for Local AI inference. This plugin provides native AI capabilities for Tauri applications including:

- **Text Generation** - Using Qwen2 quantized GGUF models
- **Image Captioning** - Using BLIP quantized models
- **Image Generation** - Using Stable Diffusion 1.5
- **Audio Transcription** - Using Whisper models
- **Text-to-Voice** - Using MetaVoice models

## Installation

### Rust (Tauri App)

Add to your `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri-plugin-local-ai = { path = "../tauri-plugin-local-ai" }
# Or from git:
# tauri-plugin-local-ai = { git = "https://github.com/your-org/local-ai-rust" }
```

Register the plugin in your `src-tauri/src/lib.rs`:

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_local_ai::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### JavaScript/TypeScript (Frontend)

```bash
npm install @local-ai/tauri-plugin
```

## Usage

### Text Generation

```typescript
import { TextGenerator, generateText, DeviceType } from '@local-ai/tauri-plugin';

// Simple one-off generation
const result = await generateText(
  '/path/to/model.gguf',
  '/path/to/tokenizer.json',
  'Write a haiku about programming',
  {
    maxTokens: 200,
    temperature: 0.7,
    device: DeviceType.Auto,
  }
);
console.log(result.text);

// Or create a reusable generator
const generator = await TextGenerator.create({
  modelPath: '/path/to/model.gguf',
  tokenizerPath: '/path/to/tokenizer.json',
  maxTokens: 200,
  temperature: 0.7,
  device: DeviceType.Auto,
});

const result1 = await generator.generate('First prompt');
const result2 = await generator.generate('Second prompt');
```

### Image Captioning

```typescript
import { ImageCaptioner, captionImage } from '@local-ai/tauri-plugin';

// One-off captioning
const result = await captionImage(
  '/path/to/blip-model.gguf',
  '/path/to/tokenizer.json',
  '/path/to/image.jpg'
);
console.log(result.caption);

// Reusable captioner
const captioner = await ImageCaptioner.create({
  modelPath: '/path/to/blip-model.gguf',
  tokenizerPath: '/path/to/tokenizer.json',
});

const result = await captioner.caption('/path/to/image.jpg');
```

### Image Generation

```typescript
import { ImageGenerator, generateImage } from '@local-ai/tauri-plugin';

const result = await generateImage(
  'A beautiful sunset over mountains',
  '/path/to/output.png',
  {
    unetPath: '/path/to/unet.safetensors',
    vaePath: '/path/to/vae.safetensors',
    clipPath: '/path/to/clip.safetensors',
    tokenizerPath: '/path/to/tokenizer.json',
    height: 512,
    width: 512,
    steps: 30,
    guidanceScale: 7.5,
  }
);
console.log(`Image saved to ${result.output_path}`);
```

### Audio Transcription (Whisper)

```typescript
import { Transcriber, transcribeAudio, WhisperTask } from '@local-ai/tauri-plugin';

const result = await transcribeAudio('/path/to/audio.wav', {
  modelPath: '/path/to/whisper-model.safetensors',
  tokenizerPath: '/path/to/tokenizer.json',
  configPath: '/path/to/config.json',
  language: 'en',
  task: WhisperTask.Transcribe,
  timestamps: true,
});

console.log(result.text);

// With timestamps
for (const segment of result.segments) {
  console.log(`[${segment.start.toFixed(1)}s - ${segment.end.toFixed(1)}s]: ${segment.text}`);
}
```

### Text-to-Voice (MetaVoice)

```typescript
import { VoiceSynthesizer, synthesizeSpeech } from '@local-ai/tauri-plugin';

const result = await synthesizeSpeech(
  'Hello, this is a test of text to speech.',
  '/path/to/output.wav',
  {
    firstStagePath: '/path/to/first_stage.safetensors',
    firstStageMetaPath: '/path/to/first_stage.meta.json',
    secondStagePath: '/path/to/second_stage.safetensors',
    encodecPath: '/path/to/encodec.safetensors',
    spkEmbPath: '/path/to/spk_emb.safetensors',
    guidanceScale: 3.0,
    temperature: 1.0,
  }
);
console.log(`Audio saved: ${result.duration_seconds.toFixed(2)}s`);
```

## Building with GPU Support

### macOS with Metal

```toml
[dependencies]
tauri-plugin-local-ai = { path = "../tauri-plugin-local-ai", features = ["metal"] }
```

### Linux/Windows with CUDA

```toml
[dependencies]
tauri-plugin-local-ai = { path = "../tauri-plugin-local-ai", features = ["cuda"] }
```

## Permissions

Add to your `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "local-ai:default"
  ]
}
```

## License

MIT OR Apache-2.0
