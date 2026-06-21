<template>
  <div class="integration-logos">
    <article
      v-for="item in items"
      :key="item.name"
      class="integration-logo-card"
    >
      <div class="integration-logo-wrap">
        <img
          :src="withBase(item.logo)"
          :alt="item.name"
          class="integration-logo-img"
          loading="lazy"
        />
      </div>
      <h3 class="integration-logo-name">{{ item.name }}</h3>
      <p class="integration-logo-subtitle">{{ item.subtitle }}</p>
    </article>
  </div>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress'

export interface IntegrationLogoItem {
  name: string
  subtitle: string
  logo: string
}

defineProps<{
  items: IntegrationLogoItem[]
}>()
</script>

<style scoped>
.integration-logos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
  margin: 20px 0 28px;
}

.integration-logo-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 18px 14px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.integration-logo-card:hover {
  border-color: var(--vp-c-brand-2);
  transform: translateY(-1px);
}

.integration-logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  padding: 10px;
}

.integration-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.integration-logo-name {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.integration-logo-subtitle {
  margin: 0;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
}

@media (max-width: 640px) {
  .integration-logos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
