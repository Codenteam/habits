<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import feather from 'feather-icons'
import { codeToHtml } from 'shiki'

const icon = (name) => feather.icons[name]?.toSvg({ class: 'feather-icon' }) || ''

const sectionRef = ref(null)
const isVisible = ref(false)

function checkVisibility() {
  if (!sectionRef.value) return
  const rect = sectionRef.value.getBoundingClientRect()
  if (rect.top < window.innerHeight * 0.85) isVisible.value = true
}

onMounted(() => {
  window.addEventListener('scroll', checkVisibility, { passive: true })
  checkVisibility()
})
onUnmounted(() => window.removeEventListener('scroll', checkVisibility))

const activeTab = ref(0)
const highlightedCode = ref([])

const tabs = [
  {
    label: 'Install',
    code: `# docker-compose.yaml
services:
  habits:
    image: node:24
    working_dir: /app
    command: sh -c "npx habits@latest init && npx habits@latest base"
    ports:
      - "3000:3000"
      - "13000:13000"
    volumes:
      - ./habit:/app

# Run with: docker compose up`
  },
  {
    label: 'Install (manual)',
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
habits init
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
      themes: { light: 'github-light', dark: 'github-dark' }
    })
  }
})

const paths = [
  { icon: 'cpu',       title: 'Use AI',        desc: 'Describe what you want in plain language, AI scaffolds the full habit for you.',      link: '/getting-started/first-habit-using-ai', color: '#a855f7', delay: '0.1s' },
  { icon: 'git-merge', title: 'Visual Nodes',  desc: 'Drag, connect, and wire logic visually, no boilerplate, instant feedback.',           link: '/getting-started/first-habit',          color: '#5865F2', delay: '0.2s' },
  { icon: 'code',      title: 'Write Code',    desc: 'Full TypeScript control, write bits, nodes, and workflows your way.',                 link: '/getting-started/first-habit-mixed',    color: '#22c55e', delay: '0.3s' },
  { icon: 'book-open', title: 'Read the Docs', desc: 'Start with the introduction, understand concepts before diving in.',                  link: '/getting-started/introduction',         color: '#f59e0b', delay: '0.4s' },
]
</script>

<template>
  <section ref="sectionRef" class="gs-section" :class="{ 'is-visible': isVisible }">
    <div class="gs-bg">
      <div class="gs-orb orb1"></div>
      <div class="gs-orb orb2"></div>
      <div class="gs-grid"></div>
    </div>

    <div class="gs-container">

      <!-- Install -->
      <div class="gs-install">
        <h2 class="gs-title">Get Started</h2>
        <div class="gs-tabs">
          <div class="tab-headers">
            <button
              v-for="(tab, i) in tabs"
              :key="i"
              :class="['tab-btn', { active: activeTab === i }]"
              @click="activeTab = i"
            >{{ tab.label }}</button>
          </div>
          <div class="tab-content">
            <div v-if="highlightedCode[activeTab]" class="highlighted-code" v-html="highlightedCode[activeTab]"></div>
            <pre v-else><code>{{ tabs[activeTab].code }}</code></pre>
          </div>
        </div>
      </div>

      <!-- Pick your path -->
      <div class="gs-paths-header">
        <span class="gs-paths-label">Then pick your path</span>
      </div>

      <div class="gs-paths">
        <a
          v-for="p in paths"
          :key="p.title"
          :href="p.link"
          class="path-card"
          :style="{ '--c': p.color, '--delay': p.delay }"
        >
          <div class="path-icon" v-html="icon(p.icon)"></div>
          <div class="path-body">
            <span class="path-title">{{ p.title }}</span>
            <span class="path-desc">{{ p.desc }}</span>
          </div>
          <span class="path-arrow" v-html="icon('arrow-right')"></span>
          <div class="path-glow"></div>
        </a>
      </div>

    </div>
  </section>
</template>

<style scoped>
.gs-section {
  padding: 80px 24px 80px;
  position: relative;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.gs-bg { position: absolute; inset: 0; pointer-events: none; }

.gs-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: orbFloat 20s ease-in-out infinite;
}
.orb1 { width: 400px; height: 400px; left: -10%; top: 0%; background: radial-gradient(circle, rgba(88,101,242,0.1), transparent 70%); }
.orb2 { width: 300px; height: 300px; right: -5%; bottom: 0%; background: radial-gradient(circle, rgba(34,197,94,0.08), transparent 70%); animation-delay: -10s; }

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0); }
  50%       { transform: translate(15px, -20px); }
}

.gs-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(88,101,242,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(88,101,242,0.025) 1px, transparent 1px);
  background-size: 44px 44px;
}

.gs-container {
  max-width: 860px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.gs-install {
  margin-bottom: 56px;
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
}
.gs-section.is-visible .gs-install {
  opacity: 1;
  transform: translateY(0);
}

.gs-title {
  font-size: clamp(1.8rem, 3.5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 20px;
  color: var(--vp-c-text-1);
  text-align: center;
}

.gs-tabs {
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
  overflow: hidden;
}

.tab-headers {
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  overflow-x: auto;
  scrollbar-width: none;
}
.tab-headers::-webkit-scrollbar { display: none; }

.tab-btn {
  padding: 10px 18px;
  background: transparent;
  border: none;
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn:hover  { color: var(--vp-c-text-1); }
.tab-btn.active { color: #5865F2; border-bottom-color: #5865F2; }

.tab-content {
  padding: 0;
  overflow-x: auto;
}

.tab-content pre {
  margin: 0;
  padding: 20px;
  font-size: 0.82rem;
  line-height: 1.6;
}

.highlighted-code :deep(pre) {
  margin: 0 !important;
  border-radius: 0 !important;
  padding: 20px !important;
  font-size: 0.82rem !important;
  line-height: 1.6 !important;
}

.gs-paths-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  opacity: 0;
  transition: opacity 0.5s ease 0.2s;
}
.gs-section.is-visible .gs-paths-header { opacity: 1; }
.gs-paths-header::before,
.gs-paths-header::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(88,101,242,0.25), transparent);
}

.gs-paths-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.gs-paths {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.path-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.02);
  text-decoration: none;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.5s cubic-bezier(0.16,1,0.3,1) var(--delay),
    transform 0.5s cubic-bezier(0.16,1,0.3,1) var(--delay),
    border-color 0.25s,
    background 0.25s;
}
.gs-section.is-visible .path-card {
  opacity: 1;
  transform: translateY(0);
}
.path-card:hover {
  border-color: color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 6%, transparent);
  transform: translateY(-2px);
}

.path-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--c) 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.path-icon :deep(svg) { width: 18px; height: 18px; color: var(--c); }

.path-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.path-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.path-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
}

.path-arrow {
  flex-shrink: 0;
  opacity: 0.35;
  transition: opacity 0.2s, transform 0.2s;
}
.path-card:hover .path-arrow { opacity: 1; transform: translateX(3px); }
.path-arrow :deep(svg) { width: 16px; height: 16px; color: var(--c); }

.path-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 0% 50%, color-mix(in srgb, var(--c) 8%, transparent), transparent 60%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.path-card:hover .path-glow { opacity: 1; }

@media (max-width: 600px) {
  .gs-paths { grid-template-columns: 1fr; }
  .install-opt { flex-direction: column; align-items: flex-start; }
  .opt-cmd-row { width: 100%; }
  .opt-cmd { flex: 1; min-width: 0; }
}

@media (max-width: 400px) {
  .gs-section { padding: 60px 16px 60px; }
}
</style>
