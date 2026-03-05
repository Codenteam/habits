<script setup>
import { ref, computed, onMounted } from 'vue'
import { withBase } from 'vitepress'
import feather from 'feather-icons'
import ScreenshotGallery from './ScreenshotGallery.vue'
import { codeToHtml } from 'shiki'

const icon = (name) => feather.icons[name].toSvg({ class: 'feather-icon' })

const activeTab = ref(0)
const highlightedCode = ref({})

const tabs = [
  {
    label: 'Install',
    code: `# Install habits globally
curl -o- https://codenteam.com/intersect/habits/install.sh | bash

# Or with npm
npm install -g habits

# Or with npx
npx habits@latest`
  },
  {
    label: 'Create',
    code: `# Start Habits Base (visual builder)
habits base`
  },
  {
    label: 'Run',
    code: `# Run a habit with Cortex engine
habits cortex --config ./stack.yaml`
  },
  {
    label: 'Pack',
    code: `# Pack your habit as a single executable
habits pack --config ./stack.yaml -o ./my-app

# Pack for different targets
habits pack --config ./stack.yaml --target linux-x64 -o ./my-linux-app
habits pack --config ./stack.yaml --target macos-arm64 -o ./my-mac-app
habits pack --config ./stack.yaml --target win-x64 -o ./my-win-app.exe`
  }
]

onMounted(async () => {
  for (let i = 0; i < tabs.length; i++) {
    highlightedCode.value[i] = await codeToHtml(tabs[i].code, {
      lang: 'bash',
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      }
    })
  }
})

const features = [
  {
    icon: '📜',
    title: 'Apache 2.0 Licensed',
    details: 'Fully open-source without fair-code or AGPL restrictions. Distribute freely to your customers.'
  },
  {
    icon: '🚀',
    title: 'CLI & API Ready',
    details: 'Run workflows from the command line or expose them as REST API endpoints out-of-the-box.'
  },
  {
    icon: '🎨',
    title: 'Visual Workflow Builder',
    details: 'React Flow-based UI for building and managing workflows visually.'
  }
]

const screenshots = [
  { img: '/images/base.webp', caption: 'Habits Base (Builder)', link: '/getting-started/introduction#habits-base-screenshot' },
  { img: '/images/base-frontend.webp', caption: 'Habits Base UI Editor (Frontend Builder)', link: '/getting-started/introduction#habits-base-frontend-screenshot' },
  { img: '/images/cortex.webp', caption: 'Cortex Engine', link: '/deep-dive/running#cortex-engine-screenshot' },
  { img: '/images/mixed.webp', caption: 'Mix bits, n8n, ActivePieces and scripts', link: '/examples/mixed#mixed-frameworks-screenshot' },
  { img: '/images/swagger.webp', caption: 'OpenAPI Swagger', link: '/deep-dive/running#swagger-screenshot' },
  { img: '/images/mixed-frontend.webp', caption: 'Text to Audio Example', link: '/examples/mixed#text-to-audio-screenshot' },
  { img: '/images/openclaw-clone.webp', caption: 'OpenClaw-clone built with Habits', link: '/examples/openclaw-clone#openclaw-clone-screenshot' },
  { img: '/images/blog-clone.webp', caption: 'Simple CMS built with Habits', link: '/examples/minimal-blog#minimal-blog-screenshot' },
]
</script>

