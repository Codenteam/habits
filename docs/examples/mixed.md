# Mixed Frameworks Example

Demonstrates using multiple automation frameworks (n8n, ActivePieces, Scripts) in a single workflow.

<div id="mixed-frameworks-screenshot">

![Mix bits, n8n, ActivePieces and scripts](/images/mixed.webp)
*Mix bits, n8n, ActivePieces and scripts in a single workflow*

</div>

<script setup>
import mixedHabitYaml from '../../examples/mixed/habit.yaml?raw'
</script>

<DownloadExample examplePath="mixed" />

## What It Does

1. **OpenAI** (ActivePieces) → Generates motivational text
2. **Script** (Deno) → Logs and saves text to file
3. **ElevenLabs** (n8n) → Converts text to speech
4. **Script** (Deno) → Saves audio file locally

## Why It's Included

Shows the core value prop of Habits: mix-and-match any automation framework in one pipeline without vendor lock-in.

## Workflow Visualization

<HabitViewer :content="mixedHabitYaml" :hide-controls="true" :fit-view="true" :height="500" />

## Quick Start

<ExampleRunner examplePath="mixed" />

::: code-group
```bash [Test]
curl -X POST http://localhost:13000/api/text-to-voice-to-s3
```
:::

<div id="text-to-audio-screenshot">

![Text to Audio Example](/images/mixed-frontend.webp)
*Text to Audio - Generated frontend for the text-to-speech workflow*

</div>

## Key Files

::: code-group

<<< @/../examples/mixed/.env.example [.env.example]

<<< @/../examples/mixed/stack.yaml [stack.yaml]

<<< @/../examples/mixed/habit.yaml [habit.yaml]

:::
