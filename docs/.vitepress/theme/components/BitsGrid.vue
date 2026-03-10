<template>
  <div class="bits-grid-container">
    <!-- Search & Filters -->
    <div class="filters-section">
      <!-- Search Bar -->
      <div class="search-bar">
        <Search class="search-icon" :size="20" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search bits..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
          <X :size="18" />
        </button>
      </div>
      
      <!-- Filter Controls -->
      <div class="filter-controls">
        <!-- Category Filters -->
        <div class="filter-group">
          <span class="filter-label">Categories:</span>
          <div class="category-chips">
            <button 
              v-for="cat in visibleCategories"
              :key="cat"
              class="category-chip"
              :class="{ active: selectedCategories.includes(cat) }"
              @click="toggleCategory(cat)"
            >
              <component :is="categoryIcons[cat] || Package" :size="14" class="filter-icon" />
              {{ cat }}
            </button>
            <button 
              v-if="availableCategories.length > MAX_VISIBLE_CATEGORIES"
              class="category-chip expand-chip"
              @click="categoriesExpanded = !categoriesExpanded"
            >
              <component :is="categoriesExpanded ? ChevronUp : ChevronDown" :size="14" class="filter-icon" />
              {{ categoriesExpanded ? 'Show less' : `+${availableCategories.length - MAX_VISIBLE_CATEGORIES} more` }}
            </button>
          </div>
        </div>
        
        <!-- Clear Filters -->
        <button 
          v-if="hasActiveFilters" 
          class="clear-filters-btn"
          @click="clearAllFilters"
        >
          Clear all filters
        </button>
      </div>
    </div>
    
    <!-- Results Summary -->
    <div class="results-summary">
      <span v-if="filteredBits.length === bits.length">
        Showing all {{ bits.length }} bits
      </span>
      <span v-else-if="filteredBits.length === 0">
        No bits match your filters
      </span>
      <span v-else>
        Showing {{ filteredBits.length }} of {{ bits.length }} bits
      </span>
    </div>
    
    <!-- Cards Grid -->
    <div class="cards-grid" v-if="paginatedBits.length > 0">
      <BitsCard 
        v-for="bit in paginatedBits"
        :key="bit.slug"
        :bit="bit"
      />
    </div>
    
    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <Search :size="48" />
      </div>
      <h3>No bits found</h3>
      <p>Try adjusting your search or filters</p>
      <button class="reset-btn" @click="clearAllFilters">
        Reset filters
      </button>
    </div>
    
    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        class="page-btn prev"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        <ChevronLeft :size="18" />
        Previous
      </button>
      
      <div class="page-numbers">
        <button 
          v-for="page in visiblePages"
          :key="page"
          class="page-num"
          :class="{ active: page === currentPage, ellipsis: page === '...' }"
          :disabled="page === '...'"
          @click="page !== '...' && (currentPage = page as number)"
        >
          {{ page }}
        </button>
      </div>
      
      <button 
        class="page-btn next"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        Next
        <ChevronRight :size="18" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BitsCard from './BitsCard.vue'
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Package,
  Brain,
  Sparkles,
  Database,
  HardDrive,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  Github,
  FolderOpen,
  File,
  Globe,
  Server,
  Shield,
  Key,
  Cookie,
  Users,
  Bot,
  Link,
  Plug,
  GitBranch,
  Repeat,
  Terminal,
  Type,
  Braces,
  Hand,
  Play,
} from 'lucide-vue-next'

// Map categories to Lucide icons
const categoryIcons: Record<string, any> = {
  ai: Brain,
  openai: Sparkles,
  anthropic: Sparkles,
  intersect: Sparkles,
  database: Database,
  storage: HardDrive,
  mongodb: Database,
  mysql: Database,
  email: Mail,
  imap: Mail,
  smtp: Mail,
  discord: MessageCircle,
  slack: MessageSquare,
  telegram: Send,
  whatsapp: MessageCircle,
  github: Github,
  filesystem: FolderOpen,
  files: File,
  http: Globe,
  api: Server,
  auth: Shield,
  jwt: Key,
  cookie: Cookie,
  crm: Users,
  agent: Bot,
  langchain: Link,
  mcp: Plug,
  conditional: GitBranch,
  'flow-control': GitBranch,
  'if': GitBranch,
  loop: Repeat,
  shell: Terminal,
  text: Type,
  string: Type,
  json: Braces,
  'hello-world': Hand,
  demo: Play,
}