<template>
  <div class="home-layout">
    <!-- Hero Section with Quick Start -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-container">
        <!-- Left: Hero Content -->
        <div class="hero-left">
          <img :src="withBase('/logo.png')" alt="Habits" class="hero-logo" />
          <h1 class="hero-name">Habits</h1>
          <p class="hero-text">Agents, Automations, Full-Stacks, SaaS and Micro-Apps</p>
          <p class="hero-tagline">Apache 2.0 Creator and Runner</p>
          <div class="hero-actions">
            <a :href="withBase('/getting-started/first-habit')" class="action-btn brand">Build your first habit</a>
            <a :href="withBase('/getting-started/introduction')" class="action-btn alt">Read more</a>
          </div>
        </div>
        
        <!-- Right: Quick Start -->
        <div class="hero-right">
          <div class="quick-start-card">
            <h3>Get Started in Seconds (Create, Run and Pack Habits)</h3>
            <div class="tabs">
              <div class="tab-headers">
                <button 
                  v-for="(tab, index) in tabs" 
                  :key="index"
                  :class="['tab-btn', { active: activeTab === index }]"
                  @click="activeTab = index"
                >
                  {{ tab.label }}
                </button>
              </div>
              <div class="tab-content">
                <div 
                  v-if="highlightedCode[activeTab]" 
                  class="highlighted-code"
                  v-html="highlightedCode[activeTab]"
                ></div>
                <pre v-else><code>{{ tabs[activeTab].code }}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Full-Stack Section -->
    <section class="full-stack-hero">
      <div class="full-stack-content">
        <h2>Full-Stack Your Habits</h2>
        <p>Turn a single workflow or multiple workflows into a complete application stack:</p>
        <div class="stack-items">
          <div class="stack-item">
            <span class="stack-icon" v-html="icon('monitor')"></span>
            <span class="stack-label">Frontend UI</span>
          </div>
          <span class="stack-plus">+</span>
          <div class="stack-item">
            <span class="stack-icon" v-html="icon('zap')"></span>
            <span class="stack-label">Backend API</span>
          </div>
          <span class="stack-plus">+</span>
          <div class="stack-item">
            <span class="stack-icon" v-html="icon('book-open')"></span>
            <span class="stack-label">Swagger OpenAPI Docs</span>
          </div>
          <span class="stack-plus">+</span>
          <div class="stack-item">
            <span class="stack-icon" v-html="icon('clipboard')"></span>
            <span class="stack-label">Task Management</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="features-grid">
        <div v-for="feature in features" :key="feature.title" class="feature-card">
          <span class="feature-icon">{{ feature.icon }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.details }}</p>
        </div>
      </div>
    </section>


    <!-- Rest of content slot -->
    <section class="content-section vp-doc">
      <div class="container">
        <slot />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-layout {
  max-width: 100%;
  overflow-x: hidden;
}

/* Hero */
.hero {
  position: relative;
  padding: 60px 24px 80px;
  min-height: 600px;
  display: flex;
  align-items: center;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(-45deg, #5865F2 50%, #38bdf8 50%);
  opacity: 0.06;
  filter: blur(100px);
  z-index: -1;
}

.hero-container {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  width: 100%;
}

.hero-left {
  text-align: left;
}

.hero-logo {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
}

.hero-name {
  font-size: 4rem;
  font-weight: 700;
  background: -webkit-linear-gradient(120deg, #5865F2 30%, #38bdf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px;
  line-height: 1.1;
}

.hero-text {
  font-size: 2rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 12px;
}

.hero-tagline {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  margin: 0 0 28px;
  max-width: 450px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: all 0.2s;
}

.action-btn.brand {
  background: #5865F2;
  color: white;
}

.action-btn.brand:hover {
  background: #4752c4;
  transform: translateY(-1px);
}

.action-btn.alt {
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.action-btn.alt:hover {
  border-color: #5865F2;
  color: #5865F2;
}

/* Quick Start Card in Hero */
.hero-right {
  display: flex;
  justify-content: flex-end;
}

.quick-start-card {
  width: 100%;
  background: var(--vp-c-bg);
  border-radius: 16px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1),
    0 0 0 1px var(--vp-c-divider);
  overflow: hidden;
}

.quick-start-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  padding: 16px 20px 0;
  margin: 0;
}

.tabs {
  background: transparent;
}

.tab-headers {
  display: flex;
  padding: 12px 12px 0;
  gap: 4px;
  overflow-x: auto;
}

.tab-btn {
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  border-radius: 8px 8px 0 0;
}

.tab-btn:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.tab-btn.active {
  color: #5865F2;
  background: var(--vp-c-bg-alt);
  font-weight: 600;
}

.tab-content {
  padding: 0;
}

.tab-content pre {
  margin: 0;
  padding: 16px 20px 20px;
  background: var(--vp-c-bg-alt);
  overflow-x: auto;
  min-height: 140px;
}

.tab-content code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  white-space: pre;
}

.highlighted-code :deep(pre) {
  margin: 0;
  padding: 16px 20px 20px;
  background: var(--vp-c-bg-alt) !important;
  overflow-x: auto;
  min-height: 140px;
}

