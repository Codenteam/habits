<script setup>
import { ref, computed, onMounted } from 'vue'
import { withBase, useData } from 'vitepress'
import feather from 'feather-icons'
import ScreenshotGallery from './ScreenshotGallery.vue'
import ShowcaseCard from './ShowcaseCard.vue'
import BitsCard from './BitsCard.vue'
import HabitFlowSection1 from './HabitFlowSection1.vue'
import { codeToHtml } from 'shiki'
import showcaseData from '../data/showcase-data.json'
import bitsData from '../data/bits-data.json'

const { isDark } = useData()
const icon = (name) => feather.icons[name].toSvg({ class: 'feather-icon' })

function toggleTheme() {
  isDark.value = !isDark.value
}

// Parse CSS gradient string to extract colors
function parseGradient(gradientStr) {
  const matches = gradientStr.match(/#[a-fA-F0-9]{6}/g)
  return matches || ['#667eea', '#764ba2']
}

// Generate icon SVG with embedded gradient for stroke
function gradientIcon(iconName, gradientStr, gradientId) {
  const colors = parseGradient(gradientStr)
  const baseSvg = feather.icons[iconName].toSvg({ class: 'feather-icon' })
  
  const gradientDef = `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${colors[0]}"/>
    <stop offset="100%" stop-color="${colors[1] || colors[0]}"/>
  </linearGradient></defs>`
  
  return baseSvg
    .replace('>', `>${gradientDef}`)
    .replace(/stroke="[^"]*"/, `stroke="url(#${gradientId})"`)
}

const activeTab = ref(0)
const highlightedCode = ref({})

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
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      }
    })
  }
})

const screenshots = [
  { img: '/images/base.webp', caption: 'Habits Base (Builder)', link: '/getting-started/introduction#habits-base-screenshot' },
  { img: '/images/base-frontend.webp', caption: 'Habits Base UI Editor (Frontend Builder)', link: '/getting-started/introduction#habits-base-frontend-screenshot' },
  { img: '/images/cortex.webp', caption: 'Cortex Engine', link: '/deep-dive/running#cortex-engine-screenshot' },
  { img: '/images/mixed.webp', caption: 'Mix bits, n8n, ActivePieces and scripts', link: '/showcase/mixed#mixed-frameworks-screenshot' },
  { img: '/images/swagger.webp', caption: 'OpenAPI Swagger', link: '/deep-dive/running#swagger-screenshot' },
  { img: '/images/mixed-frontend.webp', caption: 'Text to Audio Example', link: '/showcase/mixed#text-to-audio-screenshot' },
  { img: '/images/blog-clone.webp', caption: 'Simple CMS built with Habits', link: '/showcase/minimal-blog#minimal-blog-screenshot' },
  { img: '/images/marketing-campaign.webp', caption: 'Marketing Campaign', link: '/showcase/marketing-campaign' },
]

// Featured showcase items to display on homepage (slugs only)
const featuredSlugs = ['resume-analyzer', 'mixed', 'qr-database', 'ai-cookbook', 'ai-journal', 'marketing-campaign']
const showcaseItems = computed(() => 
  featuredSlugs
    .map(slug => showcaseData.find(item => item.slug === slug))
    .filter(Boolean)
)

// Featured bits to display on homepage
const featuredBits = computed(() => 
  bitsData.filter(bit => bit.featured).slice(0, 6)
)

// "What will you build?" use cases
const useCases = ref([
  {
    id: 'automation',
    need: 'an automation',
    solution: 'Add triggers and complete the logic',
    icon: 'repeat',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    example: 'triggers → nodes → action'
  },
  {
    id: 'backend',
    need: 'a backend',
    solution: 'Use {{habits.input.param}} to hook HTTP request',
    icon: 'server',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    example: 'POST /api → habits.input → response'
  },
  {
    id: 'fullstack',
    need: 'a full-stack / SaaS',
    solution: 'Let AI generate the frontend based on your logic',
    icon: 'layers',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    example: 'logic → AI → complete app'
  },
  {
    id: 'agent',
    need: 'an AI agent',
    solution: 'Use the Agent Bit with tools and memory',
    icon: 'cpu',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    example: 'prompt → agent → autonomous tasks'
  },
  {
    id: 'app',
    need: 'a mobile or desktop app',
    solution: 'Pack for Android, iOS, Windows, Mac, Linux',
    icon: 'smartphone',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    example: 'logic → pack → .apk / .exe / .dmg'
  },
  {
    id: 'deploy',
    need: 'to deploy anywhere',
    solution: 'Export as Docker, serverless, or standalone',
    icon: 'cloud',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    example: 'habit → export → AWS / Docker / Vercel'
  }
])

const activeUseCase = ref(null)
const hoveredUseCase = ref(null)
</script>

