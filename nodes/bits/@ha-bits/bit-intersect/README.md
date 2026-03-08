# @ha-bits/bit-intersect

Intersect AI integration bit module for the Habits workflow system.

This module provides AI actions (chat, image generation, transcription, etc.) that connect to Intersect AI services.

## Key Difference from @ha-bits/piece-intersect

This module imports from `@ha-bits/cortex` packages.

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
npm install @ha-bits/bit-intersect
```

## Usage

This module is designed to be used with the Habits workflow executor:

```typescript
import { intersect } from '@ha-bits/bit-intersect';

// Use in workflow configuration
const action = intersect.actions.send_prompt;
```

## License

MIT
