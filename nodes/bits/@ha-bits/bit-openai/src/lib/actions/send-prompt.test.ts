/**
 * bit-openai send-prompt tests - Happy path with OpenAI SDK mocking
 * 
 * This file is loaded by @ha-bits/test-utils at runtime.
 * It exports an array of test definitions.
 */

// No compile-time imports needed - types are inferred

// Helper to create mock OpenAI SDK with configurable response
function createMockOpenAI(response: string) {
  return class MockOpenAI {
    config: any;
    constructor(config: any) {
      this.config = config;
    }
    chat = {
      completions: {
        create: async () => ({
          choices: [{ message: { content: response, role: 'assistant' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 20, completion_tokens: 10 },
        }),
      },
    };
  };
}

export default [
  {
    name: 'basic prompt',
    action: 'ask_chatgpt',
    mocks: {
      modules: [
        {
          moduleName: 'openai',
          exports: { default: createMockOpenAI('4') },
        },
      ],
    },
    auth: { apiKey: 'sk-test', host: 'api.openai.com' },
    input: {
      model: 'gpt-5',
      prompt: 'What is 2+2?',
      maxTokens: 100,
      temperature: 0.7,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      roles: [{ role: 'system', content: 'You are a helpful assistant.' }],
    },
    expect: '4',
  },
  {
    name: 'with memory key stores conversation',
    action: 'ask_chatgpt',
    mocks: {
      modules: [
        {
          moduleName: 'openai',
          exports: { default: createMockOpenAI("I'll remember that, Alice!") },
        },
      ],
      store: { initial: {} },
    },
    auth: { apiKey: 'sk-test', host: 'api.openai.com' },
    input: {
      model: 'gpt-5',
      prompt: 'Remember my name is Alice',
      maxTokens: 100,
      memoryKey: 'session-1',
    },
    expect: "I'll remember that, Alice!",
    expectStore: {
      'session-1': [
        { role: 'user', content: 'Remember my name is Alice' },
        { role: 'assistant', content: "I'll remember that, Alice!" },
      ],
    },
  },
  {
    name: 'full input with mocked OpenAI SDK',
    action: 'ask_chatgpt',
    mocks: {
      modules: [
        {
          moduleName: 'openai',
          exports: { default: createMockOpenAI('The answer is 42') },
        },
      ],
      store: { initial: {} },
    },
    auth: { apiKey: 'sk-test-key', host: 'api.openai.com' },
    input: {
      model: 'gpt-4o',
      prompt: 'What is the meaning of life?',
      maxTokens: 200,
      temperature: 0.8,
      topP: 0.9,
      frequencyPenalty: 0.5,
      presencePenalty: 0.3,
      memoryKey: 'conversation-1',
      roles: [
        { role: 'system', content: 'You are a philosopher.' },
      ],
    },
    expect: 'The answer is 42',
    expectStore: {
      'conversation-1': [
        { role: 'user', content: 'What is the meaning of life?' },
        { role: 'assistant', content: 'The answer is 42' },
      ],
    },
  },
];
