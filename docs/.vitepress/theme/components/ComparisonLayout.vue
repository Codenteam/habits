<template>
  <div class="comparison-layout">
    <!-- Hero Section: Title + Intro -->
    <section class="comparison-hero">
      <h1 class="comparison-title">{{ frontmatter.title }}</h1>
      <p class="comparison-intro">{{ frontmatter.intro }}</p>
    </section>

    <!-- VS Logos Section -->
    <section class="vs-section">
      <div class="vs-container">
        <div class="platform-card habits">
          <div class="platform-logo">
            <img :src="withBase(frontmatter.habits.logo)" alt="Habits" />
          </div>
          <span class="platform-name">{{ frontmatter.habits.name }}</span>
        </div>
        
        <div class="vs-badge">
          <span>VS</span>
        </div>
        
        <div class="platform-card competitor">
          <div class="platform-logo">
            <img :src="withBase(frontmatter.competitor.logo)" alt="Competitor" />
          </div>
          <span class="platform-name">{{ frontmatter.competitor.name }}</span>
        </div>
      </div>
    </section>

    <!-- Comparison Table -->
    <section class="comparison-table-section">
      <h2 class="section-title">{{ frontmatter.tableTitle || 'Feature Comparison' }}</h2>
      <div class="table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>
                <img :src="withBase(frontmatter.habits.logo)" class="table-logo" alt="Habits" />
                <br />
                <span>Habits</span>
              </th>
              <th>
                <img :src="withBase(frontmatter.competitor.logo)" class="table-logo" alt="Competitor" />
                <br />
                <span>{{ frontmatter.competitor.name }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in frontmatter.features" :key="index" :class="{ highlight: row.highlight }">
              <td class="feature-name" data-label="Feature">
                <Icon v-if="row.icon" :name="row.icon" :size="18" class="feature-icon" />
                {{ row.name }}
              </td>
              <td class="feature-value" data-label="Habits">
                <Icon v-if="row.habits === true" name="check" :size="24" class="check" />
                <Icon v-else-if="row.habits === false" name="x" :size="24" class="cross" />
                <span v-else-if="row.habits === 'partial'" class="partial">◐</span>
                <span v-else class="text-value">{{ row.habits }}</span>
              </td>
              <td class="feature-value" :data-label="frontmatter.competitor.name">
                <Icon v-if="row.competitor === true" name="check" :size="24" class="check" />
                <Icon v-else-if="row.competitor === false" name="x" :size="24" class="cross" />
                <span v-else-if="row.competitor === 'partial'" class="partial">◐</span>
                <span v-else class="text-value">{{ row.competitor }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="table-legend">
        <Icon name="check" :size="16" class="check" /> Full support
        <span class="partial">◐</span> Partial support
        <Icon name="x" :size="16" class="cross" /> Not supported
      </p>
    </section>

    <!-- Hero Bar CTA -->
    <section class="hero-bar">
      <div class="hero-bar-content">
        <h2 class="hero-bar-title">{{ frontmatter.heroBar.title }}</h2>
        <p class="hero-bar-subtitle">{{ frontmatter.heroBar.subtitle }}</p>
        <div class="hero-bar-actions" v-if="frontmatter.heroBar.actions">
          <a 
            v-for="(action, index) in frontmatter.heroBar.actions" 
            :key="index"
            :href="withBase(action.link)"
            class="hero-bar-btn"
            :class="action.type || 'primary'"
          >
            {{ action.text }}
          </a>
        </div>
      </div>
    </section>

    <!-- Extra Sections - Alternating Layout -->
    <section class="extra-sections-alt">
      <div 
        v-for="(section, index) in frontmatter.sections" 
        :key="index"
        class="section-row"
        :class="[section.type || 'default', { 'reverse': index % 2 === 1 }]"
      >
        <div class="section-content">
          <div class="section-badge" v-if="section.icon">
            <Icon :name="section.icon" :size="28" />
          </div>
          <h3 class="section-heading">{{ section.title }}</h3>
          <p class="section-description">{{ section.description }}</p>

          <!-- CTA if provided -->
          <a v-if="section.cta" :href="withBase(section.cta.link)" class="section-cta">
            {{ section.cta.text }} <Icon name="arrow-right" :size="16" />
          </a>
        </div>

        <div class="section-visual">
          <!-- Code block if provided -->
          <div v-if="section.code" class="section-code">
            <div class="code-header">
              <span class="code-dot"></span>
              <span class="code-dot"></span>
              <span class="code-dot"></span>
            </div>
            <pre><code>{{ section.code }}</code></pre>
          </div>
          
          <!-- List items on the right side -->
          <ul v-else-if="section.items?.length" class="section-list">
            <li v-for="(item, i) in section.items" :key="i">
              <span class="item-icon">
                <Icon :name="item.icon || 'check'" :size="18" />
              </span>
              <div class="item-content">
                <strong v-if="item.title">{{ item.title }}</strong>
                <span>{{ item.text }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Bottom Navigation -->
    <section class="bottom-nav">
      <a 
        v-for="(link, index) in frontmatter.relatedLinks" 
        :key="index"
        :href="withBase(link.link)"
        class="nav-card"
      >
        <span class="nav-label">{{ link.label }}</span>
        <span class="nav-title">{{ link.title }}</span>
      </a>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useData, withBase } from 'vitepress'
import { onMounted, onUnmounted } from 'vue'
import Icon from './Icon.vue'

const { frontmatter } = useData()

// Scroll detection for table
const checkTableScroll = () => {
  const wrapper = document.querySelector('.table-wrapper') as HTMLElement
  if (wrapper) {
    const canScroll = wrapper.scrollWidth > wrapper.clientWidth
    const isScrolledToEnd = wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 10
    wrapper.classList.toggle('can-scroll', canScroll && !isScrolledToEnd)
  }
}

onMounted(() => {
  checkTableScroll()
  window.addEventListener('resize', checkTableScroll)
  const wrapper = document.querySelector('.table-wrapper')
  wrapper?.addEventListener('scroll', checkTableScroll)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkTableScroll)
  const wrapper = document.querySelector('.table-wrapper')
  wrapper?.removeEventListener('scroll', checkTableScroll)
})
</script>
<style>
.content-container {
    max-width: 100% !important;
}
</style>
<style scoped>
.comparison-layout {
  width: 100%;
  margin: 0 auto;
  padding: 40px 24px 80px;
}


/* Hero Section */
.comparison-hero {
  text-align: center;
  margin-bottom: 48px;
}

.comparison-title {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-brand-2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
  line-height: 1.2;
}

.comparison-intro {
  font-size: 1.25rem;
  color: var(--vp-c-text-2);
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
}

/* VS Section */
.vs-section {
  margin-bottom: 64px;
}

.vs-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
}

