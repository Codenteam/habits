/**
 * Transcribe Action
 * Transcribe audio to text using whisper-1 model
 */

import {
  Property,
  createAction,
} from '@ha-bits/cortex-core';
import OpenAI, { toFile } from 'openai';
import mime from 'mime-types';
import { Languages, openaiAuth, openaiAuthValue } from '../common/common';

type AudioFileInput = {
  filename?: string;
  data?: Buffer | Uint8Array | string | { type: 'Buffer'; data: number[] };
  extension?: string;
};

function normalizeAudioBuffer(audio: AudioFileInput | string): {
  filename: string;
  buffer: Buffer;
  mimeType: string;
} {
  if (typeof audio === 'string') {
    return {
      filename: 'audio.mp3',
      buffer: Buffer.from(audio, 'base64'),
      mimeType: 'audio/mpeg',
    };
  }

  if (!audio?.data) {
    throw new Error('Audio file is required');
  }

  const filename = audio.filename || 'audio.mp3';
  const extension = audio.extension || `.${filename.split('.').pop() || 'mp3'}`;
  const mimeType = (mime.lookup(extension.replace(/^\./, '')) || 'application/octet-stream') as string;

  let buffer: Buffer;
  const { data } = audio;

  if (typeof data === 'string') {
    buffer = Buffer.from(data, 'base64');
  } else if (Buffer.isBuffer(data)) {
    buffer = data;
  } else if (data instanceof Uint8Array) {
    buffer = Buffer.from(data);
  } else if (
    data &&
    typeof data === 'object' &&
    'type' in data &&
    data.type === 'Buffer' &&
    Array.isArray(data.data)
  ) {
    buffer = Buffer.from(data.data);
  } else {
    throw new Error('Invalid audio file data');
  }

  return { filename, buffer, mimeType };
}

export const transcribeAction = createAction({
  name: 'transcribe',
  displayName: 'Transcribe Audio',
  description: 'Transcribe audio to text using whisper-1 model',
  auth: openaiAuth,
  props: {
    audio: Property.File({
      displayName: 'Audio',
      required: true,
      description: 'Audio file to transcribe',
    }),
    language: Property.StaticDropdown({
      displayName: 'Language of the Audio',
      description: 'Language of the audio file the default is en (English).',
      required: false,
      options: {
        options: Languages,
      },
      defaultValue: 'en',
    }),
  },
  run: async (context) => {
    const authValue = context.auth as unknown as openaiAuthValue;
    const openai = new OpenAI({
      apiKey: authValue.apiKey,
    } as any);

    let language = context.propsValue.language;
    if (!Languages.some((l) => l.value === language)) {
      language = 'en';
    }

    const { filename, buffer, mimeType } = normalizeAudioBuffer(context.propsValue.audio);

    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(buffer, filename, { type: mimeType }),
      model: 'whisper-1',
      language,
    });

    return { text: transcription.text };
  },
});
