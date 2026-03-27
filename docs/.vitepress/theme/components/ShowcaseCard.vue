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
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(14, 165, 233, 0.4) 50%, rgba(168, 85, 247, 0.4) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 10;
}

.showcase-card:hover::before {
  opacity: 1;
}

.showcase-card:hover {
  transform: translateY(-4px);
  box-shadow: 
    0 20px 40px -15px rgba(0, 0, 0, 0.2),
    0 0 20px rgba(99, 102, 241, 0.1);
}

.showcase-card.featured {
  border-color: rgba(99, 102, 241, 0.3);
}

/* Featured Badge - matches BitsCard style */
.featured-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  color: gold;
  padding: 4px 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  z-index: 10;
}

.featured-badge .badge-icon {
  width: 12px;
  height: 12px;
}

.card-image {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.showcase-card:hover .card-image img {
  transform: scale(1.05);
}

/* Gradient overlay on images */
.image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(15, 23, 42, 0.3) 0%,
    rgba(99, 102, 241, 0.15) 50%,
    rgba(14, 165, 233, 0.15) 100%
  );
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.image-overlay img{

}
.showcase-card:hover .image-overlay {
  opacity: 0.5;
}

.image-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 8px;
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
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.card-description {
  margin: 0;
  font-size: 0.875rem;
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
}

.tag {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
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
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--vp-c-divider);
}

.difficulty {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
}

.difficulty-beginner { color: #22c55e; }
.difficulty-intermediate { color: #eab308; }
.difficulty-advanced { color: #ef4444; }

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
