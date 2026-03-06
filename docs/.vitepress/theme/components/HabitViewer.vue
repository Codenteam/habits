<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{
  content?: string
  url?: string
  hideControls?: boolean
  fitView?: boolean
  height?: number | string
}>()

// Use local viewer in dev mode, production URL otherwise
const baseUrl = computed(() => {
  // VitePress dev mode detection
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'

  // Use prod viewer always for now.
  // return 'https://codenteam.com/intersect/habits/viewer/';
  return isDev 
    ? 'http://localhost:3030/intersect/habits/viewer/'
    : 'https://codenteam.com/intersect/habits/viewer/'
  
})

// Resolve URL to absolute, including VitePress base path
const resolvedUrl = computed(() => {
  if (!props.url) return null
  
  // If already absolute, use as-is
  if (props.url.startsWith('http://') || props.url.startsWith('https://')) {
    return props.url
  }
  
  // SSR check
  if (typeof window === 'undefined') return props.url
  
  // Resolve relative URL with VitePress base
  const pathWithBase = withBase(props.url)
  return `${window.location.origin}${pathWithBase}`
})

const viewerUrl = computed(() => {
  const params = new URLSearchParams()
  
  // Pass either URL or content to the viewer
  if (resolvedUrl.value) {
    params.set('url', resolvedUrl.value)
  } else if (props.content) {
    params.set('habit', encodeURIComponent(props.content))
  }
  
  if (props.hideControls) params.set('hideControls', 'false')
  if (props.fitView !== false) params.set('fitView', 'true')
  return `${baseUrl.value}?${params.toString()}`
})

const frameHeight = computed(() => {
  const h = props.height ?? 400
  return typeof h === 'number' ? `${h}px` : h
})

const hasSource = computed(() => props.url || props.content)
</script>

<template>
  <iframe
    v-if="hasSource"
    :src="viewerUrl"
    width="100%"
    :height="frameHeight"
    style="border: 1px solid #334155; border-radius: 8px;"
    allow="fullscreen"
  ></iframe>
  <div v-else class="habit-viewer-error" :style="{ height: frameHeight }">
    <span>No habit content or URL provided</span>
  </div>
</template>

<style scoped>
.habit-viewer-error {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #1e293b;
  color: #f87171;
}
</style>
