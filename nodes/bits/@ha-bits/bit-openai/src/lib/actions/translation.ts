/**
 * Translation Action
 * Translate audio to text using whisper-1 model
 */

import {
  HttpMethod,
  httpClient,
  Property,
  createAction,
} from '@ha-bits/cortex';
import { openaiAuth, baseUrl as openAiBaseUrl, openaiAuthValue } from '../common/common';
import FormData from 'form-data';
import mime from 'mime-types';

export const translateAction = createAction({
  name: 'translate',
  displayName: 'Translate Audio',
  description: 'Translate audio to text using whisper-1 model',
  auth: openaiAuth,
  props: {
    audio: Property.File({
      displayName: 'Audio',
      required: true,
      description: 'Audio file to translate',
    }),
  },
  run: async (context) => {
    const fileData = context.propsValue.audio as { filename: string; data: Buffer; extension?: string };
    const mimeType = mime.lookup(fileData.extension ? fileData.extension : '');
    const form = new FormData();
    form.append('file', fileData.data, {
      filename: fileData.filename,
      contentType: mimeType as string,
    });
    form.append('model', 'whisper-1');

    const authValue = context.auth as unknown as openaiAuthValue;
    const baseUrl = openAiBaseUrl;
    const headers = {
      Authorization: `Bearer ${authValue.apiKey}`,
    };

    try {
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: `${baseUrl}/audio/translations`,
        body: form,
        headers: {
          ...form.getHeaders(),
          ...headers,
        },
      });
      return response.body;
    } catch (e) {
      throw new Error(`Error while execution:\n${e}`);
    }
  },
});
