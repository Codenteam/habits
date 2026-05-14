<template>
  <div class="industry-page">
    <!-- Hero -->
    <div class="industry-hero">
      <div class="hero-top">
        <span class="eyebrow"><span class="eyebrow-dot"></span>Industry Automation</span>
      </div>
      <div class="hero-body">
        <div class="hero-left">
          <div class="hero-icon-box">
            <Icon :name="industry.icon" :size="36" />
          </div>
          <h1 class="hero-title">{{ industry.name }}</h1>
          <p class="hero-tagline">{{ industry.tagline }}</p>
          <p class="hero-description">{{ industry.description }}</p>
        </div>
        <div class="hero-stats-panel">
          <div class="stat-block">
            <span class="stat-num">{{ totalHabits }}</span>
            <span class="stat-lbl">Habits</span>
          </div>
          <div class="stat-block">
            <span class="stat-num">{{ industry.departments.length }}</span>
            <span class="stat-lbl">Departments</span>
          </div>
          <div class="stat-block">
            <span class="stat-num">{{ uniqueBits.length }}</span>
            <span class="stat-lbl">Integrations</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sticky Department Nav -->
    <div class="dept-nav-bar">
      <button class="nav-tab" :class="{ active: activeDeptId === null }" @click="activeDeptId = null">
        All
      </button>
      <button
        v-for="dept in industry.departments"
        :key="dept.id"
        class="nav-tab"
        :class="{ active: activeDeptId === dept.id }"
        @click="activeDeptId = dept.id"
      >
        <Icon :name="dept.icon" :size="12" style="display:inline;vertical-align:middle;margin-right:4px" />
        {{ dept.name }}
      </button>
    </div>

    <!-- Departments -->
    <div class="departments-container">
      <DepartmentSection
        v-for="dept in visibleDepartments"
        :key="dept.id"
        :department="dept"
      />
    </div>

    <ContactForm
      :heading="`Automate your ${industry.name} workflows`"
      subtext="These habits are examples of what's possible. Reach out and we'll tailor each one to your specific tools, processes, and team."
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Icon from '../Icon.vue'
import DepartmentSection from './DepartmentSection.vue'
import type { IndustryData } from './types'

const props = defineProps<{ industry: IndustryData }>()

const activeDeptId = ref<string | null>(null)

const visibleDepartments = computed(() =>
  activeDeptId.value === null
    ? props.industry.departments
    : props.industry.departments.filter(d => d.id === activeDeptId.value)
)

const totalHabits = computed(() =>
  props.industry.departments.reduce((acc, d) => acc + d.habits.length, 0)
)

const uniqueBits = computed(() => {
  const bits = new Set<string>()
  props.industry.departments.forEach(d =>
    d.habits.forEach(h => h.bits.forEach(b => bits.add(b)))
  )
  return [...bits]
})
</script>

<style scoped>
.industry-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* ── Hero ──────────────────────────────────────────── */
.industry-hero {
  position: relative;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  padding: 44px 48px;
  margin-bottom: 28px;
  overflow: hidden;
}

/* Left brand accent strip */
.industry-hero::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  /* background: var(--vp-c-brand-1); */
  border-radius: 20px 0 0 20px;
}

/* Decorative ring in background */
.industry-hero::after {
  content: '';
  position: absolute;
  right: -90px; top: -90px;
  width: 380px; height: 380px;
  border-radius: 50%;
  border: 48px solid var(--vp-c-brand-1);
  opacity: 0.06;
  pointer-events: none;
}

.hero-top {
  margin-bottom: 28px;
  animation: fadeUp 0.45s ease both;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.eyebrow-dot {
  display: inline-block;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
}

.hero-body {
  display: flex;
  gap: 44px;
  align-items: flex-start;
}

.hero-left {
  flex: 1;
  min-width: 0;
}

.hero-icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 68px; height: 68px;
  border-radius: 18px;
  background: var(--vp-c-brand-1);
  color: #fff;
  margin-bottom: 22px;
  animation: fadeUp 0.45s ease 0.05s both;
}

.hero-title {
  font-size: 3.4rem;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
  margin: 0 0 16px;
  border: none;
  padding: 0;
  animation: fadeUp 0.45s ease 0.1s both;
}

.hero-tagline {
  font-size: 1rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  margin: 0 0 14px;
  line-height: 1.6;
  animation: fadeUp 0.45s ease 0.15s both;
}

.hero-description {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  line-height: 1.75;
  margin: 0;
  max-width: 480px;
  animation: fadeUp 0.45s ease 0.2s both;
}

/* Stats panel */
.hero-stats-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-width: 175px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  overflow: hidden;
  animation: fadeUp 0.45s ease 0.25s both;
}

.stat-block {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 22px 26px;
  background: var(--vp-c-bg);
  transition: background 0.2s;
}

.stat-block:hover {
  background: var(--vp-c-bg-mute);
}

.stat-block + .stat-block {
  border-top: 1px solid var(--vp-c-divider);
}

.stat-num {
  font-size: 3.2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--vp-c-brand-1);
  line-height: 1;
}

.stat-lbl {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vp-c-text-2);
}

/* ── Department Nav Bar ────────────────────────────── */
.dept-nav-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 14px 0;
  margin-bottom: 36px;
  position: sticky;
  top: 60px;
  z-index: 20;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.nav-tab {
  font-size: 0.78rem;
  font-weight: 500;
  padding: 7px 16px;
  border-radius: 9999px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
}

.nav-tab:hover {
  border-color: var(--vp-c-brand-2);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.nav-tab.active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(100, 150, 255, 0.28);
}

/* ── Animations ────────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ────────────────────────────────────── */
@media (max-width: 760px) {
  .industry-hero {
    padding: 28px 24px;
    border-radius: 14px;
  }

  .hero-body {
    flex-direction: column;
  }

  .hero-title {
    font-size: 2.1rem;
  }

  .hero-stats-panel {
    flex-direction: row;
    width: 100%;
    min-width: auto;
  }

  .stat-block {
    flex: 1;
    padding: 14px 16px;
    align-items: center;
  }

  .stat-block + .stat-block {
    border-top: none;
    border-left: 1px solid var(--vp-c-divider);
  }

  .stat-num {
    font-size: 2.2rem;
  }

  .dept-nav-bar {
    top: 50px;
  }
}
</style>
