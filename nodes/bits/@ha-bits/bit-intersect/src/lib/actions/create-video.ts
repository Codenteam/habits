/**
 * Create Video Action
 * Create a video using VideoCanvas with AI
 */

import {
  HttpMethod,
  httpClient,
  createAction,
  Property,
} from '@ha-bits/cortex-core';
import { intersectAuth } from '../common/common';
import { getCanvasApiUrl, IntersectAuthValue } from '../common/common';

export const createVideo = createAction({
  auth: intersectAuth,
  name: 'create_video',
  displayName: 'Create Video',
  description: 'Create a video using VideoCanvas with AI',
  props: {
    prompt: Property.LongText({
      displayName: 'Video Prompt',
      description: 'Describe the video you want to create.',
      required: true,
    }),
  },
  async run({ auth, propsValue }) {
    const { prompt } = propsValue;
    const authValue = auth as unknown as IntersectAuthValue;
    const canvasApiUrl = getCanvasApiUrl(authValue.host, 'create-video');

    try {
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: canvasApiUrl,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authValue.apiKey}`,
        },
        body: {
          prompt,
        },
      });
      return response.body;
    } catch (e) {
      throw new Error(`Error creating video:\n${e}`);
    }
  },
});