<template>
  <div class="home-layout">
    <!-- Header with theme toggle and GitHub -->
    <header class="home-header">
      <div class="header-content">
        <a :href="withBase('/')" class="header-logo">
          <img :src="withBase('/logo.png')" alt="Habits" />
          <span>Habits</span>
        </a>
        <div class="header-actions">
          <button 
            class="theme-toggle" 
            @click="toggleTheme" 
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <span v-if="isDark" v-html="icon('sun')"></span>
            <span v-else v-html="icon('moon')"></span>
          </button>
          <a 
            href="https://github.com/codenteam/habits" 
            target="_blank" 
            rel="noopener noreferrer"
            class="github-link"
            aria-label="GitHub"
          >
            <span v-html="icon('github')"></span>
          </a>
        </div>
      </div>
    </header>

    <!-- Hero Section with Quick Start -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-container">
        <!-- Left: Hero Content -->
        <div class="hero-left">
          <img :src="withBase('/logo.png')" alt="Habits" class="hero-logo" />
          <h1 class="hero-name">Habits</h1>
          <p class="hero-text">Agents, Automations, Full-Stacks, SaaS and Micro-Apps</p>
          <p class="hero-tagline">Logic & UI builder and decentralized runner that you can control, audit, monitor and extend (Apache 2.0)</p>
          <div class="hero-actions">
            <a :href="withBase('/getting-started/first-habit')" class="action-btn brand">Build your first habit</a>
            <div class="hero-secondary-actions">
              <a :href="withBase('/getting-started/first-habit-using-ai')" class="action-btn alt">Use AI</a>
              <a :href="withBase('/getting-started/first-habit-mixed')" class="action-btn alt">Use Code</a>
              <a :href="withBase('/getting-started/introduction')" class="action-btn alt">Introduction</a>
            </div>
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


    <!-- Habit Flow Section -->
    <div class="node-love-text-banner">
      <span>Because people</span> <span class="love">love</span> <span>building with nodes</span>
    </div>
    <HabitFlowSection1 />

    <!-- Platform Overview - Combined Section -->
    <section class="platform-section">
      <div class="platform-header">
        <h2>Everything You Need</h2>
        <p>From visual building to full-stack deployment, all in one platform</p>
      </div>
      
      <div class="platform-bento">
        <!-- Video Card -->
        <div class="bento-card video-card">
          <div class="video-wrapper">
            <iframe 
              src="https://www.youtube.com/embed/uhim-Y7b1vA" 
              title="Habits Base Demo"
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
            ></iframe>
          </div>
          <div class="video-label">
            <span class="play-icon" v-html="icon('play-circle')"></span>
            <span>See Habits Base in Action</span>
          </div>
        </div>
        
        <!-- Full-Stack Card -->
        <div class="bento-card fullstack-card">
          <div class="fullstack-badge">Full-Stack Ready</div>
          <h3>Full-Stack Your Habits</h3>
          <div class="fullstack-grid">
            <div class="flow-item">
              <span class="flow-icon" v-html="icon('monitor')"></span>
              <span>Frontend</span>
            </div>
            <div class="flow-item">
              <span class="flow-icon" v-html="icon('zap')"></span>
              <span>API</span>
            </div>
            <div class="flow-item">
              <span class="flow-icon" v-html="icon('book-open')"></span>
              <span>Docs</span>
            </div>
            <div class="flow-item">
              <span class="flow-icon" v-html="icon('clipboard')"></span>
              <span>Manager</span>
            </div>

            <span class="grid-plus top">+</span>
            <span class="grid-plus bottom">+</span>
            <span class="grid-plus left">+</span>
            <span class="grid-plus right">+</span>
          </div>
        </div>
        
        <!-- Feature Cards -->
        <div class="bento-card feature-mini apache">
          <span class="feature-emoji">📜</span>
          <div class="feature-text">
            <strong>Apache 2.0</strong>
            <span>No fair-code restrictions</span>
          </div>
        </div>
        
        <div class="bento-card feature-mini cli">
          <span class="feature-emoji">🚀</span>
          <div class="feature-text">
            <strong>CLI & API</strong>
            <span>Run anywhere, expose as REST</span>
          </div>
        </div>
        
        <div class="bento-card feature-mini visual">
          <span class="feature-emoji">🎨</span>
          <div class="feature-text">
            <strong>Visual Builder</strong>
            <span>Node-based UI</span>
          </div>
        </div>
      </div>
    </section>


    <!-- Showcase Section -->
    <section class="showcase-section">
      <div class="showcase-header">
        <h2>Featured Showcase</h2>
        <p>Habits you can run, customize, and learn from</p>
        <a :href="withBase('/showcase/')" class="view-all-link">View All →</a>
      </div>
      <div class="showcase-row">
        <ShowcaseCard v-for="item in showcaseItems" :key="item.slug" :example="item" />
      </div>
    </section>

    <!-- Featured Bits Section -->
    <section class="bits-section" v-if="featuredBits.length > 0">
      <div class="bits-header">
        <h2>Featured Bits</h2>
        <p>Pre-built integrations for AI, databases, messaging, and more</p>
        <a :href="withBase('/bits/')" class="view-all-link">Browse all bits →</a>
      </div>
      <div class="bits-row">
        <BitsCard v-for="bit in featuredBits" :key="bit.slug" :bit="bit" />
      </div>
    </section>

    <!-- Screenshots Gallery -->
    <section class="screenshots-section">
      <div class="screenshots-header">
        <h2>Screenshots</h2>
      </div>
      <ScreenshotGallery :screenshots="screenshots" layout="grid" />
    </section>

    <!-- Pricing Table -->
    <section class="pricing-section">
      <div class="pricing-header">
        <h2>Options</h2>
      </div>
      <div class="pricing-table">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>
                <div class="plan-header">
                  <span class="plan-name">Free</span>
                  <span class="plan-price">Open Source</span>
                  <span class="plan-desc">Apache 2.0 License</span>
                </div>
              </th>
              <th>
                <div class="plan-header enterprise">
                  <span class="plan-name">Enterprise</span>
                  <span class="plan-price">Contact Us</span>
                  <span class="plan-desc">Still Open Source</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Core Framework</td>
              <td><span class="check" v-html="icon('check-circle')"></span> Full Access</td>
              <td><span class="check" v-html="icon('check-circle')"></span> Full Access</td>
            </tr>
            <tr>
              <td>Built-in Bits</td>
              <td><span class="check" v-html="icon('check-circle')"></span> All Included</td>
              <td><span class="check" v-html="icon('check-circle')"></span> All Included</td>
            </tr>
            <tr>
              <td>Habits Base (Visual Builder)</td>
              <td><span class="check" v-html="icon('check-circle')"></span> Included</td>
              <td><span class="check" v-html="icon('check-circle')"></span> Included</td>
            </tr>
            <tr>
              <td>Self-Hosting</td>
              <td><span class="check" v-html="icon('check-circle')"></span> Unlimited</td>
              <td><span class="check" v-html="icon('check-circle')"></span> Unlimited</td>
            </tr>
            <tr>
              <td>Community Support</td>
              <td><span class="check" v-html="icon('check-circle')"></span> GitHub Issues</td>
              <td><span class="check" v-html="icon('check-circle')"></span> GitHub Issues</td>
            </tr>
            <tr class="highlight">
              <td>Custom Bits Development</td>
              <td><span class="x-mark" v-html="icon('x-circle')"></span></td>
              <td><span class="check" v-html="icon('check-circle')"></span> Tailored to your needs</td>
            </tr>
            <tr class="highlight">
              <td>Custom Pipelines & Workflows</td>
              <td><span class="x-mark" v-html="icon('x-circle')"></span></td>
              <td><span class="check" v-html="icon('check-circle')"></span> Pre-built for your use case</td>
            </tr>
            <tr class="highlight">
              <td>White-Label UI</td>
              <td><span class="x-mark" v-html="icon('x-circle')"></span></td>
              <td><span class="check" v-html="icon('check-circle')"></span> Your branding</td>
            </tr>
            <tr class="highlight">
              <td>Integration Consulting</td>
              <td><span class="x-mark" v-html="icon('x-circle')"></span></td>
              <td><span class="check" v-html="icon('check-circle')"></span> Expert guidance</td>
            </tr>
            <tr class="highlight">
              <td>Priority Support</td>
              <td><span class="x-mark" v-html="icon('x-circle')"></span></td>
              <td><span class="check" v-html="icon('check-circle')"></span> Dedicated team</td>
            </tr>
            <tr class="highlight">
              <td>Training & Onboarding</td>
              <td><span class="x-mark" v-html="icon('x-circle')"></span></td>
              <td><span class="check" v-html="icon('check-circle')"></span> Hands-on sessions</td>
            </tr>
            <tr class="highlight">
              <td>SLA & Guaranteed Response</td>
              <td><span class="x-mark" v-html="icon('x-circle')"></span></td>
              <td><span class="check" v-html="icon('check-circle')"></span> 24h response time</td>
            </tr>
          </tbody>
        </table>
        <div class="pricing-cta">
          <a href="https://github.com/codenteam/habits" target="_blank" class="cta-button free">Open-source</a>
          <a href="mailto:contact@codenteam.com" class="cta-button enterprise">Contact Us</a>
        </div>
      </div>
    </section>

    <!-- Parody Testimonials Section -->
    <section class="testimonials-section">
      <div class="testimonials-header">
        <h2>What People Are <span class="complaining">Complaining</span> About</h2>
        <p class="testimonials-subtitle">The hate is unreal! literally!</p>
      </div>
      <div class="testimonials-grid">
        <div class="testimonial-card">
          <div class="testimonial-stars">★☆☆☆☆</div>
          <p class="testimonial-text">"47 tabs reduced to ONE. What do I do now, touch grass??"</p>
          <div class="testimonial-author">
            <span class="author-name">— Overworked Dev</span>
            <span class="author-title">Chief Tab Opener, Former</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★★☆☆☆</div>
          <p class="testimonial-text">"Built a full-stack app in 2 hours. Now I have MORE meetings."</p>
          <div class="testimonial-author">
            <span class="author-name">— Anonymous</span>
            <span class="author-title">Meeting Survivor</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★☆☆☆☆</div>
          <p class="testimonial-text">"So intuitive my manager builds workflows now. Send help."</p>
          <div class="testimonial-author">
            <span class="author-name">— Sarah K.</span>
            <span class="author-title">Actual Developer, Threatened</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★★☆☆☆</div>
          <p class="testimonial-text">"No vendor lock-in? Can't threaten to leave anymore."</p>
          <div class="testimonial-author">
            <span class="author-name">— Chad McMoney</span>
            <span class="author-title">Professional Complainer</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★☆☆☆☆</div>
          <p class="testimonial-text">"3-week deploy sprint now takes 3 minutes. I look like a wizard."</p>
          <div class="testimonial-author">
            <span class="author-name">— DevOps Dan</span>
            <span class="author-title">Accidentally Efficient</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★★☆☆☆</div>
          <p class="testimonial-text">"AI made my frontend look good. Can't blame the framework now."</p>
          <div class="testimonial-author">
            <span class="author-name">— Backend Bob</span>
            <span class="author-title">CSS Avoider</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★☆☆☆☆</div>
          <p class="testimonial-text">"Worst tool, worst documentation, how can I bill my client for only 30 minutes to build their automations!"</p>
          <div class="testimonial-author">
            <span class="author-name">— Consultant Carl</span>
            <span class="author-title">Hourly Rate Defender</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★★☆☆☆</div>
          <p class="testimonial-text">"Runs on my $5 VPS. AWS sales guy stopped calling me."</p>
          <div class="testimonial-author">
            <span class="author-name">— Frugal Fred</span>
            <span class="author-title">Cloud Cost Cutter</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★☆☆☆☆</div>
          <p class="testimonial-text">"The intern shipped to production on day one. Day. One."</p>
          <div class="testimonial-author">
            <span class="author-name">— Tech Lead Tina</span>
            <span class="author-title">Gatekeeper, Unemployed</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★★☆☆☆</div>
          <p class="testimonial-text">"Made an AI agent in 10 minutes. Existential crisis in 11."</p>
          <div class="testimonial-author">
            <span class="author-name">— Philosophical Phil</span>
            <span class="author-title">Job Security Analyst</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★☆☆☆☆</div>
          <p class="testimonial-text">"Swagger docs auto-generate. My API doc sprint is obsolete."</p>
          <div class="testimonial-author">
            <span class="author-name">— Documentation Diane</span>
            <span class="author-title">README Writer, Retired</span>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★★☆☆☆</div>
          <p class="testimonial-text">"A bunch of liars telling us to use the same logic for Automations, Agents, Apps and runs in Linux, Windows, Mac, Docker, Android, iOS, Web."</p>
          <div class="testimonial-author">
            <span class="author-name">— Vendor Viktor</span>
            <span class="author-title">Ecosystem Purist</span>
          </div>
        </div>
      </div>
      <p class="testimonials-disclaimer">Habits is actually great AND free.</p>
    </section>

    <!-- Footer -->
    <footer class="home-footer">
      <p>
        <a href="https://github.com/codenteam/habits" target="_blank">GitHub</a> · 
        <a :href="withBase('/')">Documentation</a> · 
        By <a href="https://codenteam.com" target="_blank">Codenteam</a>
      </p>
      <p class="copyright">© 2024-2026 Codenteam. Licensed under Apache 2.0</p>
    </footer>
  </div>
