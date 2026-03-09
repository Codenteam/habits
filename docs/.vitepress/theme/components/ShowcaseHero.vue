<template>
  <div class="showcase-hero">
    <!-- Main Image Display -->
    <div class="hero-main" @click="openLightbox(activeIndex)">
      <div class="hero-image-container">
        <transition name="fade" mode="out-in">
          <img 
            :key="activeIndex"
            :src="withBase(images[activeIndex].img)" 
            :alt="images[activeIndex].caption"
            class="hero-image"
          />
        </transition>
        
        <!-- Navigation Arrows -->
        <button 
          v-if="images.length > 1"
          class="nav-arrow prev"
          @click.stop="prevImage"
          :disabled="activeIndex === 0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <button 
          v-if="images.length > 1"
          class="nav-arrow next"
          @click.stop="nextImage"
          :disabled="activeIndex === images.length - 1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        
        <!-- Zoom Hint -->
        <div class="zoom-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          Click to zoom
        </div>
      </div>
      
      <!-- Caption -->
      <div v-if="images[activeIndex].caption" class="hero-caption">
        {{ images[activeIndex].caption }}
      </div>
    </div>
    
    <!-- Thumbnail Strip -->
    <div v-if="images.length > 1" class="thumbnail-strip">
      <button 
        v-for="(image, index) in images"
        :key="index"
        class="thumbnail"
        :class="{ active: index === activeIndex }"
        @click="activeIndex = index"
      >
        <img :src="withBase(image.img)" :alt="`Thumbnail ${index + 1}`" />
        <div class="thumbnail-overlay">
          <span>{{ index + 1 }}</span>
        </div>
      </button>
    </div>
    
    <!-- Dots Indicator (Mobile) -->
    <div v-if="images.length > 1" class="dots-indicator">
      <button 
        v-for="(_, index) in images"
        :key="index"
        class="dot"
        :class="{ active: index === activeIndex }"
        @click="activeIndex = index"
      />
    </div>

    <!-- Lightbox Modal -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div v-if="lightboxVisible" class="lightbox" @click="closeLightbox">
          <button class="lightbox-close" @click="closeLightbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <button 
            v-if="images.length > 1"
            class="lightbox-nav prev"
            @click.stop="prevImage"
            :disabled="lightboxIndex === 0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div class="lightbox-content" @click.stop>
            <img :src="withBase(images[lightboxIndex].img)" :alt="images[lightboxIndex].caption" />
          </div>
          
          <button 
            v-if="images.length > 1"
            class="lightbox-nav next"
            @click.stop="nextImage"
            :disabled="lightboxIndex === images.length - 1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          
          <div class="lightbox-footer">
            <span class="lightbox-caption">{{ images[lightboxIndex].caption }}</span>
            <span class="lightbox-counter">{{ lightboxIndex + 1 }} / {{ images.length }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { withBase } from 'vitepress'

interface ImageItem {
  img: string
  caption: string
}

const props = defineProps<{
  images: ImageItem[]
}>()

const activeIndex = ref(0)
const lightboxVisible = ref(false)
const lightboxIndex = ref(0)

const prevImage = () => {
  if (lightboxVisible.value) {
    if (lightboxIndex.value > 0) lightboxIndex.value--
  } else {
    if (activeIndex.value > 0) activeIndex.value--
  }
}

const nextImage = () => {
  if (lightboxVisible.value) {
    if (lightboxIndex.value < props.images.length - 1) lightboxIndex.value++
  } else {
    if (activeIndex.value < props.images.length - 1) activeIndex.value++
  }
}

const openLightbox = (index: number) => {
  lightboxIndex.value = index
  lightboxVisible.value = true
  document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  lightboxVisible.value = false
  document.body.style.overflow = ''
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
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.showcase-hero {
  margin: 0 10px;
}

/* Main Hero Image */
.hero-main {
  position: relative;
  cursor: zoom-in;
}

.hero-image-container {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 10px 30px -5px rgba(0, 0, 0, 0.2);
}

.hero-image {
  width: 100%;
  height: auto;
  display: block;
  max-height: 500px;
  object-fit: contain;
}

/* Navigation Arrows */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0;
  backdrop-filter: blur(4px);
}

.hero-image-container:hover .nav-arrow {
  opacity: 1;
}

.nav-arrow:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.8);
  transform: translateY(-50%) scale(1.1);
}

.nav-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-arrow.prev {
  left: 16px;
}

.nav-arrow.next {
  right: 16px;
}

.nav-arrow svg {
  width: 24px;
  height: 24px;
}

/* Zoom Hint */
.zoom-hint {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
  backdrop-filter: blur(4px);
}

.hero-image-container:hover .zoom-hint {
  opacity: 1;
}

.zoom-hint svg {
  width: 16px;
  height: 16px;
}

/* Caption */
.hero-caption {
  text-align: center;
  padding: 12px 16px;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  font-style: italic;
}

/* Thumbnail Strip */
.thumbnail-strip {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
  padding: 8px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.thumbnail {
  position: relative;
  flex-shrink: 0;
  width: 80px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background: var(--vp-c-bg-alt);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.thumbnail:hover img {
  transform: scale(1.1);
}

.thumbnail.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px rgba(var(--vp-c-brand-1-rgb), 0.2);
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.thumbnail:hover .thumbnail-overlay,
.thumbnail.active .thumbnail-overlay {
  opacity: 1;
}

.thumbnail-overlay span {
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Dots Indicator (Mobile) */
.dots-indicator {
  display: none;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-divider);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot.active {
  background: var(--vp-c-brand-1);
  transform: scale(1.2);
}

@media (max-width: 640px) {
  .thumbnail-strip {
    display: none;
  }
  
  .dots-indicator {
    display: flex;
  }
  
  .nav-arrow {
    width: 40px;
    height: 40px;
    opacity: 1;
    background: rgba(0, 0, 0, 0.5);
  }
  
  .nav-arrow.prev {
    left: 8px;
  }
  
  .nav-arrow.next {
    right: 8px;
  }
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 80px;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.lightbox-close svg {
  width: 24px;
  height: 24px;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.lightbox-nav:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.1);
}

.lightbox-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.lightbox-nav.prev {
  left: 20px;
}

.lightbox-nav.next {
  right: 20px;
}

.lightbox-nav svg {
  width: 28px;
  height: 28px;
}

.lightbox-content {
  max-width: 100%;
  max-height: calc(100vh - 160px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.lightbox-footer {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.lightbox-caption {
  color: white;
  font-size: 1rem;
  text-align: center;
}

.lightbox-counter {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
}

/* Lightbox Transition */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.3s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .lightbox {
    padding: 20px;
  }
  
  .lightbox-nav {
    width: 44px;
    height: 44px;
  }
  
  .lightbox-nav.prev {
    left: 10px;
  }
  
  .lightbox-nav.next {
    right: 10px;
  }
}
</style>
