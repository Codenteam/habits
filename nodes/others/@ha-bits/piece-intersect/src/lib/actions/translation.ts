import {
  HttpRequest,
  HttpMethod,
  httpClient,
} from '@activepieces/pieces-common';
import { Property, createAction } from '@activepieces/pieces-framework';
import { intersectAuth } from '../common/common';
import FormData from 'form-data';
import mime from 'mime-types';
import { getIntersectBaseUrl, IntersectAuthValue } from '../common/common';

export const translateAction = createAction({
  name: 'translate',
  displayName: 'Translate Audio',
  description: 'Translate audio to text using whisper-1 model',
  auth: intersectAuth,
  props: {
    audio: Property.File({
      displayName: 'Audio',
      required: true,
      description: 'Audio file to translate',
    }),
  },
  run: async (context) => {
    const fileData = context.propsValue.audio;
    const mimeType = mime.lookup(fileData.extension ? fileData.extension : '');
    const form = new FormData();
    form.append('file', fileData.data, {
      filename: fileData.filename,
      contentType: mimeType as string,
    });
    form.append('model', 'whisper-1');

    const authValue = context.auth as unknown as IntersectAuthValue;
    const baseUrl = getIntersectBaseUrl(authValue.host);
    const headers = {
      Authorization: `Bearer ${authValue.apiKey}`,
    };

    const request: HttpRequest = {
      method: HttpMethod.POST,
      url: `${baseUrl}/audio/translations`,
      body: form,
      headers: {
        ...form.getHeaders(),
        ...headers,
      },
    };
    try {
      const response = await httpClient.sendRequest(request);
      return response.body;
    } catch (e) {
      throw new Error(`Error while execution:\n${e}`);
    }
  },
});
