<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import feather from 'feather-icons'
import HomeLayout from './components/HomeLayout.vue'

const { Layout } = DefaultTheme
const { frontmatter } = useData()

// Helper to get icon SVG
const icon = (name) => feather.icons[name].toSvg({ class: 'feather-icon' })
</script>

<template>
  <HomeLayout v-if="frontmatter.layout === 'habits-home'">
    <Content />
  </HomeLayout>
  
  <Layout v-else>
  
    <template #home-features-before>
      <div class="full-stack-hero" v-if="frontmatter.layout === 'home'">

      </div>

      <!-- Screenshot Slider -->
    </template>
  </Layout>
</template>