.platform-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 40px;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  border: 2px solid var(--vp-c-divider);
  transition: all 0.3s ease;
}

.platform-card.habits {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 20px rgba(var(--vp-c-brand-1-rgb), 0.15);
}

.platform-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}

.platform-logo {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.platform-logo img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.platform-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.vs-badge {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(244, 63, 94, 0.3);
}

.vs-badge span {
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  letter-spacing: 1px;
}

/* Comparison Table */
.comparison-table-section {
  margin-bottom: 64px;
  position: relative;
}

.section-title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 32px;
  color: var(--vp-c-text-1);
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  -webkit-overflow-scrolling: touch;
  position: relative;
}

.table-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to left, var(--vp-c-bg-soft) 0%, transparent 100%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 0 16px 16px 0;
}

.table-wrapper.can-scroll::after {
  opacity: 1;
}

.table-wrapper::-webkit-scrollbar {
  height: 8px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: var(--vp-c-divider);
  border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: var(--vp-c-text-3);
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  min-width: 500px;
}

.comparison-table thead {
  background: var(--vp-c-bg-alt);
}

.comparison-table th {
  padding: 20px 24px;
  text-align: center;
  font-weight: 600;
  color: var(--vp-c-text-1);
  border-bottom: 2px solid var(--vp-c-divider);
}

.comparison-table th:first-child {
  text-align: left;
  width: 40%;
}

.table-logo {
  width: 24px;
  height: 24px;
  margin-right: 8px;
  vertical-align: middle;
  display: inline;
}

.comparison-table td {
  padding: 16px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.comparison-table tr:last-child td {
  border-bottom: none;
}

.comparison-table tr:hover {
  background: var(--vp-c-bg-alt);
}

.comparison-table tr.highlight {
  background: rgba(var(--vp-c-brand-1-rgb), 0.08);
}

.feature-name {
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.feature-icon {
  margin-right: 8px;
}

.feature-value {
  text-align: center;
  font-size: 1.25rem;
}

.check {
  color: #10b981;
  font-weight: 700;
}

.cross {
  color: #ef4444;
  font-weight: 700;
}

.partial {
  color: #f59e0b;
  font-weight: 700;
}

.text-value {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.table-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

.table-legend span {
  margin-right: 4px;
}

/* Hero Bar */
.hero-bar {
  background: linear-gradient(135deg, var(--vp-c-brand-2) 0%, var(--vp-c-brand-2) 100%);
  border-radius: 20px;
  padding: 48px 40px;
  margin-bottom: 64px;
  text-align: center;
}

.hero-bar-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-bar-title {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 12px;
}

.hero-bar-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 24px;
}

.hero-bar-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.hero-bar-btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.hero-bar-btn.primary {
  background: white;
  color: var(--vp-c-brand-1);
}

.hero-bar-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.hero-bar-btn.secondary {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.hero-bar-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Extra Sections - Alternating Layout */
.extra-sections-alt {
  display: flex;
  flex-direction: column;
  gap: 64px;
  margin-bottom: 80px;
  max-width: 1100px;
  margin-left: auto;
  margin-right: auto;
}

.section-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  padding: 40px;
  border-radius: 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.section-row.reverse {
  direction: rtl;
}

.section-row.reverse > * {
  direction: ltr;
}

.section-row.highlight {
  background: linear-gradient(135deg, rgba(var(--vp-c-brand-1-rgb), 0.08) 0%, rgba(var(--vp-c-brand-2-rgb), 0.03) 100%);
  border-color: var(--vp-c-brand-1);
}

.section-row.warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%);
  border-color: #f59e0b;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-badge {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-brand-2) 100%);
  border-radius: 14px;
  color: white;
  box-shadow: 0 8px 24px rgba(var(--vp-c-brand-1-rgb), 0.25);
}

.section-heading {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
  line-height: 1.3;
}

.section-description {
  color: var(--vp-c-text-2);
  line-height: 1.7;
  font-size: 1.05rem;
  margin: 0;
}

.item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--vp-c-brand-1-rgb), 0.12);
  border-radius: 8px;
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-content strong {
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
}

