<template>
  <div class="integrations-grid-container">
    <div class="filters-section">
      <div class="search-bar">
        <Search class="search-icon" :size="20" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search integrations..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
          <X :size="18" />
        </button>
      </div>

      <div class="filter-controls">
        <div class="filter-group">
          <span class="filter-label">Categories:</span>
          <div class="category-chips">
            <button
              v-for="cat in availableCategories"
              :key="cat"
              class="category-chip"
              :class="{ active: selectedCategories.includes(cat) }"
              @click="toggleCategory(cat)"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <button
          v-if="hasActiveFilters"
          class="clear-filters-btn"
          @click="clearAllFilters"
        >
          Clear all filters
        </button>
      </div>
    </div>

    <div class="results-summary">
      <span v-if="filteredIntegrations.length === integrations.length">
        Showing all {{ integrations.length }} integrations
      </span>
      <span v-else-if="filteredIntegrations.length === 0">
        No integrations match your filters
      </span>
      <span v-else>
        Showing {{ filteredIntegrations.length }} of {{ integrations.length }} integrations
      </span>
    </div>

    <div class="cards-grid" v-if="filteredIntegrations.length > 0">
      <IntegrationsCard
        v-for="integration in filteredIntegrations"
        :key="integration.slug"
        :integration="integration"
      />
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">
        <Search :size="48" />
      </div>
      <h3>No integrations found</h3>
      <p>Try adjusting your search or filters</p>
      <button class="reset-btn" @click="clearAllFilters">
        Reset filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import IntegrationsCard from './IntegrationsCard.vue'
import { Search, X } from 'lucide-vue-next'

interface IntegrationInfo {
  slug: string
  name: string
  description: string
  categories: string[]
  bitPackage?: string
  showcaseCount: number
  icon?: string
}

const props = defineProps<{
  integrations: IntegrationInfo[]
}>()

const searchQuery = ref('')
const selectedCategories = ref<string[]>([])

const availableCategories = computed(() => {
  const categories = new Set<string>()
  props.integrations.forEach((integration) => {
    integration.categories.forEach((cat) => categories.add(cat))
  })
  return Array.from(categories).sort()
})

const hasActiveFilters = computed(() => {
  return searchQuery.value.length > 0 || selectedCategories.value.length > 0
})

const filteredIntegrations = computed(() => {
  let result = props.integrations

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((integration) => {
      return (
        integration.name.toLowerCase().includes(query) ||
        integration.description.toLowerCase().includes(query) ||
        integration.bitPackage?.toLowerCase().includes(query) ||
        integration.categories.some((cat) => cat.toLowerCase().includes(query))
      )
    })
  }

  if (selectedCategories.value.length > 0) {
    result = result.filter((integration) =>
      integration.categories.some((cat) => selectedCategories.value.includes(cat))
    )
  }

  return result
})

function toggleCategory(cat: string) {
  const index = selectedCategories.value.indexOf(cat)
  if (index === -1) {
    selectedCategories.value.push(cat)
  } else {
    selectedCategories.value.splice(index, 1)
  }
}

function clearAllFilters() {
  searchQuery.value = ''
  selectedCategories.value = []
}
</script>

<style scoped>
.integrations-grid-container {
  margin-top: 24px;
}

.filters-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 40px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.95em;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 4px;
  display: flex;
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 0.85em;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-chip {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.15s;
}

.category-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.category-chip.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.clear-filters-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.8em;
  cursor: pointer;
}

.results-summary {
  font-size: 0.85em;
  color: var(--vp-c-text-3);
  margin-bottom: 16px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--vp-c-text-2);
}

.empty-icon {
  color: var(--vp-c-text-3);
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
}

.reset-btn {
  margin-top: 16px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  cursor: pointer;
  font-size: 0.9em;
}
</style>