</template>

<style scoped>
.home-layout {
  max-width: 100%;
  overflow-x: hidden;
}

/* Header */
.home-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
  backdrop-filter: blur(8px);
}

.header-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--vp-c-text-1);
  font-weight: 600;
  font-size: 18px;
}

.header-logo img {
  height: 32px;
  width: 32px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-toggle,
.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.theme-toggle:hover,
.github-link:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-default-soft);
}

.theme-toggle :deep(.feather-icon),
.github-link :deep(.feather-icon) {
  width: 20px;
  height: 20px;
}

/* Hero */
.hero {
  position: relative;
  padding: 60px 24px 0px;
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
  line-height: 2rem;
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

.hero-secondary-actions {
  display: contents;
}

@media (max-width: 640px) {
  .hero-secondary-actions {
    display: flex;
    gap: 8px;
    width: 100%;
  }
  
  .hero-secondary-actions .action-btn {
    flex: 1;
    padding: 10px 12px;
    font-size: 0.85rem;
  }
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
  min-width: 0;
  overflow: hidden;
}

.quick-start-card {
  width: 100%;
  max-width: 100%;
  background: var(--vp-c-bg);
  border-radius: 16px;
  box-sizing: border-box;
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
  overflow: hidden;
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
  word-break: break-all;
}


.highlighted-code :deep(pre) {
  margin: 0;
  padding: 16px 20px 20px;
  background: var(--vp-c-bg-alt) !important;
  overflow-x: auto;
  min-height: 140px;
  white-space: pre;
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
  filter: brightness(1.35) saturate(1.1);
}

/* Node Love Text Banner */
.node-love-text-banner {
  text-align: center;
  padding: 40px 24px 40px;
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
}

.node-love-text-banner .love {
  background: linear-gradient(135deg, #f43f5e, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: pulse-love 2s ease-in-out infinite;
}

@keyframes pulse-love {
  0%, 100% { transform: scale(1); display: inline-block; }
  50% { transform: scale(1.05); }
}

@media (max-width: 768px) {
  .node-love-text-banner {
    font-size: 1.6rem;
    padding: 30px 16px 0;
  }
}

@media (max-width: 480px) {
  .node-love-text-banner {
    font-size: 1.3rem;
  }
}

/* Showcase Section */
.showcase-section {
  padding: 60px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.showcase-header {
  text-align: center;
  margin-bottom: 32px;
}

.showcase-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
}

.showcase-header p {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  margin: 0 0 16px;
}

.view-all-link {
  font-size: 0.95rem;
  font-weight: 600;
  color: #5865F2;
  text-decoration: none;
  transition: color 0.2s;
}

.view-all-link:hover {
  color: #4752c4;
}

.showcase-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 960px) {
  .showcase-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .showcase-row {
    grid-template-columns: 1fr;
  }
  
  .showcase-header h2 {
    font-size: 1.6rem;
  }
}

/* Bits Section */
.bits-section {
  padding: 60px 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: var(--vp-c-bg-soft);
  border-radius: 24px;
  margin-top: 20px;
}

.bits-header {
  text-align: center;
  margin-bottom: 32px;
}

.bits-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
}