.item-content span {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.5;
}

.section-visual {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.section-visual .section-list {
  width: 100%;
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-visual .section-list li {
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  background: var(--vp-c-bg);
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);
  transition: all 0.2s ease;
}

.section-visual .section-list li:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.section-code {
  background: #1a1a2e;
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.code-header {
  display: flex;
  gap: 8px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.code-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.code-dot:nth-child(1) { background: #ff5f57; }
.code-dot:nth-child(2) { background: #febc2e; }
.code-dot:nth-child(3) { background: #28c840; }

.section-code pre {
  margin: 0;
  padding: 20px;
  overflow-x: auto;
}

.section-code code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  color: #e2e8f0;
  line-height: 1.6;
  white-space: pre-line;
}

.section-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  padding: 8px 0;
}

.section-cta:hover {
  color: var(--vp-c-brand-2);
  gap: 12px;
}

/* Bottom Navigation */
.bottom-nav {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.nav-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
  min-width: 200px;
}

.nav-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.nav-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--vp-c-text-3);
}

.nav-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* Responsive */
@media (max-width: 768px) {
  .comparison-layout {
    padding: 24px 16px 60px;
  }

  .comparison-title {
    font-size: 2rem;
  }

  .comparison-intro {
    font-size: 1rem;
  }

  .vs-container {
    flex-direction: column;
    gap: 16px;
  }

  .vs-badge {
    width: 48px;
    height: 48px;
  }

  .vs-badge span {
    font-size: 1rem;
  }

  .platform-card {
    padding: 20px 32px;
  }

  .platform-logo {
    width: 60px;
    height: 60px;
  }

  .table-wrapper {
    overflow: visible;
    border: none;
    background: transparent;
  }

  .table-wrapper::after {
    display: none;
  }

  .comparison-table {
    min-width: 0;
    width: 100%;
    font-size: 0.85rem;
    display: block;
  }

  .comparison-table thead {
    display: none;
  }

  .comparison-table tbody {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .comparison-table tr {
    display: block;
    border: 1px solid var(--vp-c-divider);
    border-radius: 12px;
    overflow: hidden;
    background: var(--vp-c-bg-soft);
  }

  .comparison-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vp-c-divider);
  }

  .comparison-table tr:last-child td {
    border-bottom: 1px solid var(--vp-c-divider);
  }

  .comparison-table tr td:last-child {
    border-bottom: none;
  }

  .comparison-table td.feature-name {
    justify-content: flex-start;
    background: var(--vp-c-bg-alt);
    font-weight: 600;
    border-bottom: 1px solid var(--vp-c-divider);
  }

  .comparison-table td.feature-value::before {
    content: attr(data-label);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--vp-c-text-2);
    font-weight: 600;
  }

  .comparison-table td.feature-value .text-value {
    text-align: right;
  }

  .table-logo {
    width: 20px;
    height: 20px;
  }

  .feature-icon {
    display: none;
  }

  .table-legend {
    flex-wrap: wrap;
    gap: 12px;
    font-size: 0.75rem;
  }

  .hero-bar {
    padding: 32px 24px;
  }

  .hero-bar-title {
    font-size: 1.5rem;
  }

  /* Alternating sections mobile */
  .extra-sections-alt {
    gap: 32px;
  }

  .section-row {
    grid-template-columns: 1fr;
    padding: 24px;
    gap: 32px;
  }

  .section-row.reverse {
    direction: ltr;
  }

  .section-badge {
    width: 48px;
    height: 48px;
  }

  .section-heading {
    font-size: 1.25rem;
  }

  .section-description {
    font-size: 0.95rem;
  }

  .section-visual .section-list li {
    padding: 12px 14px;
  }

  .section-visual .section-list {
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .comparison-table {
    min-width: 0;
    font-size: 0.8rem;
  }

  .comparison-table th,
  .comparison-table td {
    padding: 10px 12px;
  }

  .text-value {
    font-size: 0.75rem;
  }

  .section-row {
    padding: 20px;
    gap: 24px;
  }
}
</style>
