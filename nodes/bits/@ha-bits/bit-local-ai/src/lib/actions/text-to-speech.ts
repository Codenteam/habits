/**
 * Text-to-Speech Action
 * 
 * Similar to OpenAI's TTS API - synthesizes speech from text using local MetaVoice models.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: any;
declare const Buffer: any;

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  VoicePresets,
  AudioFormats,
  DeviceType 
} from '../common/common';
import { synthesizeSpeech as synthesizeSpeechDriver } from '../driver';

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
    const env = typeof process !== 'undefined' ? process.env : {};
    const device = authValue.device || (env.LOCAL_AI_DEVICE as DeviceType) || DeviceType.Auto;
    
    const isValidSeed = propsValue.seed !== undefined && 
      propsValue.seed !== null &&
      typeof propsValue.seed === 'number' &&
      !isNaN(propsValue.seed);
    
    const format = propsValue.format || 'wav';
    const fileName = propsValue.fileName || 'speech';
    
    // Synthesize via driver (uses 'metavoice' model ID)
    const result = await synthesizeSpeechDriver('metavoice', propsValue.text, {
      guidanceScale: propsValue.guidanceScale || 3.0,
      temperature: propsValue.temperature || 1.0,
      maxTokens: 2000,
      seed: isValidSeed ? propsValue.seed : undefined,
      quantized: propsValue.quantized || false,
      device,
    });
    
    // Save generated audio via files API
    let audioUrl: string | null = null;
    
    if (files && result.base64) {
      const audioBuffer = Buffer.from(result.base64, 'base64');
      
      const savedFile = await files.write({
        fileName: `${fileName}.${format}`,
        data: audioBuffer,
      }) as any;
      
      audioUrl = savedFile?.url || null;
    }
    
    return {
      audioUrl,
      audioBase64: result.base64 ? `data:audio/${format};base64,${result.base64}` : null,
      sampleRate: result.sampleRate,
      durationSeconds: result.durationSeconds,
      voice: propsValue.voice,
      format,
    };
  },
});
