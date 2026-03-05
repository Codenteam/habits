<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  examplePath: string  // e.g., "mixed" or "minimal-blog"
  fileName?: string    // Optional custom filename
}>()

const downloadUrl = computed(() => {
  const name = props.fileName || `${props.examplePath}.zip`
  return `/intersect/habits/downloads/${name}`
})

const displayName = computed(() => {
  return props.fileName || `${props.examplePath}.zip`
})
</script>

<template>
  <div class="download-example">
    <a :href="downloadUrl" class="download-btn" download>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Download {{ displayName }}</span>
    </a>
    <p class="download-note">Ready-to-run example (you need to create .env if needed)</p>
  </div>
</template>

<style scoped>
.download-example {
  margin: 1rem 0;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--vp-c-brand-1);
  opacity: 0.9;
  color: var(--vp-c-white);
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s;
}

.download-btn:hover {
  transform: translateY(-1px);
}

.download-btn svg {
  flex-shrink: 0;
}

.download-note {
  margin: 0.5rem 0 0 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
</style>