.highlighted-code :deep(code) {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  line-height: 1.7;
}

/* Shiki dual theme support */
.highlighted-code :deep(.shiki) {
  background-color: var(--vp-c-bg-alt) !important;
}

.highlighted-code :deep(.shiki span) {
  color: var(--shiki-light);
}

.dark .highlighted-code :deep(.shiki span) {
  color: var(--shiki-dark);
}

/* Full-Stack Hero - using existing styles */
.full-stack-hero {
  background: linear-gradient(135deg, #14477f 0%, #166487 100%);
  border-radius: 16px;
  padding: 48px 40px;
  margin: 60px auto;
  max-width: 1152px;
  text-align: center;
  color: white;
}

.full-stack-hero h2 {
  font-size: 2rem;
  margin-bottom: 12px;
  color: white;
}

.full-stack-hero > p {
  font-size: 1.1rem;
  opacity: 0.95;
  margin-bottom: 28px;
}

.stack-items {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
}

.stack-item {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  transition: transform 0.2s, background 0.2s;
}

.stack-item:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.25);
}

.stack-icon {
  font-size: 1.4rem;
}

.stack-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.stack-label {
  font-size: 0.95rem;
}

.stack-plus {
  font-size: 1.8rem;
  font-weight: 700;
  opacity: 0.8;
  display: flex;
  align-items: center;
}

/* Features */
.features {
  padding: 60px 24px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1152px;
  margin: 0 auto;
}

.feature-card {
  padding: 28px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  text-align: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  border-color: #5865F2;
  box-shadow: 0 4px 20px rgba(88, 101, 242, 0.1);
}

.feature-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 1.1rem;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
}

.feature-card p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

/* Apache Tip */
.apache-tip {
  padding: 0 24px;
  max-width: 1152px;
  margin: 0 auto 40px;
}

.tip-box {
  background: #f0fdf4;
  border: 1px solid #22c55e;
  border-radius: 12px;
  padding: 20px 24px;
}

.dark .tip-box {
  background: #14532d20;
  border-color: #22c55e80;
}

.tip-box strong {
  display: block;
  margin-bottom: 8px;
  font-size: 1rem;
  color: #16a34a;
}

.dark .tip-box strong {
  color: #4ade80;
}

.tip-box p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

/* Screenshots */
.screenshots {
  padding: 0 24px 60px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Content Section */
.content-section {
  padding: 60px 24px;
}

.content-section .container {
  max-width: 900px;
  margin: 0 auto;
}

/* Responsive */
@media (max-width: 1024px) {
  .hero-container {
    gap: 40px;
  }
  
  .hero-name {
    font-size: 3rem;
  }
  
  .hero-text {
    font-size: 1.6rem;
  }
}

@media (max-width: 960px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .hero-container {
    grid-template-columns: 1fr;
    gap: 48px;
    text-align: center;
  }
  
  .hero-left {
    text-align: center;
  }
  
  .hero-tagline {
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
  }
  
  .hero-actions {
    justify-content: center;
  }
  
  .hero-right {
    justify-content: center;
  }
  
  .quick-start-card {
    max-width: 600px;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 40px 16px 60px;
    min-height: auto;
  }
  
  .hero-name {
    font-size: 2.5rem;
  }
  
  .hero-text {
    font-size: 1.4rem;
  }
  
  .hero-logo {
    width: 60px;
    height: 60px;
    justify-self: center;
  }
  
  .full-stack-hero {
    padding: 32px 24px;
    margin: 40px 16px;
  }
  
  .stack-plus {
    display: none;
  }
  
  .stack-items {
    gap: 12px;
  }
  
  .tab-headers {
    flex-wrap: wrap;
    padding: 8px 8px 0;
  }
  
  .tab-btn {
    padding: 8px 12px;
    font-size: 0.75rem;
  }
}

@media (max-width: 640px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .tab-headers {
    /**flex-direction: column;**/
    padding: 0;
  }
  
  .tab-btn {
    text-align: left;
    padding: 12px 16px;
    border-radius: 0;
    border-left: 3px solid transparent;
  }
  
  .tab-btn.active {
    border-left-color: #5865F2;
    background: var(--vp-c-bg-soft);
  }
}
</style>
