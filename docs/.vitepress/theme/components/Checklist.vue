<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import {
  ClipboardList,
  Package,
  Rocket,
  Wrench,
  BookOpen,
  Monitor,
  type LucideIcon,
} from 'lucide-vue-next'

const props = defineProps<{
  /** Checklist file name without .md extension (e.g., "documentation-reading") */
  name: string
  /** Custom title for the details summary */
  title?: string
  /** Icon name (Lucide icon key) to display before title */
  icon?: string
  /** Start expanded (default: false) */
  expanded?: boolean
}>()

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  clipboard: ClipboardList,
  package: Package,
  rocket: Rocket,
  wrench: Wrench,
  book: BookOpen,
  monitor: Monitor,
}

const isOpen = ref(props.expanded ?? false)
const contentRef = ref<HTMLElement | null>(null)

const displayTitle = computed(() => {
  if (props.title) return props.title
  // Convert kebab-case to Title Case
  return props.name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})

// Generate slug ID for anchor linking (used by VitePress outline)
const slugId = computed(() => {
  return displayTitle.value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
})

const IconComponent = computed(() => {
  const iconName = props.icon ?? 'clipboard'
  return iconMap[iconName] ?? ClipboardList
})

// Convert markdown [ ] and [x] to actual checkboxes
const convertCheckboxes = () => {
  if (!contentRef.value) return
  
  const listItems = contentRef.value.querySelectorAll('li')
  listItems.forEach((li) => {
    // Check if already converted
    if (li.querySelector('input[type="checkbox"]')) return
    
    const text = li.innerHTML
    // Match [ ] or [x] at the start of list item content
    const uncheckedMatch = text.match(/^\s*\[\s*\]/)
    const checkedMatch = text.match(/^\s*\[x\]/i)
    
    if (uncheckedMatch || checkedMatch) {
      const isChecked = !!checkedMatch
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = isChecked
      
      // Remove the [ ] or [x] from text
      li.innerHTML = text.replace(/^\s*\[[\sx]?\]\s*/i, '')
      li.insertBefore(checkbox, li.firstChild)
    }
  })
}

onMounted(() => {
  nextTick(convertCheckboxes)
})

watch(isOpen, (open) => {
  if (open) {
    nextTick(convertCheckboxes)
  }
})
</script>

<template>
  <details class="checklist-details" :open="isOpen">
    <summary class="checklist-summary" @click.prevent="isOpen = !isOpen">
      <span class="checklist-chevron" :class="{ open: isOpen }">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </span>
      <span class="checklist-icon">
        <component :is="IconComponent" :size="18" />
      </span>
      <h2 :id="slugId" class="checklist-title">{{ displayTitle }}</h2>
    </summary>
    <div ref="contentRef" class="checklist-content">
      <slot></slot>
    </div>
  </details>
</template>

<style scoped>
.checklist-details {
  margin: 1rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}

.checklist-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  transition: background 0.2s;
  list-style: none;
}

.checklist-summary::-webkit-details-marker {
  display: none;
}

.checklist-summary::marker {
  display: none;
}

.checklist-summary:hover {
  background: var(--vp-c-bg-mute);
}

.checklist-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.checklist-title {
  flex: 1;
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  padding-top: 0;
  border-top: 0;
}

.checklist-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  transition: transform 0.2s ease;
}

.checklist-chevron.open {
  transform: rotate(90deg);
}

.checklist-content {
  padding: 1rem;
  border-top: 1px solid var(--vp-c-divider);
}

.checklist-content :deep(h2) {
  display: none;
}

.checklist-content :deep(h3) {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.checklist-content :deep(h3:first-child) {
  margin-top: 0;
}

.checklist-content :deep(ul) {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.checklist-content :deep(li) {
  /* display: flex; */
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0.5rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.checklist-content :deep(input[type="checkbox"]) {
  margin-top: 0.25rem;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
  margin-right: 15px;
  vertical-align: middle;
}

.checklist-content :deep(a) {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.checklist-content :deep(a:hover) {
  text-decoration: underline;
}
</style>