.bits-header p {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  margin: 0 0 16px;
}

.bits-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 960px) {
  .bits-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .bits-row {
    grid-template-columns: 1fr;
  }
  
  .bits-header h2 {
    font-size: 1.6rem;
  }
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

/* Node Love Section */
.node-love-section {
  position: relative;
  padding: 80px 24px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.node-love-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0.4;
}

.floating-node {
  position: absolute;
  width: 60px;
  height: 40px;
  background: var(--vp-c-bg);
  border: 2px solid #5865F2;
  border-radius: 8px;
  animation: float 6s ease-in-out infinite;
}

.floating-node.n1 { top: 15%; left: 10%; animation-delay: 0s; }
.floating-node.n2 { top: 60%; left: 5%; animation-delay: 1s; }
.floating-node.n3 { top: 20%; right: 15%; animation-delay: 2s; }
.floating-node.n4 { top: 70%; right: 8%; animation-delay: 0.5s; }

.connection-line {
  position: absolute;
  height: 2px;
  background: linear-gradient(90deg, transparent, #5865F2, transparent);
  animation: pulse-line 3s ease-in-out infinite;
}

.connection-line.l1 { top: 20%; left: 12%; width: 100px; transform: rotate(30deg); }
.connection-line.l2 { top: 65%; left: 7%; width: 80px; transform: rotate(-20deg); }
.connection-line.l3 { top: 25%; right: 18%; width: 120px; transform: rotate(-15deg); }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-15px) rotate(2deg); }
}

