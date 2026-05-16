<script setup>
import { ref, computed } from 'vue'
import { useRouter, withBase } from 'vitepress'

const router = useRouter()
const triggerRef = ref(null)
const isOpen = ref(false)
let closeTimer = null

// Position the dropdown using fixed positioning based on the trigger's bounding rect
// so it is never affected by the containing block chain inside VitePress nav.
const dropdownStyle = computed(() => {
  if (!isOpen.value || !triggerRef.value) return {}
  const rect = triggerRef.value.getBoundingClientRect()
  const MOBILE_BREAKPOINT = 600
  const MARGIN = 12

  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    // Mobile: centered, almost full-width
    const width = Math.min(window.innerWidth - MARGIN * 2, 400)
    return {
      position: 'fixed',
      top: `${rect.bottom + 8}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      width: `${width}px`,
    }
  }

  const DROPDOWN_WIDTH = 540
  // Align right edge with right edge of trigger, then clamp to viewport
  let right = window.innerWidth - rect.right
  right = Math.max(MARGIN, right)
  return {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    right: `${right}px`,
    width: `${DROPDOWN_WIDTH}px`,
  }
})

const industries = [
  {
    id: 'healthcare',
    name: 'Healthcare',
    tagline: 'Patient journeys, clinical ops, and compliance, end to end.',
    link: '/industries/healthcare',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
  },
  {
    id: 'finance-banking',
    name: 'Finance & Banking',
    tagline: 'Onboard customers, detect fraud, and pass audits without manual grind.',
    link: '/industries/finance-banking',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
  },
  {
    id: 'ecommerce-retail',
    name: 'E-commerce & Retail',
    tagline: 'Orders, inventory, marketing, and support on autopilot.',
    link: '/industries/ecommerce-retail',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    tagline: 'Production planning, quality control, and supply chain, automated.',
    link: '/industries/manufacturing',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.07 4.93l-1.41 1.41M4.93 19.07l-1.41-1.41M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`,
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    tagline: 'Property listings, client management, and transactions, streamlined.',
    link: '/industries/real-estate',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
  },
]

function open() {
  clearTimeout(closeTimer)
  isOpen.value = true
}

function scheduleClose() {
  closeTimer = setTimeout(() => {
    isOpen.value = false
  }, 150)
}

function navigate(link) {
  isOpen.value = false
  router.go(link)
}
</script>

<template>
  <div class="uc-mega-wrap" @mouseenter="open" @mouseleave="scheduleClose">
    <button ref="triggerRef" class="uc-trigger" :class="{ 'uc-trigger--open': isOpen }">
      Use Cases
      <svg class="uc-chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <Transition name="uc-drop">
      <div v-if="isOpen" class="uc-dropdown" :style="dropdownStyle" @mouseenter="open" @mouseleave="scheduleClose">
        <div class="uc-header">
          <span class="uc-header-label">Industries we automate</span>
          <a :href="withBase('/industries/')" class="uc-view-all">View all</a>
        </div>
        <div class="uc-grid">
          <a
            v-for="industry in industries"
            :key="industry.id"
            :href="withBase(industry.link)"
            class="uc-card"
          >
            <span class="uc-card-icon" v-html="industry.icon"></span>
            <div class="uc-card-body">
              <span class="uc-card-name">{{ industry.name }}</span>
              <span class="uc-card-tagline">{{ industry.tagline }}</span>
            </div>
          </a>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.uc-mega-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

/* Trigger button */
.uc-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 36px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  white-space: nowrap;
}

.uc-trigger:hover,
.uc-trigger--open {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-default-soft);
}

.uc-chevron {
  transition: transform 0.2s;
  opacity: 0.7;
}

.uc-trigger--open .uc-chevron {
  transform: rotate(180deg);
}

/* Dropdown panel — position/size set via inline style (fixed positioning) */
.uc-dropdown {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  padding: 16px;
  z-index: 9999;
  /* Reset nav-inherited white-space so taglines can wrap */
  white-space: normal;
}

/* Arrow pointer */
.uc-dropdown::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 36px;
  transform: rotate(45deg);
  width: 10px;
  height: 10px;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
  border-left: 1px solid var(--vp-c-divider);
}

/* Header row */
.uc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.uc-header-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.uc-view-all {
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: opacity 0.15s;
}

.uc-view-all:hover {
  opacity: 0.75;
}

/* Industry grid */
.uc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

@media (max-width: 600px) {
  .uc-grid {
    grid-template-columns: 1fr;
  }
}

/* Industry card */
.uc-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
  cursor: pointer;
}

.uc-card:hover {
  background: var(--vp-c-default-soft);
}

.uc-card-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.uc-card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.uc-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.uc-card-tagline {
  font-size: 11.5px;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

/* Transition */
.uc-drop-enter-active,
.uc-drop-leave-active {
  transition: opacity 0.15s, margin-top 0.15s;
}

.uc-drop-enter-from,
.uc-drop-leave-to {
  opacity: 0;
  margin-top: -6px;
}

.uc-drop-enter-to,
.uc-drop-leave-from {
  opacity: 1;
  margin-top: 0;
}
</style>
