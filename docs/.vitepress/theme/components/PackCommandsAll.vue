<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { codeToHtml } from 'shiki'

const props = withDefaults(defineProps<{
  appName?: string
  configPath?: string
}>(), {
  appName: 'MyApp',
  configPath: './stack.yaml',
})

const kebabName = computed(() =>
  props.appName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
)

const command = computed(() =>
  `npx habits pack --config ${props.configPath} --format habit --output ./${kebabName.value}.habit`
)

const description =
  'Self-contained .habit file for import into Habits Cortex on desktop and mobile. No native app build required.'

const highlightedCode = ref('')

onMounted(async () => {
  highlightedCode.value = await codeToHtml(command.value, {
    lang: 'bash',
    themes: { light: 'github-light', dark: 'github-dark' },
  })
})

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="pack-commands-single">
    <div class="code-block">
      <button class="copy-btn" @click="copyToClipboard(command)" title="Copy to clipboard">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <p class="cmd-description">{{ description }}</p>
      <div v-if="highlightedCode" class="highlighted-code" v-html="highlightedCode"></div>
      <pre v-else><code>{{ command }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.pack-commands-single {
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.code-block {
  position: relative;
  background: var(--vp-code-block-bg);
  padding: 1rem;
}

.copy-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.375rem;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.2s;
  z-index: 10;
}

.copy-btn:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.cmd-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.highlighted-code :deep(pre) {
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow-x: auto;
}

.highlighted-code :deep(code) {
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  line-height: 1.6;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

pre code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}
</style>
