<template>
  <section class="dept-section">
    <div class="dept-header">
      <div class="dept-header-left">
        <div class="dept-icon">
          <Icon :name="department.icon" :size="22" />
        </div>
        <div class="dept-text">
          <h2 class="dept-name">{{ department.name }}</h2>
          <p class="dept-desc">{{ department.description }}</p>
        </div>
      </div>
      <div class="dept-header-right">
        <span class="dept-badge">{{ department.habits.length }} habits</span>
        <a
          v-if="department.showcaseSlug"
          :href="withBase(`/showcase/${department.showcaseSlug}`)"
          class="dept-link"
        >View showcase <span class="link-arr">→</span></a>
      </div>
    </div>

    <div v-if="featuredHabits.length" class="featured-habits">
      <article
        v-for="habit in featuredHabits"
        :key="habit.id"
        class="featured-habit"
      >
        <div class="featured-copy">
          <div class="featured-eyebrow">
            <Icon name="star" :size="13" />
            Featured Habit
          </div>
          <div class="featured-title-row">
            <h3 class="featured-title">{{ habit.name }}</h3>
            <TriggerBadge :type="habit.trigger" />
          </div>
          <p class="featured-description">{{ habit.overview || habit.description }}</p>

          <div class="bit-list featured-bits">
            <span
              v-for="bit in habit.bits"
              :key="bit"
              class="bit-badge"
            >
              {{ bit }}
            </span>
          </div>
        </div>

        <div class="featured-details">
          <div v-if="habit.flow?.length" class="detail-panel">
            <div class="detail-title">How it works</div>
            <ol class="flow-list">
              <li v-for="step in habit.flow" :key="step">{{ step }}</li>
            </ol>
          </div>

          <div v-if="habit.components?.length" class="detail-panel">
            <div class="detail-title">Main components</div>
            <div class="component-list">
              <span v-for="component in habit.components" :key="component">
                {{ component }}
              </span>
            </div>
          </div>

          <div v-if="habit.integrations?.length" class="integration-panel">
            <div class="detail-title">Integration diagram</div>
            <div class="integration-flow">
              <template
                v-for="(integration, index) in habit.integrations"
                :key="integration"
              >
                <span class="integration-node">{{ integration }}</span>
                <span
                  v-if="index < habit.integrations.length - 1"
                  class="integration-arrow"
                >→</span>
              </template>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div class="habits-grid">
      <HabitCard
        v-for="habit in regularHabits"
        :key="habit.id"
        :habit="habit"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress'
import { computed } from 'vue'
import HabitCard from './HabitCard.vue'
import TriggerBadge from './TriggerBadge.vue'
import Icon from '../Icon.vue'
import type { DepartmentData } from './types'

const props = defineProps<{
  department: DepartmentData
}>()

const featuredHabits = computed(() =>
  props.department.habits.filter(habit => habit.featured)
)

const regularHabits = computed(() =>
  props.department.habits.filter(habit => !habit.featured)
)
</script>

<style scoped>
.dept-section {
  margin-bottom: 52px;
  padding-left: 20px;
  border-left: 3px solid var(--vp-c-brand-1);
}

.dept-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.dept-header-left {
  display: flex;
  gap: 14px;
  align-items: center;
  flex: 1;
}

.dept-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: rgba(100, 150, 255, 0.1);
  border: 1px solid rgba(100, 150, 255, 0.2);
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

.dept-text {
  flex: 1;
}

.dept-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 4px;
  border: none;
  padding: 0;
  line-height: 1.3;
}

.dept-desc {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.5;
}

.dept-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.dept-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 9999px;
  background: rgba(100, 150, 255, 0.1);
  border: 1px solid rgba(100, 150, 255, 0.2);
  color: var(--vp-c-brand-1);
  white-space: nowrap;
}

.dept-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  padding: 7px 15px;
  border-radius: 8px;
  border: 1px solid rgba(100, 150, 255, 0.3);
  transition: all 0.2s;
  white-space: nowrap;
}

.dept-link:hover {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

.link-arr {
  display: inline-block;
  transition: transform 0.2s;
}

.dept-link:hover .link-arr {
  transform: translateX(3px);
}

.habits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.featured-habits {
  display: grid;
  gap: 18px;
  margin-bottom: 18px;
}

.featured-habit {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(320px, 1.3fr);
  gap: 24px;
  padding: 24px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 35%, var(--vp-c-divider));
  border-radius: 18px;
  background: var(--vp-c-bg-soft);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.12);
}

.featured-copy,
.featured-details {
  min-width: 0;
}

.featured-copy {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.featured-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  padding: 5px 10px;
  border: 1px solid rgba(100, 150, 255, 0.22);
  border-radius: 9999px;
  background: rgba(100, 150, 255, 0.1);
  color: var(--vp-c-brand-1);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.featured-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.featured-title {
  margin: 0;
  padding: 0;
  border: none;
  color: var(--vp-c-text-1);
  font-size: 1.35rem;
  line-height: 1.2;
}

.featured-description {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.7;
}

.featured-details {
  display: grid;
  gap: 12px;
}

.detail-panel,
.integration-panel {
  padding: 15px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
}

.detail-title {
  margin-bottom: 10px;
  color: var(--vp-c-text-1);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.flow-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 1.2rem;
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  line-height: 1.55;
}

.component-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.component-list span,
.bit-badge {
  font-size: 0.67rem;
  font-family: var(--vp-font-family-mono);
  padding: 3px 8px;
  border-radius: 7px;
  background: rgba(100, 150, 255, 0.08);
  color: var(--vp-c-brand-1);
  border: 1px solid rgba(100, 150, 255, 0.18);
}

.bit-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.integration-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.integration-node {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(100, 150, 255, 0.08);
  border: 1px solid rgba(100, 150, 255, 0.18);
  color: var(--vp-c-text-1);
  font-size: 0.72rem;
  font-weight: 600;
}

.integration-arrow {
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

@media (max-width: 640px) {
  .dept-section {
    padding-left: 14px;
  }

  .dept-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dept-header-right {
    align-self: flex-start;
  }

  .featured-habit {
    grid-template-columns: 1fr;
    padding: 18px;
  }

  .featured-title-row {
    flex-direction: column;
  }
}
</style>
