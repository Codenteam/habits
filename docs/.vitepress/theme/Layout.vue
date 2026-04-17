<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import feather from 'feather-icons'
import HomeLayout from './components/HomeLayout.vue'
import ComparisonLayout from './components/ComparisonLayout.vue'

const { Layout } = DefaultTheme
const { frontmatter } = useData()

// Helper to get icon SVG
const icon = (name) => feather.icons[name].toSvg({ class: 'feather-icon' })
</script>

<template>
  <HomeLayout v-if="frontmatter.layout === 'habits-home'">
    <Content />
  </HomeLayout>
  
  <Layout v-else :class="{ 'is-comparison-page': frontmatter.isComparison }">
    <template #doc-before>
      <ComparisonLayout v-if="frontmatter.isComparison" />
    </template>
  
    <template #home-features-before>
      <div class="full-stack-hero" v-if="frontmatter.layout === 'home'">

      </div>

      <!-- Screenshot Slider -->
    </template>
  </Layout>
</template>

<style>
/* Hide aside and make content full width on comparison pages */
.is-comparison-page .VPDoc .container .aside {
  display: none;
}

.is-comparison-page .VPDoc .container .content {
  max-width: 100%;
  padding-right: 0;
}
</style>
