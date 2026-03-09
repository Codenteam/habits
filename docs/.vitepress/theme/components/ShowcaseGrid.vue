<template>
  <div class="showcase-grid-container">
    <!-- Search & Filters -->
    <div class="filters-section">
      <!-- Search Bar -->
      <div class="search-bar">
        <Search class="search-icon" :size="20" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search examples..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
          <X :size="18" />
        </button>
      </div>
      
      <!-- Filter Controls -->
      <div class="filter-controls">
        <!-- Tag Filters -->
        <div class="filter-group">
          <span class="filter-label">Tags:</span>
          <div class="tag-chips">
            <button 
              v-for="tag in availableTags"
              :key="tag"
              class="tag-chip"
              :class="{ active: selectedTags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              <component :is="tagIcons[tag] || Tag" :size="14" class="filter-icon" />
              {{ tag }}
            </button>
          </div>
        </div>
        
        <!-- Difficulty Filter -->
        <div class="filter-group">
          <span class="filter-label">Difficulty:</span>
          <div class="difficulty-chips">
            <button 
              v-for="diff in difficulties"
              :key="diff"
              class="difficulty-chip"
              :class="[`diff-${diff}`, { active: selectedDifficulty === diff }]"
              @click="toggleDifficulty(diff)"
            >
              <span class="diff-dot"></span>
              {{ diff }}
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
      <span v-if="filteredExamples.length === examples.length">
        Showing all {{ examples.length }} examples
      </span>
      <span v-else-if="filteredExamples.length === 0">
        No examples match your filters
      </span>
      <span v-else>
        Showing {{ filteredExamples.length }} of {{ examples.length }} examples
      </span>
    </div>
    
    <!-- Cards Grid -->
    <div class="cards-grid" v-if="paginatedExamples.length > 0">
      <ShowcaseCard 
        v-for="example in paginatedExamples"
        :key="example.slug"
        :example="example"
      />
    </div>
    
    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <Search :size="48" />
      </div>
      <h3>No examples found</h3>
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
          @click="page !== '...' && (currentPage = page)"
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
import ShowcaseCard from './ShowcaseCard.vue'
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Tag,
  Bot,
  Zap,
  TrendingUp,
  Plug,
  Eye,
  Database,
  Mail,
  Users,
  DollarSign,
  Heart,
  BookOpen,
  Briefcase,
  Sparkles,
  Code,
  Link2,
} from 'lucide-vue-next'

// Map tags to Lucide icons
const tagIcons: Record<string, any> = {
  ai: Bot,
  automation: Zap,
  productivity: TrendingUp,
  api: Plug,
  frontend: Eye,
  database: Database,
  email: Mail,
  social: Users,
  finance: DollarSign,
  health: Heart,
  education: BookOpen,
  business: Briefcase,
  creative: Sparkles,
  developer: Code,
  integration: Link2,
}

interface Example {
  slug: string
  name: string
  description: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  featured: boolean
  thumbnail: string
  imageCount: number
}

const props = defineProps<{
  examples: Example[]
}>()

const ITEMS_PER_PAGE = 12

// State
const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const selectedDifficulty = ref<string | null>(null)
const currentPage = ref(1)

// Constants
const difficulties = ['beginner', 'intermediate', 'advanced'] as const

// Computed
const availableTags = computed(() => {
  const tags = new Set<string>()
  props.examples.forEach(ex => ex.tags.forEach(t => tags.add(t)))
  return Array.from(tags).sort()
})

const hasActiveFilters = computed(() => {
  return searchQuery.value || selectedTags.value.length > 0 || selectedDifficulty.value
})

const filteredExamples = computed(() => {
  let results = [...props.examples]
  
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    results = results.filter(ex => 
      ex.name.toLowerCase().includes(query) ||
      ex.description.toLowerCase().includes(query) ||
      ex.tags.some(t => t.toLowerCase().includes(query))
    )
  }
  
  // Tag filter
  if (selectedTags.value.length > 0) {
    results = results.filter(ex => 
      selectedTags.value.some(tag => ex.tags.includes(tag))
    )
  }
  
  // Difficulty filter
  if (selectedDifficulty.value) {
    results = results.filter(ex => ex.difficulty === selectedDifficulty.value)
  }
  
  // Sort: featured first, then alphabetically
  return results.sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return a.name.localeCompare(b.name)
  })
})

const totalPages = computed(() => 
  Math.ceil(filteredExamples.value.length / ITEMS_PER_PAGE)
)

const paginatedExamples = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredExamples.value.slice(start, start + ITEMS_PER_PAGE)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages: (number | string)[] = []
  
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

// Methods
const toggleTag = (tag: string) => {
  const idx = selectedTags.value.indexOf(tag)
  if (idx === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(idx, 1)
  }
}

const toggleDifficulty = (diff: string) => {
  selectedDifficulty.value = selectedDifficulty.value === diff ? null : diff
}

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedTags.value = []
  selectedDifficulty.value = null
  currentPage.value = 1
}

// Reset page when filters change
watch([searchQuery, selectedTags, selectedDifficulty], () => {
  currentPage.value = 1
})
</script>

<style scoped>
.showcase-grid-container {
  margin-top: 24px;
}

/* Search Bar */
.search-bar {
  position: relative;
  margin-bottom: 20px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--vp-c-text-3);
}

.search-input {
  width: 100%;
  padding: 14px 48px;
  border: 2px solid var(--vp-c-divider);
  border-radius: 12px;
  font-size: 1rem;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 4px rgba(var(--vp-c-brand-1-rgb), 0.1);
}

.search-input::placeholder {
  color: var(--vp-c-text-3);
}

.clear-btn {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--vp-c-text-3);
  transition: color 0.2s ease;
}

.clear-btn:hover {
  color: var(--vp-c-text-1);
}

.clear-btn svg {
  width: 18px;
  height: 18px;
}

/* Filter Controls */
.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-chips,
.difficulty-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip,
.difficulty-chip {
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tag-chip:hover,
.difficulty-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.tag-chip.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.difficulty-chip.active.diff-beginner {
  background: rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
  color: #22c55e;
}

.difficulty-chip.active.diff-intermediate {
  background: rgba(234, 179, 8, 0.15);
  border-color: #eab308;
  color: #eab308;
}

.difficulty-chip.active.diff-advanced {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #ef4444;
}

.clear-filters-btn {
  align-self: flex-end;
  padding: 8px 16px;
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: auto;
}

.clear-filters-btn:hover {
  background: var(--vp-c-danger-1);
  color: white;
}

/* Results Summary */
.results-summary {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin-bottom: 20px;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  border: 2px dashed var(--vp-c-divider);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
}

.empty-state p {
  margin: 0 0 20px;
  color: var(--vp-c-text-2);
}

.reset-btn {
  padding: 10px 24px;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
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
  gap: 12px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-btn svg {
  width: 16px;
  height: 16px;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-num {
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--vp-c-text-2);
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-num:hover:not(:disabled):not(.active) {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.page-num.active {
  background: var(--vp-c-brand-1);
  color: white;
}

.page-num.ellipsis {
  cursor: default;
  color: var(--vp-c-text-3);
}

@media (max-width: 640px) {
  .filter-controls {
    flex-direction: column;
  }
  
  .pagination {
    flex-direction: column;
    gap: 16px;
  }
  
  .page-numbers {
    order: -1;
  }
}
</style>
