<template>
  <div class="habit-card" :class="`trig-${habit.trigger}`">
    <div class="habit-header">
      <h3 class="habit-name">{{ habit.name }}</h3>
      <TriggerBadge :type="habit.trigger" />
    </div>

    <p class="habit-description">{{ habit.description }}</p>

    <div class="bit-list">
      <span
        v-for="bit in habit.bits"
        :key="bit"
        class="bit-badge"
      >
        {{ bit }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import TriggerBadge from './TriggerBadge.vue'
import type { HabitData } from './types'

defineProps<{
  habit: HabitData
}>()
</script>

<style scoped>
.habit-card {
  position: relative;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s;
}

/* Top accent bar keyed by trigger type */
.habit-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  /* background: var(--accent, var(--vp-c-brand-1)); */
  border-radius: 12px 12px 0 0;
}

.habit-card.trig-scheduler { --accent: #a78bfa; }
.habit-card.trig-webhook   { --accent: #60a5fa; }
.habit-card.trig-email     { --accent: #fbbf24; }
.habit-card.trig-manual    { --accent: #6b7280; }

.habit-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
  border-color: var(--vp-c-brand-2);
}

.habit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.habit-name {
  font-size: 0.87rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.4;
  margin: 0;
}

.habit-description {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0;
  flex: 1;
}

.bit-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.bit-badge {
  font-size: 0.67rem;
  font-family: var(--vp-font-family-mono);
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(100, 150, 255, 0.08);
  color: var(--vp-c-brand-1);
  border: 1px solid rgba(100, 150, 255, 0.18);
  white-space: nowrap;
}
</style>
