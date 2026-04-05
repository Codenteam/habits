# @local-ai/node

Node.js bindings for Local AI inference using NAPI-RS. This package provides native performance for:

- **Text Generation** - Using Qwen2 quantized GGUF models
- **Image Captioning** - Using BLIP quantized models  
- **Image Generation** - Using Stable Diffusion 1.5
- **Audio Transcription** - Using Whisper models
- **Text-to-Voice** - Using MetaVoice models

## Installation

```bash
npm install @local-ai/node
```

## Requirements

- Node.js >= 18
- Pre-built binaries available for:
  - macOS (x64, arm64)
  - Linux (x64, arm64)
  - Windows (x64)

## Usage

### Text Generation

```typescript
import { TextGenerator, DeviceType } from '@local-ai/node'

// Create a generator (reusable for multiple prompts)
const generator = TextGenerator.new({
  modelPath: '/path/to/model.gguf',
  tokenizerPath: '/path/to/tokenizer.json',
  maxTokens: 200,
  temperature: 0.7,
  device: DeviceType.Auto
})

// Generate text
const result = await generator.generate('Write a haiku about programming')
console.log(result.text)
console.log(`Generated ${result.tokensGenerated} tokens`)

// Or use the simple function
import { generateText } from '@local-ai/node'

const result = generateText(
  '/path/to/model.gguf',
  '/path/to/tokenizer.json',
  'Write a haiku about programming',
  200,   // maxTokens
  0.7,   // temperature
  42,    // seed
  DeviceType.Auto
)
```

### Image Captioning

```typescript
import { ImageCaptioner, DeviceType } from '@local-ai/node'

const captioner = ImageCaptioner.new({
  modelPath: '/path/to/blip-model.gguf',
  tokenizerPath: '/path/to/tokenizer.json',
  device: DeviceType.Auto
})

const result = await captioner.caption('/path/to/image.jpg')
console.log(result.caption)
```

### Image Generation

```typescript
import { ImageGenerator, DeviceType } from '@local-ai/node'

const generator = ImageGenerator.new({
  unetPath: '/path/to/unet.safetensors',
  vaePath: '/path/to/vae.safetensors',
  clipPath: '/path/to/clip.safetensors',
  tokenizerPath: '/path/to/tokenizer.json',
  height: 512,
  width: 512,
  steps: 30,
  guidanceScale: 7.5,
  device: DeviceType.Auto
})

const result = await generator.generate(
  'A beautiful sunset over mountains',
  '',  // negative prompt
  '/path/to/output.png'
)
console.log(`Image saved to ${result.outputPath}`)
```

### Audio Transcription (Whisper)

```typescript
import { Transcriber, DeviceType, WhisperTask } from '@local-ai/node'

const transcriber = Transcriber.new({
  modelPath: '/path/to/whisper-model.safetensors',
  tokenizerPath: '/path/to/tokenizer.json',
  configPath: '/path/to/config.json',
  quantized: false,
  language: 'en',
  task: WhisperTask.Transcribe,
  timestamps: true,
  device: DeviceType.Auto
})

const result = await transcriber.transcribe('/path/to/audio.wav')
console.log(result.text)

// With timestamps
for (const segment of result.segments) {
  console.log(`[${segment.start.toFixed(1)}s - ${segment.end.toFixed(1)}s]: ${segment.text}`)
}
```

### Text-to-Voice (MetaVoice)

```typescript
import { VoiceSynthesizer, DeviceType } from '@local-ai/node'

const synthesizer = VoiceSynthesizer.new({
  firstStagePath: '/path/to/first_stage.safetensors',
  firstStageMetaPath: '/path/to/first_stage.meta.json',
  secondStagePath: '/path/to/second_stage.safetensors',
  encodecPath: '/path/to/encodec.safetensors',
  spkEmbPath: '/path/to/spk_emb.safetensors',
  quantized: false,
  guidanceScale: 3.0,
  temperature: 1.0,
  maxTokens: 2000,
  device: DeviceType.Auto
})

const result = await synthesizer.synthesize(
  'Hello, this is a test of text to speech.',
  '/path/to/output.wav'
)
console.log(`Audio saved: ${result.durationSeconds.toFixed(2)}s`)
```

## Device Selection

The library automatically selects the best available device:

- **macOS**: Prefers Metal GPU acceleration
- **Linux/Windows with NVIDIA**: Prefers CUDA
- **Fallback**: CPU

You can also manually specify:

```typescript
import { DeviceType } from '@local-ai/node'

// Force CPU
{ device: DeviceType.Cpu }

// Force Metal (macOS only)
{ device: DeviceType.Metal }

// Force CUDA (requires NVIDIA GPU)
{ device: DeviceType.Cuda }

// Auto-detect best device
{ device: DeviceType.Auto }
```

## Building from Source

```bash
# Install dependencies
npm install

# Build (release mode)
npm run build

# Build (debug mode)
npm run build:debug
```

### Building with GPU Support

```bash
# macOS with Metal
cargo build --release --features metal

# Linux/Windows with CUDA
cargo build --release --features cuda
```

## License

MIT OR Apache-2.0