interface BitInfo {
  slug: string
  packageName: string
  name: string
  displayName: string
  description: string
  version: string
  categories: string[]
  featured: boolean
  icon: string
  actionCount: number
  triggerCount: number
  showcaseCount: number
}

const props = defineProps<{
  bits: BitInfo[]
}>()

const ITEMS_PER_PAGE = 12
const MAX_VISIBLE_CATEGORIES = 10

// State
const searchQuery = ref('')
const selectedCategories = ref<string[]>([])
const currentPage = ref(1)
const categoriesExpanded = ref(false)

// Get all unique categories
const availableCategories = computed(() => {
  const categories = new Set<string>()
  props.bits.forEach(bit => {
    bit.categories.forEach(cat => categories.add(cat))
  })
  return Array.from(categories).sort()
})

// Visible categories (limited unless expanded)
const visibleCategories = computed(() => {
  if (categoriesExpanded.value) {
    return availableCategories.value
  }
  return availableCategories.value.slice(0, MAX_VISIBLE_CATEGORIES)
})

// Filter bits
const filteredBits = computed(() => {
  return props.bits.filter(bit => {
    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      const matchesSearch = 
        bit.displayName.toLowerCase().includes(query) ||
        bit.description.toLowerCase().includes(query) ||
        bit.packageName.toLowerCase().includes(query) ||
        bit.categories.some(cat => cat.toLowerCase().includes(query))
      
      if (!matchesSearch) return false
    }
    
    // Category filter
    if (selectedCategories.value.length > 0) {
      const hasSelectedCategory = selectedCategories.value.some(
        cat => bit.categories.includes(cat)
      )
      if (!hasSelectedCategory) return false
    }
    
    return true
  })
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredBits.value.length / ITEMS_PER_PAGE))

const paginatedBits = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredBits.value.slice(start, start + ITEMS_PER_PAGE)
})

// Visible page numbers
const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    
    if (current > 3) pages.push('...')
    
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    
    for (let i = start; i <= end; i++) pages.push(i)
    
    if (current < total - 2) pages.push('...')
    
    pages.push(total)
  }
  
  return pages
})

// Active filters check
const hasActiveFilters = computed(() => {
  return searchQuery.value !== '' || selectedCategories.value.length > 0
})

// Filter actions
const toggleCategory = (cat: string) => {
  const index = selectedCategories.value.indexOf(cat)
  if (index === -1) {
    selectedCategories.value.push(cat)
  } else {
    selectedCategories.value.splice(index, 1)
  }
}

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedCategories.value = []
}

// Reset page when filters change
watch([searchQuery, selectedCategories], () => {
  currentPage.value = 1
}, { deep: true })
</script>

<style scoped>
.bits-grid-container {
  width: 100%;
}

/* Filters Section */
.filters-section {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
}

/* Search Bar */
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.search-icon {
  position: absolute;
  left: 16px;
  color: var(--vp-c-text-3);
}

.search-input {
  width: 100%;
  padding: 12px 44px;
  font-size: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.search-input::placeholder {
  color: var(--vp-c-text-3);
}

.clear-btn {
  position: absolute;
  right: 12px;
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

/* Filter Controls */
.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.filter-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.85rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
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

.category-chip.expand-chip {
  background: var(--vp-c-bg-soft);
  border-style: dashed;
  color: var(--vp-c-text-3);
}

.category-chip.expand-chip:hover {
  border-color: var(--vp-c-text-2);
  color: var(--vp-c-text-2);
}

.filter-icon {
  flex-shrink: 0;
}

.clear-filters-btn {
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto;
}

.clear-filters-btn:hover {
  background: var(--vp-c-danger-1);
  color: white;
}

/* Results Summary */
.results-summary {
  margin-bottom: 16px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  border: 1px dashed var(--vp-c-divider);
}

.empty-icon {
  margin-bottom: 16px;
  color: var(--vp-c-text-3);
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 1.2rem;
  color: var(--vp-c-text-1);
}

.empty-state p {
  margin: 0 0 20px;
  color: var(--vp-c-text-2);
}

.reset-btn {
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-brand-1);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: var(--vp-c-brand-2);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:not(:disabled):hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-num {
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-num:not(.ellipsis):not(.active):hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.page-num.active {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.page-num.ellipsis {
  cursor: default;
}

/* Responsive */
@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .pagination {
    flex-wrap: wrap;
  }
  
  .page-numbers {
    order: -1;
    width: 100%;
    justify-content: center;
    margin-bottom: 12px;
  }
}
</style>
