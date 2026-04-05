/**
 * Transcribe Audio Action
 * 
 * Similar to OpenAI's Whisper API - transcribes audio to text using local Whisper models.
 * Supports various model sizes (tiny to large-v3)
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  WhisperModels, 
  Languages,
  getModelPath,
  WhisperTask,
  DeviceType 
} from '../common/common';
import { TranscribeConfig } from '../common/models';
import { getBackend } from '../stubs';
import * as path from 'path';
import * as os from 'os';

export const transcribeAudio = createAction({
  auth: localAiAuth,
  name: 'transcribe_audio',
  displayName: 'Transcribe Audio',
  description: 'Transcribe audio files to text using local Whisper models. Similar to OpenAI Whisper API but runs on your machine.',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description: 'Whisper model size. Larger models are more accurate but slower.',
      defaultValue: 'base',
      options: {
        disabled: false,
        options: WhisperModels,
      },
    }),
    audio: Property.File({
      displayName: 'Audio File',
      required: false,
      description: 'The audio file to transcribe (mp3, wav, m4a, webm, etc.)',
    }),
    audioUrl: Property.ShortText({
      displayName: 'Audio URL/Path',
      required: false,
      description: 'URL or path to the audio file (alternative to uploading)',
    }),
    language: Property.StaticDropdown({
      displayName: 'Language',
      required: false,
      description: 'Language of the audio. Leave empty for auto-detection.',
      options: {
        disabled: false,
        options: [{ value: '', label: 'Auto-detect' }, ...Languages],
      },
    }),
    task: Property.StaticDropdown({
      displayName: 'Task',
      required: true,
      description: 'Transcribe (keep original language) or Translate (to English).',
      defaultValue: 'Transcribe',
      options: {
        disabled: false,
        options: [
          { value: 'Transcribe', label: 'Transcribe (original language)' },
          { value: 'Translate', label: 'Translate to English' },
        ],
      },
    }),
    timestamps: Property.Checkbox({
      displayName: 'Include Timestamps',
      required: false,
      description: 'Include word-level timestamps in the output.',
      defaultValue: false,
    }),
    quantized: Property.Checkbox({
      displayName: 'Use Quantized Model',
      required: false,
      description: 'Use quantized model for faster inference with slightly lower accuracy.',
      defaultValue: false,
    }),
    responseFormat: Property.StaticDropdown({
      displayName: 'Response Format',
      required: true,
      description: 'Format of the transcription output.',
      defaultValue: 'text',
      options: {
        disabled: false,
        options: [
          { value: 'text', label: 'Plain Text' },
          { value: 'json', label: 'JSON with segments' },
          { value: 'srt', label: 'SRT subtitles' },
          { value: 'vtt', label: 'WebVTT subtitles' },
        ],
      },
    }),
  },
  async run({ auth, propsValue }) {
    const authValue = (auth as unknown as Partial<LocalAiAuthValue>) || {};
    const backend = getBackend();
    
    // Use defaults if auth not configured
    const modelsBasePath = authValue.modelsBasePath || process.env.LOCAL_AI_MODELS_PATH || '~/.habits/models';
    const device = authValue.device || (process.env.LOCAL_AI_DEVICE as DeviceType) || DeviceType.Auto;
    
    // Resolve home directory
    const resolvedBasePath = modelsBasePath.startsWith('~') 
      ? modelsBasePath.replace('~', process.env.HOME || '/tmp')
      : modelsBasePath;
    
    // Determine model paths
    const modelName = propsValue.model;
    const quantizedSuffix = propsValue.quantized ? '-q5_0' : '';
    const modelPath = getModelPath(
      resolvedBasePath, 
      'whisper', 
      modelName,
      `model${quantizedSuffix}.safetensors`
    );
    const tokenizerPath = getModelPath(resolvedBasePath, 'whisper', modelName, 'tokenizer.json');
    const configPath = getModelPath(resolvedBasePath, 'whisper', modelName, 'config.json');
    
    // Handle audio file input - can be either a file object or a URL/path string
    let audioPath: string;
    let tempAudioPath: string | undefined;
    const fs = await import('fs');
    const tmpDir = os.tmpdir();
    
    // Check if audioUrl is a valid value (not an unresolved template)
    const isValidAudioUrl = propsValue.audioUrl && 
      typeof propsValue.audioUrl === 'string' &&
      !propsValue.audioUrl.includes('{{') && 
      !propsValue.audioUrl.startsWith('habits.');
    
    if (isValidAudioUrl) {
      // Use the provided URL/path directly
      audioPath = propsValue.audioUrl;
    } else if (propsValue.audio) {
      // Handle file upload
      const audioFile = propsValue.audio as { filename: string; data: Buffer; extension?: string };
      tempAudioPath = path.join(tmpDir, `audio_${Date.now()}.${audioFile.extension || 'wav'}`);
      fs.writeFileSync(tempAudioPath, new Uint8Array(audioFile.data));
      audioPath = tempAudioPath;
    } else {
      throw new Error('Either Audio File or Audio URL/Path must be provided');
    }
    
    try {
      // Check if language is a valid value (not an unresolved template)
      const isValidLanguage = propsValue.language && 
        typeof propsValue.language === 'string' &&
        !propsValue.language.includes('{{') && 
        !propsValue.language.startsWith('habits.');
      
      // Configure transcription
      const config: TranscribeConfig = {
        modelPath,
        tokenizerPath,
        configPath,
        quantized: propsValue.quantized || false,
        language: isValidLanguage ? propsValue.language : undefined,
        task: propsValue.task as WhisperTask,
        timestamps: propsValue.timestamps || false,
        device: device as DeviceType,
      };
      
      // Transcribe audio
      const result = await backend.transcribeAudio(config, audioPath);
      
      // Format output based on requested format
      let output: any;
      
      switch (propsValue.responseFormat) {
        case 'json':
          output = {
            text: result.text,
            language: result.language,
            segments: result.segments,
          };
          break;
          
        case 'srt':
          output = formatAsSrt(result.segments);
          break;
          
        case 'vtt':
          output = formatAsVtt(result.segments);
          break;
          
        case 'text':
        default:
          output = result.text;
          break;
      }
      
      return {
        text: result.text,
        language: result.language,
        segments: result.segments,
        formatted: output,
        model: modelName,
      };
    } finally {
      // Clean up temp file only if we created one
      if (tempAudioPath) {
        try {
          fs.unlinkSync(tempAudioPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  },
});

/**
 * Format segments as SRT subtitles
 */
function formatAsSrt(segments: Array<{ start: number; end: number; text: string }>): string {
  return segments.map((seg, i) => {
    const startTime = formatSrtTime(seg.start);
    const endTime = formatSrtTime(seg.end);
    return `${i + 1}\n${startTime} --> ${endTime}\n${seg.text.trim()}\n`;
  }).join('\n');
}

/**
 * Format segments as WebVTT subtitles
 */
function formatAsVtt(segments: Array<{ start: number; end: number; text: string }>): string {
  const lines = ['WEBVTT\n'];
  segments.forEach((seg, i) => {
    const startTime = formatVttTime(seg.start);
    const endTime = formatVttTime(seg.end);
    lines.push(`${i + 1}\n${startTime} --> ${endTime}\n${seg.text.trim()}\n`);
  });
  return lines.join('\n');
}

/**
 * Format seconds as SRT timestamp (HH:MM:SS,mmm)
 */
function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/**
 * Format seconds as VTT timestamp (HH:MM:SS.mmm)
 */
function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

/**
 * Pad number with leading zeros
 */
function pad(n: number, width: number = 2): string {
  return n.toString().padStart(width, '0');
}
