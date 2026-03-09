<template>
  <div class="habit-viewer-tabs">
    <!-- Tab Headers -->
    <div class="tabs-header">
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab-btn"
        :class="{ active: activeTab === index }"
        @click="activeTab = index"
      >
        <span class="tab-icon">📋</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>
    
    <!-- Tab Content -->
    <div class="tabs-content">
      <div 
        v-for="(tab, index) in tabs" 
        :key="index"
        v-show="activeTab === index"
        class="tab-panel"
      >
        <HabitViewer 
          :content="tab.content" 
          :hide-controls="hideControls"
          :fit-view="fitView"
          :height="height"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HabitViewer from './HabitViewer.vue'

interface HabitTab {
  label: string
  content: string
}

withDefaults(defineProps<{
  tabs: HabitTab[]
  hideControls?: boolean
  fitView?: boolean
  height?: number | string
}>(), {
  hideControls: true,
  fitView: true,
  height: 500
})

const activeTab = ref(0)
</script>

<style scoped>
.habit-viewer-tabs {
  margin: 24px 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.tabs-header {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 8px 8px 0;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: transparent;
  border: none;
  border-radius: 8px 8px 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.tab-btn:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.tab-btn.active {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--vp-c-brand-1);
  border-radius: 2px 2px 0 0;
}

.tab-icon {
  font-size: 1rem;
}

.tab-label {
  white-space: nowrap;
}

.tabs-content {
  padding: 16px;
}

.tab-panel {
  border-radius: 8px;
  overflow: hidden;
}

@media (max-width: 640px) {
  .tabs-header {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  
  .tab-btn {
    padding: 8px 14px;
    font-size: 0.85rem;
  }
}
</style>
