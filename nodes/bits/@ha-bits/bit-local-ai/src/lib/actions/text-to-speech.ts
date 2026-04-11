/**
 * Text-to-Speech Action
 * 
 * Similar to OpenAI's TTS API - synthesizes speech from text using local MetaVoice models.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  VoicePresets,
  AudioFormats,
  getModelPath,
  getModelsBasePath,
  DeviceType 
} from '../common/common';
import { TextToVoiceConfig } from '../common/models';
import { getBackend } from '../stubs';
import * as path from 'path';
import * as os from 'os';

export const textToSpeech = createAction({
  auth: localAiAuth,
  name: 'text_to_speech',
  displayName: 'Text-to-Speech',
  description: 'Generate spoken audio from text using local MetaVoice models. Similar to OpenAI TTS but runs on your machine.',
  props: {
    text: Property.LongText({
      displayName: 'Text',
      required: true,
      description: 'The text to convert to speech.',
    }),
    voice: Property.StaticDropdown({
      displayName: 'Voice',
      required: true,
      description: 'The voice to use for speech synthesis.',
      defaultValue: 'default',
      options: {
        disabled: false,
        options: VoicePresets,
      },
    }),
    customSpeakerEmbedding: Property.ShortText({
      displayName: 'Custom Speaker Embedding Path',
      required: false,
      description: 'Path to a custom speaker embedding file (.npy) for voice cloning.',
    }),
    speed: Property.Number({
      displayName: 'Speed',
      required: false,
      description: 'Speed of speech (0.5 = half speed, 2.0 = double speed). Default is 1.0.',
      defaultValue: 1.0,
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      required: false,
      description: 'Controls variation in speech (0 = consistent, 1 = varied). Default is 1.0.',
      defaultValue: 1.0,
    }),
    guidanceScale: Property.Number({
      displayName: 'Guidance Scale',
      required: false,
      description: 'How closely to follow the text (1-5). Higher = more precise. Default is 3.0.',
      defaultValue: 3.0,
    }),
    format: Property.StaticDropdown({
      displayName: 'Output Format',
      required: true,
      description: 'Audio format for the output file.',
      defaultValue: 'wav',
      options: {
        disabled: false,
        options: AudioFormats,
      },
    }),
    fileName: Property.ShortText({
      displayName: 'File Name',
      required: false,
      description: 'Name for the output audio file (without extension). Default is "speech".',
      defaultValue: 'speech',
    }),
    quantized: Property.Checkbox({
      displayName: 'Use Quantized Model',
      required: false,
      description: 'Use quantized model for faster inference.',
      defaultValue: false,
    }),
    seed: Property.Number({
      displayName: 'Seed',
      required: false,
      description: 'Random seed for reproducible outputs.',
    }),
  },
  async run({ auth, propsValue, files }) {
    const authValue = (auth as unknown as Partial<LocalAiAuthValue>) || {};
    const backend = getBackend();
    
    // Get models base path (handles Tauri app data directory automatically)
    const resolvedBasePath = await getModelsBasePath(authValue);
    const device = authValue.device || ((typeof process !== 'undefined' ? process.env.LOCAL_AI_DEVICE : undefined) as DeviceType) || DeviceType.Auto;
    
    // Determine model paths
    const ttsBasePath = getModelPath(resolvedBasePath, 'tts', 'metavoice');
    
    // Check for quantized model (prefer .gguf if available)
    const fs = await import('fs');
    const ggufPath = path.join(ttsBasePath, 'first_stage.gguf');
    const safetensorsPath = path.join(ttsBasePath, 'first_stage.safetensors');
    const useQuantized = fs.existsSync(ggufPath);
    
    const firstStagePath = useQuantized ? ggufPath : safetensorsPath;
    const firstStageMetaPath = path.join(ttsBasePath, 'first_stage.json');
    const secondStagePath = path.join(ttsBasePath, 'second_stage.safetensors');
    const encodecPath = path.join(ttsBasePath, 'encodec.safetensors');
    
    // Determine speaker embedding path
    let spkEmbPath: string;
    if (propsValue.customSpeakerEmbedding) {
      spkEmbPath = propsValue.customSpeakerEmbedding;
    } else {
      // Use preset voice embedding - try both .npy and .safetensors
      const voiceName = propsValue.voice === 'default' ? 'default' : propsValue.voice;
      const npyPath = path.join(ttsBasePath, 'voices', `${voiceName}.npy`);
      const safetensorsEmbPath = path.join(ttsBasePath, 'spk_emb.safetensors');
      
      // Prefer .npy in voices folder, fallback to spk_emb.safetensors
      if (fs.existsSync(npyPath)) {
        spkEmbPath = npyPath;
      } else if (fs.existsSync(safetensorsEmbPath)) {
        spkEmbPath = safetensorsEmbPath;
      } else {
        throw new Error(`Speaker embedding not found for voice: ${voiceName}`);
      }
    }
    
    // Generate temporary output path
    const fileName = propsValue.fileName || 'speech';
    const format = propsValue.format || 'wav';
    const tmpDir = os.tmpdir();
    const outputPath = path.join(tmpDir, `${fileName}_${Date.now()}.${format}`);
    
    // Configure text-to-voice
    // Check if seed is a valid number (not an unresolved template)
    const isValidSeed = propsValue.seed !== undefined && 
      propsValue.seed !== null &&
      typeof propsValue.seed === 'number' &&
      !isNaN(propsValue.seed);
    
    const config: TextToVoiceConfig = {
      firstStagePath,
      firstStageMetaPath,
      secondStagePath,
      encodecPath,
      spkEmbPath,
      quantized: useQuantized || propsValue.quantized || false,
      guidanceScale: propsValue.guidanceScale || 3.0,
      temperature: propsValue.temperature || 1.0,
      maxTokens: 2000,
      seed: isValidSeed ? propsValue.seed : undefined,
      device: device as DeviceType,
    };
    
    // Synthesize speech
    const result = await backend.synthesizeSpeech(config, propsValue.text, outputPath);
    
    // Read the generated audio and return as file
    if (files && result.outputPath) {
      const fs = await import('fs');
      const audioBuffer = fs.readFileSync(result.outputPath);
      
      const savedFile = await files.write({
        fileName: `${fileName}.${format}`,
        data: audioBuffer,
      }) as any;
      
      // Clean up temp file
      try {
        fs.unlinkSync(result.outputPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return {
        audioUrl: savedFile?.url || result.outputPath,
        sampleRate: result.sampleRate,
        durationSeconds: result.durationSeconds,
        voice: propsValue.voice,
        format: format,
      };
    }
    
    return {
      audioPath: result.outputPath,
      sampleRate: result.sampleRate,
      durationSeconds: result.durationSeconds,
      voice: propsValue.voice,
      format: format,
    };
  },
});
