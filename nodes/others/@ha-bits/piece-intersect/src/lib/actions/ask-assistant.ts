import {
  createAction,
  Property,
  StoreScope,
} from '@activepieces/pieces-framework';
import OpenAI from 'openai';
import { intersectAuth } from '../common/common';
import { sleep, getIntersectBaseUrl, IntersectAuthValue } from '../common/common';

export const askAssistant = createAction({
  auth: intersectAuth,
  name: 'ask_assistant',
  displayName: 'Ask Assistant',
  description: 'Ask a GPT assistant anything you want!',
  props: {
    assistant: Property.Dropdown({
      auth: intersectAuth,
      displayName: 'Assistant',
      required: true,
      description: 'The assistant which will generate the completion.',
      refreshers: [],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'Enter your API key first',
            options: [],
          };
        }
        try {
          const authValue = auth as unknown as IntersectAuthValue;
          const openai = new OpenAI({
            apiKey: authValue.apiKey,
            baseURL: getIntersectBaseUrl(authValue.host),
          });
          const assistants = await openai.beta.assistants.list();

          return {
            disabled: false,
            options: assistants.data.map((assistant: any) => {
              return {
                label: assistant.name,
                value: assistant.id,
              };
            }),
          };
        } catch (error) {
          return {
            disabled: true,
            options: [],
            placeholder: "Couldn't load assistants, API key is invalid",
          };
        }
      },
    }),
    prompt: Property.LongText({
      displayName: 'Question',
      required: true,
    }),
    memoryKey: Property.ShortText({
      displayName: 'Memory Key',
      description:
        'A memory key that will keep the chat history shared across runs and flows. Keep it empty to leave your assistant without memory of previous messages.',
      required: false,
    }),
  },
  async run({ auth, propsValue, store }) {
    // Inline validation to avoid Zod version mismatch
    const { memoryKey } = propsValue;
    if (memoryKey !== undefined && memoryKey !== null) {
      if (typeof memoryKey !== 'string' || memoryKey.length > 128) {
        throw new Error('Memory key must be a string with max 128 characters');
      }
    }

    const authValue = auth as unknown as IntersectAuthValue;
    const openai = new OpenAI({
      apiKey: authValue.apiKey,
      baseURL: getIntersectBaseUrl(authValue.host),
    });
    const { assistant, prompt } = propsValue;
    const runCheckDelay = 1000;
    let response: any;
    let thread: any;

    if (memoryKey) {
      // Get existing thread ID or create a new thread for this memory key
      thread = await store.get(memoryKey, StoreScope.PROJECT);
      if (!thread) {
        thread = await openai.beta.threads.create();

        store.put(memoryKey, thread, StoreScope.PROJECT);
      }
    } else {
      thread = await openai.beta.threads.create();
    }

    const message = await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant,
    });
    // Wait at least 400ms for inference to finish before checking to save requests
    await sleep(400);

    while (!response) {
      const runCheck = await openai.beta.threads.runs.retrieve(
        run.id ,
        { thread_id: thread.id },
      );
      if (runCheck.status == 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        // Return only messages that are newer than the user's latest message
        response = messages.data.splice(
          0,
          messages.data.findIndex((m) => m.id == message.id)
        );
        break;
      }

      await sleep(runCheckDelay);
    }

    return response;
  },
});
