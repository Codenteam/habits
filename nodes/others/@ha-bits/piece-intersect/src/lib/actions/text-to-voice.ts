import {
  HttpRequest,
  HttpMethod,
  httpClient,
} from '@activepieces/pieces-common';
import { createAction, Property } from '@activepieces/pieces-framework';
import { intersectAuth } from '../common/common';
import { getCanvasApiUrl, IntersectAuthValue } from '../common/common';

export const textToVoice = createAction({
  auth: intersectAuth,
  name: 'text_to_voice',
  displayName: 'Text to Voice',
  description: 'Convert text to voice using AI voice synthesis',
  props: {
    voice: Property.Dropdown({
      auth: intersectAuth,
      displayName: 'Voice',
      description: 'Select the voice to use for speech synthesis.',
      required: true,
      refreshers: [],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'Enter your credentials first',
            options: [],
          };
        }
        try {
          const authValue = auth as unknown as IntersectAuthValue;
          const voicesUrl = getCanvasApiUrl(authValue.host, 'voices');
          
          const response = await httpClient.sendRequest<{
            voices: { id: string; name: string }[];
          }>({
            method: HttpMethod.GET,
            url: voicesUrl,
            headers: {
              Authorization: `Bearer ${authValue.apiKey}`,
            },
          });

          return {
            disabled: false,
            options: response.body.voices.map((voice) => ({
              label: voice.name,
              value: voice.id,
            })),
          };
        } catch (error) {
          return {
            disabled: true,
            options: [],
            placeholder: "Couldn't load voices, check your credentials",
          };
        }
      },
    }),
    text: Property.LongText({
      displayName: 'Text',
      description: 'The text you want to convert to voice.',
      required: true,
    }),
    speed: Property.Number({
      displayName: 'Speed',
      description: 'Speed of the voice. Left is slower, right is faster. Range: 0 to 1.',
      required: false,
      defaultValue: 0.5,
    }),
    stability: Property.Number({
      displayName: 'Stability',
      description: 'Voice stability. Range: 0 to 1.',
      required: false,
      defaultValue: 0.5,
    }),
    similarity: Property.Number({
      displayName: 'Similarity',
      description: 'Voice similarity boost. Range: 0 to 1.',
      required: false,
      defaultValue: 0.75,
    }),
    styleExaggeration: Property.Number({
      displayName: 'Style Exaggeration',
      description: 'Style exaggeration amount. Range: 0 to 1.',
      required: false,
      defaultValue: 1,
    }),
  },
  async run({ auth, propsValue, files }) {
    const { voice, text, speed, stability, similarity, styleExaggeration } = propsValue;
    const authValue = auth as unknown as IntersectAuthValue;
    const canvasApiUrl = getCanvasApiUrl(authValue.host, 'text-to-voice');

    const request: HttpRequest = {
      method: HttpMethod.POST,
      url: canvasApiUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authValue.apiKey}`,
      },
      body: {
        voice,
        text,
        speed: speed ?? 0.5,
        stability: stability ?? 0.5,
        similarity: similarity ?? 0.75,
        styleExaggeration: styleExaggeration ?? 1,
      },
    };

    try {
      const response = await httpClient.sendRequest(request);
      
      // If the response contains audio data, save it as a file
      if (response.body && response.body.audio) {
        const audioBuffer = Buffer.from(response.body.audio, 'base64');
        return files.write({
          fileName: `voice_${Date.now()}.mp3`,
          data: audioBuffer,
        });
      }
      
      return response.body;
    } catch (e) {
      throw new Error(`Error converting text to voice:\n${e}`);
    }
  },
});
