<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { codeToHtml } from 'shiki'

const props = defineProps<{
  examplePath: string  // e.g., "mixed" or "minimal-blog"
}>()

const activeTab = ref(0)
const highlightedCode = ref<Record<number, string>>({})

// Generate commands for different run options
const commands = computed(() => {
  const path = props.examplePath
  return [
    {
      label: 'npx habits',
      description: 'Run using the Habits CLI wrapper, recommended if you develop local Habits',
      cmd: `# First, download the example files\nnpx habits@latest cortex --config ./${path}/stack.yaml`
    },
    {
      label: 'npx @ha-bits/cortex',
      description: 'Run directly using Cortex package, recommended for production runs, does not inlcude base or extra depdencies. ',
      cmd: `# First, download the example files\nnpx @ha-bits/cortex@latest server --config ./${path}/stack.yaml`
    },
    {
      label: 'Local Dev',
      description: 'Run from local workspace for development, recommended if you develop Habits itself and have the source-code locally',
      cmd: `npx nx dev @ha-bits/cortex --config showcase/${path}/stack.yaml`
    }
  ]
})

async function highlightCommands() {
  for (let i = 0; i < commands.value.length; i++) {
    highlightedCode.value[i] = await codeToHtml(commands.value[i].cmd, {
      lang: 'bash',
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      }
    })
  }
}

onMounted(highlightCommands)

// Re-highlight if examplePath changes
watch(() => props.examplePath, highlightCommands)

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="example-runner">
    <div class="tabs-header">
      <button 
        v-for="(cmd, index) in commands" 
        :key="index"
        :class="['tab-btn', { active: activeTab === index }]"
        @click="activeTab = index"
      >
        {{ cmd.label }}
      </button>
    </div>
    <div class="code-block">
      <button class="copy-btn" @click="copyToClipboard(commands[activeTab].cmd)" title="Copy to clipboard">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <p class="cmd-description">
      {{ commands[activeTab].description }}
      </p>
      <div 
        v-if="highlightedCode[activeTab]" 
        class="highlighted-code"
        v-html="highlightedCode[activeTab]"
      ></div>
      <pre v-else><code>{{ commands[activeTab].cmd }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.example-runner {
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.tab-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
}

.tab-btn.active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}

.code-block {
  position: relative;
  background: var(--vp-code-block-bg);
  padding: 20px 24px;
}

.code-block pre {
  margin: 0;
  overflow-x: auto;
}

.code-block code {
  font-family: var(--vp-font-family-mono);
  font-size: var(--vp-code-font-size);
  line-height: var(--vp-code-line-height);
  color: var(--vp-code-block-color);
  white-space: pre-wrap;
  word-break: break-all;
}

.highlighted-code :deep(pre) {
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow-x: auto;
}

.highlighted-code :deep(code) {
  font-family: var(--vp-font-family-mono);
  font-size: var(--vp-code-font-size);
  line-height: var(--vp-code-line-height);
  white-space: pre-wrap;
  word-break: break-all;
}

/* Shiki dual theme support */
.highlighted-code :deep(.shiki) {
  background: transparent !important;
}

.highlighted-code :deep(.shiki span) {
  color: var(--shiki-light);
}

.dark .highlighted-code :deep(.shiki span) {
  color: var(--shiki-dark);
}

.copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
}

.copy-btn:hover {
  opacity: 1;
  color: var(--vp-c-brand-1);
}
</style>
