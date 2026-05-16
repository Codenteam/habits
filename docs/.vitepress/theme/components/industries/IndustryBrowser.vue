<template>
  <div class="industry-browser">
    <div class="browser-header">
      <h1 class="browser-title">Industry Automation</h1>
      <p class="browser-subtitle">
        Explore how Habits automates operations across five major industries.
        Each habit is built from composable bits, no servers to manage.
      </p>
    </div>

    <!-- Summary row -->
    <div class="browser-summary">
      <div class="summary-item">
        <span class="summary-number">{{ totalHabits }}</span>
        <span class="summary-label">Total habits</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-item">
        <span class="summary-number">{{ totalDepts }}</span>
        <span class="summary-label">Departments covered</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-item">
        <span class="summary-number">5</span>
        <span class="summary-label">Industries</span>
      </div>
    </div>

    <!-- Industry sections -->
    <div class="industry-sections">
      <div v-for="industry in industries" :key="industry.id" class="industry-section">
        <!-- Industry header -->
        <div class="industry-header">
          <div class="industry-header-left">
            <span class="industry-icon"><Icon :name="industry.icon" :size="28" /></span>
            <div class="industry-meta">
              <h2 class="industry-name">{{ industry.name }}</h2>
              <p class="industry-tagline">{{ industry.tagline }}</p>
            </div>
          </div>
          <a
            :href="withBase(`/industries/${industry.id}`)"
            class="industry-link"
          >View all {{ industry.totalHabits }} habits →</a>
        </div>

        <!-- Department cards -->
        <div class="dept-grid">
          <a
            v-for="dept in industry.departmentList"
            :key="dept.id"
            :href="withBase(`/showcase/${dept.showcaseSlug}`)"
            class="dept-card"
          >
            <span class="dept-name">{{ dept.name }}</span>
            <p class="dept-desc">{{ dept.description }}</p>
            <span class="dept-link">View showcase →</span>
          </a>
        </div>
      </div>
    </div>

    <ContactForm
      heading="Ready to automate your industry?"
      subtext="Every organization runs differently. Tell us about yours and we'll show you exactly how Habits fits into your environment from day one."
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import Icon from '../Icon.vue'
import type { IndustrySummary } from './types'

const props = defineProps<{ industries: IndustrySummary[] }>()

const totalHabits = computed(() =>
  props.industries.reduce((acc, i) => acc + i.totalHabits, 0)
)
const totalDepts = computed(() =>
  props.industries.reduce((acc, i) => acc + i.departmentList.length, 0)
)
</script>

<style scoped>
.industry-browser {
  max-width: 1100px;
  margin: 0 auto;
  padding: 8px 0;
}

/* Header */
.browser-header {
  text-align: center;
  margin-bottom: 32px;
}

.browser-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 12px;
  border: none;
  padding: 0;
}

.browser-subtitle {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Summary bar */
.browser-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 20px 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  margin-bottom: 48px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.summary-number {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  line-height: 1;
}

.summary-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

.summary-divider {
  width: 1px;
  height: 40px;
  background: var(--vp-c-divider);
}

/* Industry sections */
.industry-sections {
  display: flex;
  flex-direction: column;
  gap: 48px;
  margin-bottom: 48px;
}

.industry-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Industry header row */
.industry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.industry-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.industry-icon {
  display: flex;
  align-items: center;
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

.industry-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.industry-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
  border: none;
  padding: 0;
  line-height: 1.3;
}

.industry-tagline {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.4;
}

.industry-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.industry-link:hover {
  text-decoration: underline;
}

/* Department cards grid */
.dept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.dept-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.15s;
  cursor: pointer;
}

.dept-card:hover {
  border-color: var(--vp-c-brand-2);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.dept-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.dept-desc {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.5;
  flex: 1;
}

.dept-link {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  margin-top: 4px;
}

@media (max-width: 640px) {
  .browser-summary {
    gap: 16px;
  }

  .summary-number {
    font-size: 1.4rem;
  }

  .industry-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .dept-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

