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

    <div class="habits-grid">
      <HabitCard
        v-for="habit in department.habits"
        :key="habit.id"
        :habit="habit"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress'
import HabitCard from './HabitCard.vue'
import Icon from '../Icon.vue'
import type { DepartmentData } from './types'

defineProps<{
  department: DepartmentData
}>()
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
}
</style>
