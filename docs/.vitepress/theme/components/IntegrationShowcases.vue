<template>
  <section v-if="visibleShowcases.length > 0" class="integration-showcases">
    <h2>Used in Showcases</h2>
    <ul>
      <li v-for="item in visibleShowcases" :key="item.slug">
        <a :href="withBase(`/showcase/${item.slug}`)">{{ item.name }}</a>
        <span v-if="item.note" class="showcase-note"> ({{ item.note }})</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import showcaseData from '../data/integration-showcases.json'

interface ShowcaseEntry {
  slug: string
  name: string
  note?: string
  /** When true, hidden from docs until the showcase page is ready */
  improving?: boolean
}

const props = defineProps<{
  integration: string
}>()

const visibleShowcases = computed(() => {
  const entries = (showcaseData as Record<string, ShowcaseEntry[]>)[props.integration] ?? []
  return entries.filter((entry) => !entry.improving)
})
</script>

<style scoped>
.integration-showcases {
  margin-top: 2rem;
}

.showcase-note {
  color: var(--vp-c-text-2);
}
</style>
