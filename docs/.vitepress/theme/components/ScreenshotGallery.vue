<template>
  <div :class="['screenshot-gallery', layout === 'grid' ? 'grid-layout' : 'row-layout']">
    <template v-if="layout === 'grid'">
      <div v-for="(item, index) in screenshots" :key="item.img" class="screenshot-item">
        <img 
          :src="withBase(item.img)" 
          :alt="item.caption" 
          style="cursor: pointer; object-fit: cover; height: 200px;"
          @click="openLightbox(index)" 
        />
        <a v-if="item.link" :href="withBase(item.link)" class="caption">{{ item.caption }}</a>
        <span v-else class="caption">{{ item.caption }}</span>
      </div>
    </template>
    <template v-else>
      <div 
        v-for="(row, rowIndex) in rows" 
        :key="rowIndex" 
        class="screenshot-row"
      >
        <figure v-for="(item, itemIndex) in row" :key="item.img">
          <img 
            :src="withBase(item.img)" 
            :alt="item.caption" 
            style="cursor: pointer; object-fit: cover; height: 200px;"
            @click="openLightbox(rowIndex * columns + itemIndex)" 
          />
          <figcaption>{{ item.caption }}</figcaption>
        </figure>
      </div>
    </template>
  </div>

  <!-- Lightbox Modal -->
  <Teleport to="body">
    <div v-if="lightboxVisible" class="lightbox" @click="closeLightbox">
      <span class="lightbox-close" @click="closeLightbox">&times;</span>
      
      <!-- Navigation Arrows -->
      <button 
        v-if="screenshots.length > 1" 
        class="lightbox-nav lightbox-prev" 
        @click.stop="prevImage"
        :disabled="currentIndex === 0"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <img :src="lightboxImg" class="lightbox-content" @click.stop />
      
      <button 
        v-if="screenshots.length > 1" 
        class="lightbox-nav lightbox-next" 
        @click.stop="nextImage"
        :disabled="currentIndex === screenshots.length - 1"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
      
      <a v-if="lightboxLink" :href="lightboxLink" class="lightbox-caption" @click.stop>{{ lightboxCaption }}</a>
      <div v-else class="lightbox-caption" @click.stop>
        {{ lightboxCaption }}
        <span v-if="screenshots.length > 1" class="lightbox-counter">{{ currentIndex + 1 }} / {{ screenshots.length }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { withBase } from 'vitepress'

interface Screenshot {
  img: string
  caption: string
  link?: string
}

const props = withDefaults(defineProps<{
  screenshots: Screenshot[]
  layout?: 'grid' | 'rows'
  columns?: number
}>(), {
  layout: 'grid',
  columns: 2
})

// Compute rows for row-based layout
const rows = computed(() => {
  if (props.layout !== 'rows') return []
  const result: Screenshot[][] = []
  for (let i = 0; i < props.screenshots.length; i += props.columns) {
    result.push(props.screenshots.slice(i, i + props.columns))
  }
  return result
})

// Lightbox state
const lightboxVisible = ref(false)
const lightboxImg = ref('')
const lightboxCaption = ref('')
const lightboxLink = ref<string | undefined>(undefined)
const currentIndex = ref(0)

const updateLightboxContent = (index: number) => {
  const item = props.screenshots[index]
  if (item) {
    lightboxImg.value = withBase(item.img)
    lightboxCaption.value = item.caption
    lightboxLink.value = item.link ? withBase(item.link) : undefined
    currentIndex.value = index
  }
}

const openLightbox = (index: number) => {
  updateLightboxContent(index)
  lightboxVisible.value = true
  document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  lightboxVisible.value = false
  document.body.style.overflow = ''
}

const prevImage = () => {
  if (currentIndex.value > 0) {
    updateLightboxContent(currentIndex.value - 1)
  }
}

const nextImage = () => {
  if (currentIndex.value < props.screenshots.length - 1) {
    updateLightboxContent(currentIndex.value + 1)
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeLightbox()
  } else if (e.key === 'ArrowLeft') {
    prevImage()
  } else if (e.key === 'ArrowRight') {
    nextImage()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* Grid layout - Futuristic */
.screenshot-gallery.grid-layout {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin: 48px 0;
  padding: 32px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(88, 28, 135, 0.03) 100%);
  border-radius: 24px;
  position: relative;
}

.screenshot-gallery.grid-layout::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 24px;
  padding: 1px;
  /* background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.3), rgba(139, 92, 246, 0.1)); */
  /* -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); */
  /* mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); */
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.grid-layout .screenshot-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  padding: 12px;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  backdrop-filter: blur(10px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.grid-layout .screenshot-item::before {
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
}

.grid-layout .screenshot-item:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 
    0 20px 40px rgba(139, 92, 246, 0.15),
    0 0 60px rgba(6, 182, 212, 0.1);
}

.grid-layout .screenshot-item:hover::before {
  opacity: 1;
}

.grid-layout .screenshot-item img {
  width: 100%;
  height: 200px;
  border-radius: 12px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  object-fit: cover;
  position: relative;
  filter: saturate(0.7) contrast(1.1) brightness(0.95);
}

.grid-layout .screenshot-item:hover img {
  box-shadow: 
    0 12px 40px rgba(139, 92, 246, 0.3),
    0 0 20px rgba(6, 182, 212, 0.2);
  filter: saturate(1) contrast(1) brightness(1);
}

/* Futuristic scanline/holographic overlay */
.grid-layout .screenshot-item::after {
  content: '';
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  height: 200px;
  border-radius: 12px;
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

.grid-layout .screenshot-item:hover::after {
  opacity: 0;
}

.grid-layout .screenshot-item .caption {
  font-size: 13px;
  color: var(--vp-c-text-2);
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 6px 12px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
}

.grid-layout .screenshot-item a.caption:hover {
  color: #8b5cf6;
  text-decoration: none;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
}

/* Row layout - Futuristic */
.screenshot-gallery.row-layout {
  margin: 32px 0;
  padding: 24px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.02) 0%, rgba(88, 28, 135, 0.02) 100%);
  border-radius: 20px;
}

.screenshot-row {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.screenshot-row figure {
  flex: 1;
  margin: 0;
  text-align: center;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
  backdrop-filter: blur(8px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.screenshot-row figure::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.3));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.screenshot-row figure:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(139, 92, 246, 0.12);
}

.screenshot-row figure:hover::before {
  opacity: 1;
}

.screenshot-row img {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  filter: saturate(0.7) contrast(1.1) brightness(0.95);
}

.screenshot-row figure:hover img {
  box-shadow: 
    0 12px 32px rgba(139, 92, 246, 0.25),
    0 0 16px rgba(6, 182, 212, 0.15);
  filter: saturate(1) contrast(1) brightness(1);
}

/* Futuristic scanline overlay for row layout */
.screenshot-row figure::after {
  content: '';
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  bottom: 40px;
  border-radius: 12px;
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

.screenshot-row figure:hover::after {
  opacity: 0;
}

.screenshot-row figcaption {
  margin-top: 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive */
@media (max-width: 768px) {
  .screenshot-gallery.grid-layout {
    grid-template-columns: repeat(2, 1fr);
    padding: 20px;
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .screenshot-row {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .screenshot-gallery.grid-layout {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* Lightbox styles - Futuristic global to work with Teleport */
.lightbox {
  display: flex;
  position: fixed;
  z-index: 9999;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%);
  backdrop-filter: blur(20px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  animation: lightboxFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes lightboxFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(20px);
  }
}

.lightbox-close {
  position: absolute;
  top: 24px;
  right: 40px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #fff;
  font-size: 28px;
  font-weight: 300;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.lightbox-close:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(6, 182, 212, 0.4) 100%);
  border-color: rgba(139, 92, 246, 0.6);
  box-shadow: 
    0 0 30px rgba(139, 92, 246, 0.4),
    0 0 60px rgba(6, 182, 212, 0.2);
  transform: rotate(90deg);
}

.lightbox-content {
  max-width: 90%;
  max-height: 80vh;
  border-radius: 16px;
  box-shadow: 
    0 24px 80px rgba(0, 0, 0, 0.6),
    0 0 100px rgba(139, 92, 246, 0.15),
    0 0 40px rgba(6, 182, 212, 0.1);
  object-fit: contain;
  animation: lightboxImageIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes lightboxImageIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.lightbox-caption {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 500;
  margin-top: 24px;
  text-align: center;
  max-width: 80%;
  text-decoration: none;
  transition: all 0.3s ease;
  padding: 12px 24px;
  border-radius: 30px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: lightboxCaptionIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
}

@keyframes lightboxCaptionIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

a.lightbox-caption:hover {
  color: #fff;
  text-decoration: none;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(6, 182, 212, 0.3) 100%);
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
}

/* Navigation Arrows */
.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.lightbox-nav svg {
  width: 28px;
  height: 28px;
  transition: transform 0.3s ease;
}

.lightbox-prev {
  left: 24px;
}

.lightbox-next {
  right: 24px;
}

.lightbox-nav:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(6, 182, 212, 0.4) 100%);
  border-color: rgba(139, 92, 246, 0.6);
  box-shadow: 
    0 0 30px rgba(139, 92, 246, 0.4),
    0 0 60px rgba(6, 182, 212, 0.2);
  transform: translateY(-50%) scale(1.1);
}

.lightbox-prev:hover:not(:disabled) svg {
  transform: translateX(-3px);
}

.lightbox-next:hover:not(:disabled) svg {
  transform: translateX(3px);
}

.lightbox-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.lightbox-counter {
  display: block;
  font-size: 12px;
  opacity: 0.7;
  margin-top: 4px;
  letter-spacing: 2px;
}

/* Mobile responsive for nav arrows */
@media (max-width: 768px) {
  .lightbox-nav {
    width: 44px;
    height: 44px;
  }
  
  .lightbox-nav svg {
    width: 22px;
    height: 22px;
  }
  
  .lightbox-prev {
    left: 12px;
  }
  
  .lightbox-next {
    right: 12px;
  }
}
</style>