@keyframes pulse-line {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.node-love-content {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  z-index: 1;
}

.node-love-badge {
  display: inline-block;
  padding: 8px 20px;
  background: linear-gradient(135deg, rgba(88, 101, 242, 0.15), rgba(56, 189, 248, 0.15));
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 20px;
  border: 1px solid rgba(88, 101, 242, 0.2);
}

.node-love-title {
  font-size: 2.8rem;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--vp-c-text-1);
}

.love-word {
  background: linear-gradient(135deg, #f43f5e, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: pulse-love 2s ease-in-out infinite;
}

@keyframes pulse-love {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.node-love-text {
  font-size: 1.15rem;
  color: var(--vp-c-text-2);
  line-height: 1.8;
  margin-bottom: 40px;
}

.node-demo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: wrap;
}

.demo-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: var(--vp-c-bg);
  border: 2px solid var(--vp-c-divider);
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
  transition: all 0.3s ease;
  animation: node-appear 0.5s ease-out;
}

.demo-node:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.demo-node.trigger { border-color: #22c55e; }
.demo-node.trigger .node-dot { background: #22c55e; }
.demo-node.process { border-color: #5865F2; }
.demo-node.process .node-dot { background: #5865F2; }
.demo-node.action { border-color: #f59e0b; }
.demo-node.action .node-dot { background: #f59e0b; }

.node-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: dot-pulse 1.5s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.demo-edge {
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, var(--vp-c-divider), #5865F2, var(--vp-c-divider));
  position: relative;
  animation: edge-flow 2s linear infinite;
}

.demo-edge::after {
  content: '';
  position: absolute;
  right: -6px;
  top: -3px;
  border: 5px solid transparent;
  border-left-color: #5865F2;
}

@keyframes edge-flow {
  0% { background-position: -100px 0; }
  100% { background-position: 100px 0; }
}

@keyframes node-appear {
  from { opacity: 0; transform: scale(0.8) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* What Will You Build Section */
.build-section {
  padding: 60px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.build-header {
  text-align: center;
  margin-bottom: 32px;
}

.build-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--vp-c-text-1);
}

.you-text {
  background: linear-gradient(135deg, #5865F2, #38bdf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.use-cases-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.use-case-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
  overflow: hidden;
}

.use-case-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--vp-c-divider);
  transition: all 0.3s ease;
}

.use-case-card:hover::before,
.use-case-card.active::before {
  background: linear-gradient(180deg, #5865F2, #38bdf8);
}

.use-case-card:hover,
.use-case-card.active {
  transform: translateX(4px);
  border-color: rgba(88, 101, 242, 0.3);
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.1);
}

.use-case-icon {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background: var(--vp-c-bg-soft);
}

.use-case-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.use-case-card:hover .use-case-icon {
  transform: scale(1.1);
}

.use-case-content {
  flex: 1;
  min-width: 0;
}

.use-case-need {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.use-case-card:first-child .use-case-need::before {
  content: 'If you need ';
  font-weight: 400;
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
}

.use-case-card:not(:first-child) .use-case-need::before {
  content: 'Then if you need ';
  font-weight: 400;
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
}

.use-case-solution {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

@media (max-width: 1024px) {
  .use-cases-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .use-cases-grid {
    grid-template-columns: 1fr;
  }
  
  .build-header h2 {
    font-size: 1.6rem;
  }
  
  .node-love-title {
    font-size: 1.8rem;
  }
  
  .node-love-text {
    font-size: 1rem;
  }
  
  .node-demo {
    flex-direction: column;
    gap: 0;
  }
  
  .demo-edge {
    width: 3px;
    height: 30px;
    background: #5865F2;
    position: relative;
  }
  
  .demo-edge::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    top: auto;
    transform: translateX(-50%) translateY(7px);
    border: 6px solid transparent;
    border-top-color: #5865F2;
    border-left-color: transparent;
    border-right-color: transparent;
  }
  
  .demo-node {
    padding: 10px 16px;
    font-size: 0.8rem;
    width: 100%;
    max-width: 280px;
    justify-content: center;
  }
  
  .floating-node {
    display: none;
  }
  
  .connection-line {
    display: none;
  }
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
    line-height: 1.6rem;
  }
}

@media (max-width: 960px) {
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
  
  .node-demo {
    padding: 0 10px;
  }
  
  .demo-node {
    padding: 12px 18px;
    font-size: 0.85rem;
  }
  
  .demo-edge {
    width: 4px;
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
    font-size: 1.3rem;
    line-height: 1.5;
  }
  
  .hero-tagline {
    font-size: 1rem;
  }
  
  .hero-logo {
    width: 60px;
    height: 60px;
    justify-self: center;
  }
  
  .tab-headers {
    flex-wrap: wrap;
    padding: 8px 8px 0;
  }
  
  .tab-btn {
    padding: 8px 12px;
    font-size: 0.75rem;
  }
  
  .quick-start-card h3 {
    font-size: 0.9rem;
    padding: 12px 16px 0;
  }
  
  .node-love-section {
    padding: 50px 16px;
  }
  
  .node-love-badge {
    font-size: 0.8rem;
    padding: 6px 14px;
  }
}

@media (max-width: 640px) {
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
  
  .hero-actions {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
  }
  
  .hero-actions .action-btn.brand {
    grid-column: 1;
  }
  
  .action-btn {
    width: 100%;
    text-align: center;
  }
  
  .quick-start-card {
    max-width: 100%;
  }
}

/* Platform Overview - Bento Grid */
.platform-section {
  padding: 60px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.platform-header {
  text-align: center;
  margin-bottom: 32px;
}

.platform-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
}

.platform-header p {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  margin: 0;
}

.platform-bento {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto auto;
  gap: 16px;
}

.bento-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.bento-card:hover {
  border-color: rgba(88, 101, 242, 0.3);
  box-shadow: 0 8px 24px rgba(88, 101, 242, 0.1);
}

/* Video Card - spans 6 columns */
.video-card {
  grid-column: span 6;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-color: rgba(88, 101, 242, 0.2);
}

.video-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  flex: 1;
}

.video-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.video-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: white;
  font-weight: 500;
  font-size: 0.9rem;
  background: rgba(0, 0, 0, 0.3);
}

.video-label .play-icon :deep(svg) {
  width: 18px;
  height: 18px;
  stroke: #5865F2;
}

/* Full-Stack Card - spans 6 columns */
.fullstack-card {
  grid-column: span 6;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-divider);
}

.fullstack-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(88, 101, 242, 0.15);
  color: #5865F2;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
  width: fit-content;
}

.fullstack-card h3 {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 20px;
  color: var(--vp-c-text-1);
}

.fullstack-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  position: relative;
}

.grid-plus {
  position: absolute;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  z-index: 1;

  border: 1px solid var(--vp-c-divider);
  border-right-width: 0;
  border-left-width: 0;
}

.grid-plus.center {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.grid-plus.top {
  top: calc(25% - 15px);
  left: 50%;
  transform: translateX(-50%);
}

.grid-plus.bottom {
  top: calc(75% - 10px);
  left: 50%;
  transform: translateX(-50%);
}

.grid-plus.left {
  top: 50%;
  left: calc(25% - 15px);
  transform: translateY(-50%);
}

.grid-plus.right {
  top: 50%;
  left: calc(75% - 10px);
  transform: translateY(-50%);
}

.flow-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.flow-item:hover {
  border-color: rgba(88, 101, 242, 0.3);
  transform: translateY(-2px);
}

.flow-icon :deep(svg) {
  width: 22px;
  height: 22px;
  stroke: var(--vp-c-brand-1);
}

.flow-item span:last-child {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

/* Feature Mini Cards - each spans 4 columns on bottom row */
.feature-mini {
  grid-column: span 4;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
}

.feature-mini:hover {
  transform: translateY(-2px);
}

.feature-emoji {
  font-size: 2rem;
  flex-shrink: 0;
}

.feature-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feature-text strong {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.feature-text span {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

/* Feature card accent colors on hover */
.feature-mini.apache:hover {
  border-color: #22c55e;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), transparent);
}

.feature-mini.cli:hover {
  border-color: #5865F2;
  background: linear-gradient(135deg, rgba(88, 101, 242, 0.05), transparent);
}

.feature-mini.visual:hover {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent);
}

/* Responsive bento grid */
@media (max-width: 1024px) {
  .video-card {
    grid-column: span 12;
  }
  
  .fullstack-card {
    grid-column: span 12;
  }
  
  .feature-mini {
    grid-column: span 4;
  }
}

@media (max-width: 768px) {
  .feature-mini {
    grid-column: span 4;
  }
}

@media (max-width: 640px) {
  .feature-mini {
    grid-column: span 4;
  }
  
  .platform-header h2 {
    font-size: 1.6rem;
  }
  
  .fullstack-card h3 {
    font-size: 1.1rem;
  }
  
  .flow-item {
    padding: 12px 8px;
  }
}

@media (max-width: 540px) {
  .feature-mini {
    grid-column: span 12;
  }
}

/* Screenshots Section */
.screenshots-section {
  padding: 60px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.screenshots-header {
  text-align: center;
  margin-bottom: 32px;
}

.screenshots-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--vp-c-text-1);
}

/* Pricing Section */
.pricing-section {
  padding: 60px 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.pricing-header {
  text-align: center;
  margin-bottom: 32px;
}

.pricing-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--vp-c-text-1);
}

.pricing-table {
  overflow-x: visible;
}

.pricing-table table {
  width: 100%;
  border-collapse: collapse;
}

@media (max-width: 768px) {
  .pricing-table table,
  .pricing-table thead,
  .pricing-table tbody,
  .pricing-table th,
  .pricing-table td,
  .pricing-table tr {
    display: block;
  }
  
  .pricing-table thead tr {
    display: none;
  }
  
  .pricing-table tbody tr {
    margin-bottom: 16px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 12px;
    overflow: hidden;
    background: var(--vp-c-bg);
  }
  
  .pricing-table tbody tr:hover {
    background: var(--vp-c-bg);
  }
  
  .pricing-table td {
    border: none;
    border-bottom: 1px solid var(--vp-c-divider);
    padding: 12px 16px;
    text-align: left !important;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .pricing-table td:last-child {
    border-bottom: none;
  }
  
  .pricing-table td:first-child {
    background: var(--vp-c-bg-soft);
    font-weight: 600;
    font-size: 0.95rem;
  }
  
  .pricing-table td:nth-child(2)::before {
    content: 'Free: ';
    font-weight: 500;
    color: var(--vp-c-text-2);
    margin-right: 8px;
  }
  
  .pricing-table td:nth-child(3)::before {
    content: 'Enterprise: ';
    font-weight: 500;
    color: var(--vp-c-text-2);
    margin-right: 8px;
  }
  
  .pricing-table td:nth-child(2),
  .pricing-table td:nth-child(3) {
    justify-content: flex-end;
    gap: 8px;
  }
  
  .pricing-table .check,
  .pricing-table .x-mark {
    order: 1;
    margin-left: auto;
  }
}

.pricing-table th,
.pricing-table td {
  padding: 1rem;
  text-align: center;
  border: 1px solid var(--vp-c-divider);
}

.pricing-table th:first-child,
.pricing-table td:first-child {
  text-align: left;
  font-weight: 500;
}

.pricing-table thead th {
  background: var(--vp-c-bg-soft);
}

.plan-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.plan-name {
  font-size: 1.1rem;
  font-weight: 600;
}

.plan-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: #5865F2;
}

.plan-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.plan-header.enterprise .plan-price {
  color: #38bdf8;
}

.pricing-table tbody tr:hover {
  background: var(--vp-c-bg-soft);
}

.pricing-table tbody tr.highlight td:first-child {
  font-weight: 600;
}

.pricing-table .check,
.pricing-table .x-mark {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}

.pricing-table .check :deep(svg) {
  width: 18px;
  height: 18px;
  color: #22c55e;
  stroke: #22c55e;
  vertical-align: middle;
  margin-right: 4px;
}

.pricing-table .x-mark :deep(svg) {
  width: 18px;
  height: 18px;
  color: var(--vp-c-text-3);
  stroke: var(--vp-c-text-3);
  vertical-align: middle;
}

.pricing-cta {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.cta-button {
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.cta-button.free {
  background: #5865F2;
  color: white;
}

.cta-button.enterprise {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 2px solid #5865F2;
}

/* Testimonials Section */
.testimonials-section {
  padding: 60px 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: var(--vp-c-bg-soft);
  border-radius: 24px;
  margin-top: 40px;
}

.testimonials-header {
  text-align: center;
  margin-bottom: 40px;
}

.testimonials-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
}

.complaining {
  background: linear-gradient(135deg, #f43f5e, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-decoration: line-through;
  text-decoration-color: var(--vp-c-text-3);
}

.testimonials-subtitle {
  font-size: 1rem;
  color: var(--vp-c-text-3);
  margin: 0;
  font-style: italic;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.testimonial-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.testimonial-card::before {
  content: '"';
  position: absolute;
  top: -8px;
  left: 8px;
  font-size: 60px;
  font-family: Georgia, serif;
  color: var(--vp-c-divider);
  opacity: 0.4;
  line-height: 1;
  pointer-events: none;
}

.testimonial-card:hover {
  transform: translateY(-4px) rotate(-1deg);
  box-shadow: 0 12px 30px rgba(244, 63, 94, 0.15);
  border-color: rgba(244, 63, 94, 0.3);
}

.testimonial-stars {
  color: #f59e0b;
  font-size: 1rem;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.testimonial-text {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  margin: 0 0 12px;
  position: relative;
  z-index: 1;
  font-style: italic;
}

.testimonial-author {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 10px;
  border-top: 1px solid var(--vp-c-divider);
}

.author-name {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
}

.author-title {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

.testimonials-disclaimer {
  text-align: center;
  margin-top: 32px;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  font-style: italic;
}

@media (max-width: 1100px) {
  .testimonials-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .testimonials-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 540px) {
  .testimonials-grid {
    grid-template-columns: 1fr;
  }
  
  .testimonials-header h2 {
    font-size: 1.6rem;
  }
  
  .testimonial-card {
    padding: 16px;
  }
}

/* Footer */
.home-footer {
  text-align: center;
  padding: 2rem 24px;
  margin-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

.home-footer a {
  color: #5865F2;
  text-decoration: none;
}

.home-footer a:hover {
  text-decoration: underline;
}

.home-footer .copyright {
  font-size: 0.85em;
  margin-top: 0.5rem;
}

@media (max-width: 640px) {
  .screenshots-header h2,
  .pricing-header h2 {
    font-size: 1.6rem;
  }
  
  .pricing-table {
    font-size: 0.85rem;
  }
  
  .pricing-table th,
  .pricing-table td {
    padding: 0.5rem;
  }
}

/* Extra small devices */
@media (max-width: 480px) {
  .header-content {
    padding: 10px 16px;
  }
  
  .header-logo span {
    font-size: 16px;
  }
  
  .header-logo img {
    height: 28px;
    width: 28px;
  }
  
  .hero-name {
    font-size: 2rem;
  }
  
  .hero-text {
    font-size: 1.1rem;
  }
  
  .hero-tagline {
    font-size: 0.9rem;
  }
  
  .action-btn {
    padding: 10px 18px;
    font-size: 0.9rem;
  }
  
  .tab-content pre,
  .highlighted-code :deep(pre) {
    padding: 12px 14px;
    min-height: 120px;
  }
  
  .tab-content code,
  .highlighted-code :deep(code) {
    font-size: 0.7rem;
  }
  
  .node-love-title {
    font-size: 1.5rem;
  }
  
  .use-case-card {
    padding: 12px 14px;
  }
  
  .use-case-need {
    font-size: 0.85rem;
  }
  
  .use-case-solution {
    font-size: 0.7rem;
  }
  
  .platform-section,
  .showcase-section,
  .bits-section,
  .screenshots-section,
  .pricing-section,
  .testimonials-section {
    padding: 40px 16px;
  }
  
  .fullstack-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .grid-plus {
    display: none;
  }
  
  .feature-mini {
    padding: 14px;
  }
  
  .feature-emoji {
    font-size: 1.5rem;
  }
}
</style>
