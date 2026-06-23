<template>
  <div class="integrations-card" @click="navigateToIntegration">
    <div class="card-header">
      <div class="integration-icon">
        <component :is="iconComponent" :size="28" />
      </div>
      <div class="integration-info">
        <h3 class="card-title">{{ integration.name }}</h3>
        <code v-if="integration.bitPackage" class="package-name">{{ integration.bitPackage }}</code>
      </div>
    </div>

    <div class="card-content">
      <p class="card-description">{{ integration.description }}</p>

      <div class="card-categories">
        <span
          v-for="cat in integration.categories"
          :key="cat"
          class="category"
        >
          {{ cat }}
        </span>
      </div>

      <div class="card-stats">
        <span class="stat" v-if="integration.showcaseCount > 0">
          <Eye :size="14" />
          {{ integration.showcaseCount }} showcase{{ integration.showcaseCount !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, withBase } from 'vitepress'
import {
  Eye,
  Mail,
  MessageSquare,
  Send,
  MessageCircle,
  Users,
  Sparkles,
  Package,
  Shield,
  Globe,
  Bot,
  Link,
} from 'lucide-vue-next'

interface IntegrationInfo {
  slug: string
  name: string
  description: string
  categories: string[]
  bitPackage?: string
  showcaseCount: number
  icon?: string
}

const props = defineProps<{
  integration: IntegrationInfo
}>()

const router = useRouter()

const iconMap: Record<string, any> = {
  Mail,
  MessageSquare,
  Send,
  MessageCircle,
  Users,
  Sparkles,
  Package,
  Shield,
  Globe,
  Bot,
  Link,
}

const iconComponent = computed(() => {
  if (props.integration.icon && iconMap[props.integration.icon]) {
    return iconMap[props.integration.icon]
  }
  const category = props.integration.categories[0]
  if (category === 'email') return Mail
  if (category === 'messaging') return MessageSquare
  if (category === 'crm') return Users
  if (category === 'ai') return Sparkles
  if (category === 'identity') return Shield
  if (category === 'social') return Globe
  return Package
})

function navigateToIntegration() {
  router.go(withBase(`/integrations/${props.integration.slug}/`))
}
</script>

<style scoped>
.integrations-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.integrations-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.integration-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.integration-info {
  min-width: 0;
}

.card-title {
  margin: 0 0 4px;
  font-size: 1.05em;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.package-name {
  font-size: 0.75em;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
  padding: 2px 6px;
  border-radius: 4px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.card-description {
  margin: 0;
  font-size: 0.9em;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category {
  font-size: 0.75em;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}

.card-stats {
  display: flex;
  gap: 12px;
  margin-top: auto;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8em;
  color: var(--vp-c-text-3);
}
</style>
