import {
  HttpRequest,
  HttpMethod,
  httpClient,
  AuthenticationType,
} from '@activepieces/pieces-common';
import { createAction, Property } from '@activepieces/pieces-framework';
import { intersectAuth } from '../common/common';
import { getCanvasApiUrl, getIntersectBaseUrl, IntersectAuthValue } from '../common/common';

/**
 * Canvas type options mapping display labels to API values
 */
const canvasTypeOptions = [
  { label: 'Create a landing page', value: 'webcanvas' },
  { label: 'Create a document', value: 'draftcanvas' },
//   { label: 'Create a presentation', value: 'slidecanvas' },
  { label: 'Create a diagram', value: 'drawcanvas' },
//   { label: 'Create a video', value: 'videocanvas' },
  { label: 'Create a vector graphic', value: 'svgcanvas' },
];

export const createCanvas = createAction({
  auth: intersectAuth,
  name: 'create_canvas',
  displayName: 'Create Canvas',
  description: 'Create a canvas of any type using AI. Returns a link and generated output.',
  props: {
    modelName: Property.Dropdown<boolean>({
      auth: intersectAuth,
      displayName: 'Model',
      description: 'The AI model to use for generating the canvas content.',
      required: true,
      refreshers: [],
      defaultValue: 'gpt-4o',
      options: async ({ auth }: { auth: IntersectAuthValue }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'Enter your API key first',
            options: [],
          };
        }
        try {
          const authValue = auth as unknown as IntersectAuthValue;
          const baseUrl = getIntersectBaseUrl(authValue.host);
          
          const response = await httpClient.sendRequest<{
            data: { id: string }[];
          }>({
            url: `${baseUrl}/models?type=text`,
            method: HttpMethod.GET,
            authentication: {
              type: AuthenticationType.BEARER_TOKEN,
              token: authValue.apiKey,
            },
          });
          
          return {
            disabled: false,
            options: response.body.data.map((model) => ({
              label: model.id,
              value: model.id,
            })),
          };
        } catch (error) {
          return {
            disabled: true,
            options: [],
            placeholder: "Couldn't load models, API key is invalid",
          };
        }
      },
    } as any),
    type: Property.StaticDropdown({
      displayName: 'Canvas Type',
      description: 'The type of canvas to create.',
      required: true,
      options: {
        disabled: false,
        options: canvasTypeOptions,
      },
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      description: 'Describe what you want to create in the canvas.',
      required: true,
    }),
    additionalOptions: Property.Object({
      displayName: 'Additional Options',
      description: 'Optional additional parameters to pass to the canvas API.',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
    const { modelName, type, prompt, additionalOptions } = propsValue;
    const authValue = auth as unknown as IntersectAuthValue;
    
    const canvasApiUrl = getCanvasApiUrl(authValue.host, 'create-canvas');

    const requestBody: Record<string, unknown> = {
      modelName,
      type,
      prompt, 
    };

    // Get host/origin from canvasApiUrl
    const url = new URL(canvasApiUrl);
    const origin = url.origin;

    // Merge additional options if provided
    if (additionalOptions && typeof additionalOptions === 'object') {
      Object.assign(requestBody, additionalOptions);
    }

    const request: HttpRequest = {
      method: HttpMethod.POST,
      url: canvasApiUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authValue.apiKey}`,

        // Origin
        origin
      },
      body: requestBody,
    };
    try {
      const response = await httpClient.sendRequest<{
        link?: string;
        output?: unknown;
        [key: string]: unknown;
      }>(request);

      return {
        link: response.body.link || null,
        output: response.body.output || response.body,
        rawResponse: response.body,
      };
    } catch (e) {
      throw new Error(`Error creating canvas:\n${e}`);
    }
  },
});
