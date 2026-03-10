<template>
  <div 
    class="bits-card" 
    :class="{ featured: bit.featured }"
    @click="navigateToBit"
  >
    <!-- Featured Badge -->
    <div v-if="bit.featured" class="featured-badge">
      <Star class="badge-icon" :size="12" fill="currentColor" :stroke-width="0" />
    </div>
    
    <!-- Card Header with Icon -->
    <div class="card-header">
      <div class="bit-icon">
        <component :is="iconComponent" :size="32" />
      </div>
      <div class="bit-info">
        <h3 class="card-title">{{ bit.displayName }}</h3>
        <code class="package-name">{{ bit.packageName }}</code>
      </div>
    </div>
    
    <!-- Card Content -->
    <div class="card-content">
      <p class="card-description">{{ bit.description }}</p>
      
      <!-- Categories -->
      <div class="card-categories">
        <span 
          v-for="cat in bit.categories.slice(0, 3)" 
          :key="cat" 
          class="category"
        >
          {{ cat }}
        </span>
        <span v-if="bit.categories.length > 3" class="category category-more">
          +{{ bit.categories.length - 3 }}
        </span>
      </div>
      
      <!-- Stats -->
      <div class="card-stats">
        <span class="stat" v-if="bit.actionCount > 0">
          <Zap :size="14" />
          {{ bit.actionCount }} action{{ bit.actionCount !== 1 ? 's' : '' }}
        </span>
        <span class="stat" v-if="bit.triggerCount > 0">
          <Radio :size="14" />
          {{ bit.triggerCount }} trigger{{ bit.triggerCount !== 1 ? 's' : '' }}
        </span>
        <span class="stat" v-if="bit.showcaseCount > 0">
          <Eye :size="14" />
          {{ bit.showcaseCount }} showcase{{ bit.showcaseCount !== 1 ? 's' : '' }}
        </span>
        <span class="stat" v-if="bit.downloads > 0">
          <Download :size="14" />
          {{ bit.downloadsFormatted }}
        </span>
      </div>
      
      <!-- Footer -->
      <div class="card-footer">
        <span class="version">v{{ bit.version }}</span>
        <a 
          :href="withBase(`/bits/${bit.slug}`)" 
          class="details-link"
          @click.stop
        >
          Learn more
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useRouter } from 'vitepress'
import {
  Star,
  Zap,
  Radio,
  Eye,
  Download,
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

// Map icon names to components
const iconMap: Record<string, any> = {
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
  downloads: number
  downloadsFormatted: string
}

const props = defineProps<{
  bit: BitInfo
}>()

const router = useRouter()

const iconComponent = computed(() => {
  return iconMap[props.bit.icon] || Package
})

const navigateToBit = () => {
  router.go(withBase(`/bits/${props.bit.slug}`))
}
</script>

<style scoped>
.bits-card {
  position: relative;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--vp-c-divider);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Gradient border effect */
.bits-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(14, 165, 233, 0.4) 50%, rgba(168, 85, 247, 0.4) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.bits-card:hover::before {
  opacity: 1;
}

.bits-card:hover {
  transform: translateY(-4px);
  box-shadow: 
    0 20px 40px -15px rgba(0, 0, 0, 0.2),
    0 0 20px rgba(99, 102, 241, 0.1);
}

.bits-card.featured {
  border-color: rgba(99, 102, 241, 0.3);
}

/* Featured Badge */
.featured-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
  padding: 4px 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

/* Header */
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.bit-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-soft);
  border-radius: 12px;
  color: var(--vp-c-brand-1);
}

.bit-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 4px;
  line-height: 1.3;
}

.package-name {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: 4px;
}

/* Content */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.card-description {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Categories */
.card-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.category-more {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

/* Stats */
.card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.stat svg {
  color: var(--vp-c-brand-1);
}

/* Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--vp-c-divider);
}

.version {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.details-link {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.details-link:hover {
  color: var(--vp-c-brand-2);
}
</style>
