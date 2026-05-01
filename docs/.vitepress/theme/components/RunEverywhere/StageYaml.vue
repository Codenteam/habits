<script setup>
const yaml = `nodes:
  - id: extract-text
    type: bits
    data:
      module: "@ha-bits/bit-openai"
      operation: vision_prompt
      params:
        image: "{{habits.input.resumeImage}}"
        prompt: |
          Extract all text content from this resume image.

  - id: generate-letter
    type: bits
    data:
      module: "@ha-bits/bit-openai"
      operation: ask_chatgpt
      params:
        model: gpt-4o
        prompt: |
          Write a cover letter for:
          Resume: {{extract-text}}
          Company: {{habits.input.companyName}}
          Tone: {{habits.input.tone}}

edges:
  - source: extract-text
    target: generate-letter

output:
  coverLetter: "{{generate-letter}}"
  extractedText: "{{extract-text}}"
`
</script>

<template>
  <div class="vis-code">
    <div class="window">
      <div class="title-bar">
        <span class="b r"></span><span class="b y"></span><span class="b g"></span>
        <span class="t">generate-cover-letter.yaml</span>
      </div>
      <pre class="code">{{ yaml }}</pre>
    </div>
  </div>
</template>

<style scoped>
.vis-code { width: 100%; height: 100%; }
.window {
  width: 100%;
  background: #0a0e1a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.04);
}
.title-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 14px;
  background: linear-gradient(180deg, #1e293b, #131b2c);
  border-bottom: 1px solid #334155;
}
.title-bar .b { width: 11px; height: 11px; border-radius: 50%; }
.b.r { background: #ef4444; } .b.y { background: #f59e0b; } .b.g { background: #22c55e; }
.title-bar .t { margin-left: 12px; font-size: 0.78rem; color: #94a3b8; font-family: 'Monaco', monospace; font-weight: 600; }
.code {
  margin: 0; padding: 18px;
  font-family: 'Monaco', monospace;
  font-size: 0.78rem;
  background: #0d1117;
  color: #cbd5e1;
  line-height: 1.6;
  overflow: auto;
  max-height: 320px;
  white-space: pre-wrap;
}
</style>
