<template>
  <span class="trigger-badge" :class="styles[type] ?? styles.webhook">
    <Icon :name="icons[type] ?? 'link'" :size="10" />
    {{ labels[type] ?? type }}
  </span>
</template>

<script setup lang="ts">
import Icon from '../Icon.vue'

defineProps<{ type: string }>()

const icons: Record<string, string> = {
  scheduler: 'clock',
  webhook:   'link',
  email:     'mail',
  manual:    'play',
}

const labels: Record<string, string> = {
  scheduler: 'Scheduled',
  webhook:   'Webhook',
  email:     'Email',
  manual:    'Manual',
}

const styles: Record<string, string> = {
  scheduler: 'trigger-scheduler',
  webhook:   'trigger-webhook',
  email:     'trigger-email',
  manual:    'trigger-manual',
}
</script>

<style scoped>
.trigger-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 9999px;
  white-space: nowrap;
  line-height: 1.6;
}

.trigger-scheduler {
  background: rgba(124, 58, 237, 0.15);
  color: #a78bfa;
  border: 1px solid rgba(124, 58, 237, 0.3);
}

.trigger-webhook {
  background: rgba(37, 99, 235, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(37, 99, 235, 0.3);
}

.trigger-email {
  background: rgba(180, 130, 0, 0.15);
  color: #fcd34d;
  border: 1px solid rgba(180, 130, 0, 0.3);
}

.trigger-manual {
  background: rgba(75, 85, 99, 0.2);
  color: #9ca3af;
  border: 1px solid rgba(75, 85, 99, 0.3);
}
</style>
