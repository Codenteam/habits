# @ha-bits/bit-openai

openai AI integration bit module for the Habits workflow system.

This module provides AI actions (chat, image generation, transcription, etc.) that connect to openai AI services.

## Architecture

This module imports from `@ha-bits/cortex`, using the native Bits framework for workflow automation.

## Features

- Send prompts to AI models
- Generate images
- Text-to-speech conversion
- Audio transcription and translation
- Vision prompts (analyze images)
- Structured data extraction
- Create videos
- Ask AI assistant

## Installation

```bash
npm install @ha-bits/bit-openai
```

## Usage

This module is designed to be used with the Habits workflow executor:

```typescript
import { openai } from '@ha-bits/bit-openai';

// Use in workflow configuration
const action = openai.actions.send_prompt;
```

## License

MIT
