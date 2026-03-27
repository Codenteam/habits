<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  examplePath: string  // e.g., "mixed" or "minimal-blog"
  fileName?: string    // Optional custom filename
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

interface DownloadOption {
  type: 'habit' | 'zip' | 'app'
  label: string
  filename: string
  platform?: string
  exists: boolean
}

// Available download options based on what files exist
const downloadOptions = computed<DownloadOption[]>(() => {
  const options: DownloadOption[] = []
  
  // Always add .habit option (primary)
  options.push({
    type: 'habit',
    label: 'Portable (.habit)',
    filename: `${props.examplePath}.habit`,
    exists: true // Assume exists; will be checked at runtime
  })
  
  // Always add .zip option (secondary)
  options.push({
    type: 'zip',
    label: 'Source (.zip)',
    filename: props.fileName || `${props.examplePath}.zip`,
    exists: true
  })
  
  return options
})

const primaryDownload = computed(() => downloadOptions.value[0])

function getDownloadUrl(filename: string): string {
  return `/intersect/habits/showcase/${props.examplePath}/${filename}`
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="download-example" ref="dropdownRef">
    <div class="download-button-group">
      <!-- Primary download button -->
      <a :href="getDownloadUrl(primaryDownload.filename)" class="download-btn primary" download>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Download {{ primaryDownload.filename }}</span>
      </a>
      
      <!-- Dropdown toggle button -->
      <button 
        v-if="downloadOptions.length > 1" 
        class="dropdown-toggle" 
        @click.stop="toggleDropdown"
        :aria-expanded="isOpen"
        aria-label="More download options"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'rotate': isOpen }">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>
    
    <!-- Dropdown menu -->
    <div v-if="isOpen && downloadOptions.length > 1" class="dropdown-menu">
      <a 
        v-for="option in downloadOptions" 
        :key="option.filename"
        :href="getDownloadUrl(option.filename)"
        class="dropdown-item"
        download
        @click="closeDropdown"
      >
        <span class="option-icon">
          <!-- Habit icon -->
          <svg v-if="option.type === 'habit'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <!-- Zip icon -->
          <svg v-else-if="option.type === 'zip'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <!-- App/platform icon -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        </span>
        <span class="option-label">{{ option.filename }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.download-example {
  margin: 1rem 0;
  position: relative;
  display: inline-block;
}

.download-button-group {
  display: inline-flex;
  border-radius: 6px;
  overflow: hidden;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: #3b82f6;
  color: white;
  font-weight: 500;
  font-size: 0.875rem;
  text-decoration: none;
  transition: background 0.2s;
  border: none;
  cursor: pointer;
}

.download-btn.primary {
  border-radius: 6px 0 0 6px;
}

.download-btn:hover {
  background: #1d4ed8;
}

.download-btn svg {
  flex-shrink: 0;
}

.dropdown-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-toggle:hover {
  background: #1d4ed8;
}

.dropdown-toggle svg {
  transition: transform 0.2s;
}

.dropdown-toggle svg.rotate {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 280px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--vp-c-bg-soft);
}

.dropdown-item + .dropdown-item {
  border-top: 1px solid var(--vp-c-divider);
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.dropdown-item:hover .option-icon {
  color: #3b82f6;
}

.option-label {
  font-weight: 500;
  font-size: 0.875rem;
}

.option-filename {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.download-note {
  margin: 0.5rem 0 0 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
</style>
