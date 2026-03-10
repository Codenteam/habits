<template>
  <div 
    class="showcase-card" 
    :class="{ featured: example.featured }"
    @click="navigateToExample"
  >
    <!-- Featured Badge -->
    <div v-if="example.featured" class="featured-badge">
      <Star class="badge-icon" :size="12" fill="currentColor" :stroke-width="0" />
    </div>
    
    <!-- Image Container -->
    <div class="card-image">
      <img 
        :src="withBase(example.thumbnail)" 
        :alt="example.name"
        loading="lazy"
      />
      <div class="image-overlay">
      </div>
      <div v-if="example.imageCount > 1" class="image-count">
        <Images :size="14" />
        {{ example.imageCount }}
      </div>
    </div>
    
    <!-- Card Content -->
    <div class="card-content">
      <h3 class="card-title">{{ example.name }}</h3>
      <p class="card-description">{{ example.description }}</p>
      
      <!-- Tags -->
      <div class="card-tags">
        <span 
          v-for="tag in example.tags.slice(0, 3)" 
          :key="tag" 
          class="tag"
          :class="`tag-${tag}`"
        >
          <component :is="tagIcons[tag] || Tag" :size="12" class="tag-icon" />
          {{ tag }}
        </span>
        <span v-if="example.tags.length > 3" class="tag tag-more">
          +{{ example.tags.length - 3 }}
        </span>
      </div>
      
      <!-- Footer -->
      <div class="card-footer">
        <span class="difficulty" :class="`difficulty-${example.difficulty}`">
          <span class="difficulty-dot"></span>
          {{ example.difficulty }}
        </span>
        <a 
          :href="withBase(`/showcase/${example.slug}`)" 
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
import { withBase, useRouter } from 'vitepress'
import {
  Star,
  Images,
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
  example: Example
}>()

const router = useRouter()

const navigateToExample = () => {
  router.go(withBase(`/showcase/${props.example.slug}`))
}
</script>

<style scoped>
.showcase-card {
  position: relative;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--vp-c-divider);
}

/* Gradient border effect */
.showcase-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(6, 182, 212, 0.4) 50%, rgba(236, 72, 153, 0.4) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 10;
}

.showcase-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 
    0 20px 40px rgba(139, 92, 246, 0.15),
    0 0 60px rgba(6, 182, 212, 0.1);
  border-color: transparent;
}

.showcase-card:hover::before {
  opacity: 1;
}

.showcase-card.featured {
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(145deg, rgba(139, 92, 246, 0.05) 0%, rgba(6, 182, 212, 0.03) 100%);
}

.featured-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  display: flex;
  align-items: center;
  gap: 4px;
}

.featured-badge .badge-icon {
  width: 12px;
  height: 12px;
}

.card-image {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  filter: saturate(0.7) contrast(1.1) brightness(0.95);
}

.showcase-card:hover .card-image img {
  transform: scale(1.08);
  filter: saturate(1) contrast(1) brightness(1);
  box-shadow: 
    0 12px 40px rgba(139, 92, 246, 0.3),
    0 0 20px rgba(6, 182, 212, 0.2);
}

/* Holographic scanline overlay */
.card-image::after {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(139, 92, 246, 0.03) 2px,
      rgba(139, 92, 246, 0.03) 4px
    ),
    linear-gradient(
      135deg,
      rgba(15, 23, 42, 0.4) 0%,
      rgba(88, 28, 135, 0.25) 50%,
      rgba(6, 182, 212, 0.2) 100%
    );
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.4s ease;
  z-index: 1;
}

.showcase-card:hover .card-image::after {
  opacity: 0;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
}

.showcase-card:hover .image-overlay {
  opacity: 1;
}

.view-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
  color: white;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.85rem;
  transform: translateY(10px);
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
}

.showcase-card:hover .view-btn {
  transform: translateY(0);
}

.view-btn:hover {
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.6);
}

.image-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(4px);
  z-index: 3;
}

.image-count svg {
  width: 14px;
  height: 14px;
}

.card-content {
  padding: 20px;
}

.card-title {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.card-description {
  margin: 0 0 16px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.tag {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag :deep(.tag-icon) {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}


.tag-more {
  background: var(--vp-c-divider);
  color: var(--vp-c-text-3);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--vp-c-divider);
}

.difficulty {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 6px;
}

.difficulty-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.difficulty-beginner { color: #22c55e; }
.difficulty-intermediate { color: #eab308; }
.difficulty-advanced { color: #ef4444; }

.details-link {
  font-size: 0.85rem;
  color: #8b5cf6;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  padding: 4px 10px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
}

.details-link:hover {
  color: #a78bfa;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
}
</style>
