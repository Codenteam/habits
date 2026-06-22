<template>
  <div class="pricing-page">
    <!-- Animated backdrop -->
    <div class="pricing-canvas-bg" aria-hidden="true">
      <div class="pricing-orb pricing-orb-a" />
      <div class="pricing-orb pricing-orb-b" />
      <div class="pricing-orb pricing-orb-c" />
      <div class="pricing-grid" />
    </div>

    <!-- Hero -->
    <section class="pricing-hero">
      <div class="pricing-badge">
        <span class="badge-dot" />
        Enterprise
      </div>
      <h1 class="pricing-title">
        Automate at scale.<br />
        <span class="title-gradient">Pay for what you build.</span>
      </h1>
      <p class="pricing-lead">
        Habits is open source under AGPL-3.0, run it yourself for free.
        Need a custom workflow or managed hosting? Transparent, flat-rate pricing with no surprises.
      </p>
      <div class="hero-stats">
        <div v-for="stat in stats" :key="stat.label" class="hero-stat">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </section>

    <!-- Pricing cards -->
    <section class="pricing-cards-section">
      <div class="pricing-cards">
        <article
          v-for="(plan, i) in plans"
          :key="plan.id"
          class="pricing-card"
          :class="{ featured: plan.featured, [`card-${i}`]: true }"
          :style="{ '--card-accent': plan.accent }"
        >
          <div v-if="plan.featured" class="featured-badge">Most popular</div>
          <div class="card-glow" aria-hidden="true" />

          <div class="card-icon" v-html="plan.icon" />

          <h2 class="card-title">{{ plan.title }}</h2>
          <p class="card-tagline">{{ plan.tagline }}</p>

          <div class="card-price">
            <template v-if="plan.price">
              <span class="price-currency">$</span>
              <span class="price-amount">{{ plan.price }}</span>
              <span class="price-unit">{{ plan.unit }}</span>
            </template>
            <template v-else>
              <span class="price-custom">{{ plan.priceLabel }}</span>
            </template>
          </div>

          <p v-if="plan.priceNote" class="price-note">{{ plan.priceNote }}</p>

          <ul class="card-features">
            <li v-for="feat in plan.features" :key="feat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ feat }}
            </li>
          </ul>

          <a :href="withBase(plan.ctaHref)" class="card-cta" :class="{ primary: plan.featured }">
            {{ plan.cta }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </article>
      </div>
    </section>

    <!-- Hub hosting regions -->
    <section class="hosting-section">
      <div class="hosting-inner">
        <div class="hosting-header">
          <p class="section-eyebrow">Codenteam Hub</p>
          <h2 class="section-title">Managed hosting, US & EU</h2>
          <p class="section-sub">
            Deploy habits to production without touching infrastructure.
            Competitive rates through our Hub, with datacenters in the US and EU for data residency compliance.
          </p>
        </div>

        <div class="region-columns">
          <article
            v-for="region in regionColumns"
            :key="region.id"
            class="region-column"
          >
            <div class="region-column-header">
              <span class="region-flag">{{ region.flag }}</span>
              <div class="region-column-title">
                <h3>{{ region.name }}</h3>
                <span class="region-city">{{ region.city }}</span>
              </div>
            </div>

            <div class="region-meta">
              <div v-for="item in region.highlights" :key="item.label" class="meta-item">
                <span class="meta-icon" v-html="item.icon" />
                <div>
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.value }}</span>
                </div>
              </div>
            </div>

            <ul class="region-features">
              <li v-for="f in region.features" :key="f">{{ f }}</li>
            </ul>
          </article>
        </div>

        <div class="hosting-cta-row">
          <a :href="withBase('/register')" class="region-cta">
            Request a private instance
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="process-section">
      <p class="section-eyebrow">Simple process</p>
      <h2 class="section-title">From idea to production</h2>
      <div class="process-steps">
        <div v-for="(step, i) in steps" :key="step.title" class="process-step">
          <div class="process-step-card">
            <div class="step-number">{{ String(i + 1).padStart(2, '0') }}</div>
            <p class="step-title">{{ step.title }}</p>
            <p class="step-desc">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="faq-section">
      <p class="section-eyebrow">FAQ</p>
      <h2 class="section-title">Common questions</h2>
      <div class="faq-list">
        <details v-for="item in faq" :key="item.q" class="faq-item">
          <summary>{{ item.q }}</summary>
          <p>{{ item.a }}</p>
        </details>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section class="bottom-cta">
      <div class="bottom-cta-inner">
        <h2>Ready to automate your organization?</h2>
        <p>Tell us what you need: custom habits, hosting, or both. We'll scope it in one conversation.</p>
        <div class="bottom-cta-actions">
          <a :href="withBase('/register')" class="btn-primary">Get started with Hub</a>
          <a href="mailto:contact@codenteam.com?subject=Habits%20Enterprise%20Inquiry" class="btn-secondary">Contact sales</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress'

const stats = [
  { value: 'AGPL-3.0', label: 'Open source license' },
  { value: '$50', label: 'Per node per custom habit' },
  { value: '2', label: 'Global datacenters' },
]

const plans = [
  {
    id: 'self-host',
    title: 'Self-Hosted',
    tagline: 'Full platform, zero license fees',
    priceLabel: 'Free',
    priceNote: 'AGPL-3.0 · run anywhere',
    accent: '#22c55e',
    featured: false,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    features: [
      'Visual builder (Base)',
      'Cortex workflow engine',
      'Desktop & mobile apps',
      'Unlimited habits & workflows',
      'Community support',
    ],
    cta: 'Get started',
    ctaHref: '/getting-started/first-habit',
  },
  {
    id: 'custom-habit',
    title: 'Custom Habit',
    tagline: 'We build it, you own it',
    price: '50',
    unit: '/ node',
    priceNote: 'Flat rate · no hourly billing',
    accent: '#6366f1',
    featured: true,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    features: [
      'End-to-end workflow design',
      'YAML frontend included',
      'Integration with your stack',
      'Delivered as a .habit file',
      'Revision round included',
      'Priority delivery timeline',
    ],
    cta: 'Request a custom habit',
    ctaHref: '/register',
  },
  {
    id: 'hub-hosting',
    title: 'Hub Hosting',
    tagline: 'Managed cloud through Codenteam Hub',
    priceLabel: 'Competitive',
    priceNote: 'US & EU datacenters · volume discounts',
    accent: '#38bdf8',
    featured: false,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>`,
    features: [
      'Private instance per team',
      'Custom subdomain routing',
      'Automatic SSL & updates',
      'US or EU data residency',
      'Admin dashboard included',
      'SLA-backed uptime',
    ],
    cta: 'Request hosting',
    ctaHref: '/register',
  },
]

const regionColumns = [
  {
    id: 'us',
    name: 'United States',
    flag: '🇺🇸',
    city: 'US East',
    highlights: [
      { label: 'Latency', value: 'Optimized for North America', icon: '⚡' },
      { label: 'Compliance', value: 'ISO 27001:2022 certified cloud provider', icon: '🛡️' },
      { label: 'Pricing', value: 'Competitive monthly rates', icon: '💰' },
    ],
    features: [
      'Private Habits instance with custom subdomain',
      'Automatic HTTPS via Caddy reverse proxy',
      'Docker-based deployment with zero DevOps on your side',
      'Scale habits independently per service',
      'Volume discounts for multiple instances',
      'Cloud provider certified to ISO 27001:2022',
    ],
  },
  {
    id: 'eu',
    name: 'European Union',
    flag: '🇪🇺',
    city: 'EU West',
    highlights: [
      { label: 'Data residency', value: 'GDPR-aligned hosting', icon: '🇪🇺' },
      { label: 'Compliance', value: 'ISO 27001:2022 certified cloud provider', icon: '🛡️' },
      { label: 'Latency', value: 'Optimized for Europe', icon: '⚡' },
      { label: 'Pricing', value: 'Competitive monthly rates', icon: '💰' },
    ],
    features: [
      'All data processed within EU jurisdiction',
      'Same Hub features as US. Pick your region at signup',
      'Custom domain support with DNS verification',
      'Isolated containers per customer instance',
      'Enterprise invoicing & procurement friendly',
      'Cloud provider certified to ISO 27001:2022',
    ],
  },
]

const steps = [
  { title: 'Describe your workflow', desc: 'Tell us what you want to automate: integrations, triggers, UI, and data flow.' },
  { title: 'We build your habit', desc: 'Our team delivers a production-ready .habit file at a flat $50 rate per node.' },
  { title: 'Deploy on Hub or self-host', desc: 'Run on your infrastructure for free, or let us host it in US or EU datacenters.' },
  { title: 'Iterate & scale', desc: 'Add more habits, connect new services, and grow your automation library.' },
]

const faq = [
  {
    q: 'What counts as a "node" in a "custom habit" ?',
    a: 'A node is each individual component within a custom habit. A custom habit is a complete workflow: backend logic, integrations, and optional YAML frontend, built to your specifications. One flat $50 fee covers each node.',
  },
  {
    q: 'Is the platform itself free?',
    a: 'Yes. Habits is open source under AGPL-3.0. You can self-host Base, Cortex, and the desktop/mobile apps at no license cost. We charge only for custom development and optional managed hosting.',
  },
  {
    q: 'How does Hub hosting pricing work?',
    a: 'Hub hosting is billed at competitive monthly rates based on your instance size and number of deployed habits. Contact us for a quote. We offer volume discounts for teams running multiple services.',
  },
  {
    q: 'Can I switch between US and EU datacenters?',
    a: 'You choose your region when provisioning a Hub instance. If you need to migrate later, our team can assist with a planned transition.',
  },
  {
    q: 'What compliance certifications apply to Hub hosting?',
    a: 'Hub runs on infrastructure from a cloud provider certified to ISO 27001:2022. We do not hold SOC 2 ourselves; compliance for hosted workloads is supported through our provider\'s ISO 27001:2022 certification in both US and EU regions.',
  },
  {
    q: 'Do you offer enterprise support or SLAs?',
    a: 'Hub-hosted instances include SLA-backed uptime. For dedicated support channels, custom SLAs, and procurement-friendly invoicing, reach out to our sales team.',
  },
]
</script>

<style scoped>
.pricing-page {
  position: relative;
  isolation: isolate;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 96px;
  overflow: hidden;
}

/* Backdrop */
.pricing-canvas-bg {
  position: absolute;
  inset: -120px -24px auto;
  height: 800px;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.pricing-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: orb-drift 18s ease-in-out infinite alternate;
}

.pricing-orb-a {
  width: 480px; height: 480px;
  left: -8%; top: 0;
  background: radial-gradient(circle, var(--home-orb-1), transparent 70%);
}

.pricing-orb-b {
  width: 400px; height: 400px;
  right: -5%; top: 10%;
  background: radial-gradient(circle, var(--home-orb-2), transparent 70%);
  animation-delay: -6s;
}

.pricing-orb-c {
  width: 320px; height: 320px;
  left: 35%; top: 30%;
  background: radial-gradient(circle, var(--home-orb-3), transparent 70%);
  animation-delay: -12s;
}

.pricing-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--home-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--home-grid-line) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at 50% 20%, rgba(0,0,0,0.7), transparent 70%);
}

@keyframes orb-drift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(30px, 20px) scale(1.08); }
}

/* Hero */
.pricing-hero {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 48px 0 64px;
}

.pricing-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: var(--home-radius-pill);
  background: var(--home-surface-glass);
  border: 1px solid var(--home-border-glass);
  backdrop-filter: blur(var(--home-blur-soft));
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--home-brand-1);
  margin-bottom: 24px;
}

.badge-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--home-accent-3);
  box-shadow: 0 0 8px var(--home-accent-3);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.pricing-title {
  font-size: clamp(2.4rem, 5vw, 3.75rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: 0 0 20px;
  color: var(--vp-c-text-1);
}

.title-gradient {
  background: var(--home-brand-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.pricing-lead {
  font-size: 1.15rem;
  line-height: 1.7;
  color: var(--home-text-soft);
  max-width: 640px;
  margin: 0 auto 40px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
  flex-wrap: wrap;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  background: var(--home-brand-gradient-2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--home-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Cards */
.pricing-cards-section {
  position: relative;
  z-index: 1;
  margin-bottom: 80px;
}

.pricing-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  align-items: stretch;
}

.pricing-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 32px 28px;
  border-radius: var(--home-radius-xl);
  background: var(--home-surface-glass);
  border: 1px solid var(--home-border-glass);
  backdrop-filter: blur(var(--home-blur));
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease, border-color 0.35s ease;
  overflow: hidden;
}

.pricing-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--home-shadow-2);
  border-color: var(--home-border-strong);
}

.pricing-card.featured {
  border-color: color-mix(in srgb, var(--card-accent) 45%, transparent);
  background: var(--home-surface-glass-strong);
  box-shadow: var(--home-glow-brand), var(--home-shadow-1);
}

.pricing-card.featured:hover {
  transform: translateY(-6px);
}

.featured-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 5px 12px;
  margin-bottom: 16px;
  border-radius: var(--home-radius-pill);
  background: var(--home-brand-gradient);
  color: white;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  box-shadow: var(--home-shadow-1);
}

.card-glow {
  position: absolute;
  top: -40%; left: 50%;
  transform: translateX(-50%);
  width: 200px; height: 200px;
  border-radius: 50%;
  background: var(--card-accent);
  opacity: 0.12;
  filter: blur(60px);
  pointer-events: none;
}

.card-icon :deep(svg) {
  width: 36px; height: 36px;
  color: var(--card-accent);
  margin-bottom: 16px;
}

.card-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 6px;
}

.card-tagline {
  font-size: 0.9rem;
  color: var(--home-text-soft);
  margin: 0 0 24px;
}

.card-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 4px;
}

.price-currency {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--home-text-soft);
}

.price-amount {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--vp-c-text-1);
}

.price-unit {
  font-size: 0.95rem;
  color: var(--home-text-soft);
  margin-left: 4px;
}

.price-custom {
  font-size: 2.25rem;
  font-weight: 800;
  background: var(--home-brand-gradient-2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.price-note {
  font-size: 0.8rem;
  color: var(--home-text-faint);
  margin: 0 0 24px;
}

.card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  flex: 1;
}

.card-features li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--home-text-soft);
  padding: 7px 0;
  border-bottom: 1px solid var(--home-border-glass);
}

.card-features li:last-child { border-bottom: none; }

.card-features svg {
  width: 16px; height: 16px;
  color: var(--card-accent);
  flex-shrink: 0;
  margin-top: 2px;
}

.card-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: var(--home-radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--home-border-strong);
  color: var(--vp-c-text-1);
  background: var(--home-surface-sunken);
  transition: all 0.25s ease;
}

.card-cta svg { width: 16px; height: 16px; }

.card-cta:hover {
  border-color: var(--card-accent);
  color: var(--card-accent);
}

.card-cta.primary {
  background: var(--home-brand-gradient);
  border-color: transparent;
  color: white;
  box-shadow: var(--home-glow-brand);
}

.card-cta.primary:hover {
  color: white;
  filter: brightness(1.08);
  transform: translateY(-1px);
}

/* Hosting section */
.hosting-section {
  position: relative;
  z-index: 1;
  margin-bottom: 80px;
}

.hosting-inner {
  background: var(--home-surface-glass);
  border: 1px solid var(--home-border-glass);
  border-radius: var(--home-radius-xl);
  backdrop-filter: blur(var(--home-blur));
  padding: 48px;
  overflow: hidden;
}

.hosting-header {
  text-align: center;
  margin-bottom: 36px;
}

.section-eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--home-brand-1);
  margin: 0 0 8px;
}

.section-title {
  font-size: clamp(1.6rem, 3vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
}

.section-sub {
  font-size: 1rem;
  color: var(--home-text-soft);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
}

.region-columns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.region-column {
  background: var(--home-surface-sunken);
  border: 1px solid var(--home-border-glass);
  border-radius: var(--home-radius-lg);
  padding: 28px;
  display: flex;
  flex-direction: column;
}

.region-column-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--home-border-glass);
}

.region-column-title h3 {
  margin: 0 0 4px;
  font-size: 1.15rem;
  font-weight: 700;
}

.region-city {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--home-brand-1);
  background: color-mix(in srgb, var(--home-brand-1) 12%, transparent);
  padding: 3px 10px;
  border-radius: var(--home-radius-pill);
}

.region-flag { font-size: 1.75rem; line-height: 1; }

.hosting-cta-row {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding-top: 8px;
}

.region-meta {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.meta-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.meta-icon { font-size: 1.25rem; line-height: 1; }

.meta-item strong {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 2px;
}

.meta-item span:last-child {
  font-size: 0.85rem;
  color: var(--home-text-soft);
}

.region-features {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}

.region-features li {
  position: relative;
  padding: 8px 0 8px 20px;
  font-size: 0.9rem;
  color: var(--home-text-soft);
  border-bottom: 1px solid var(--home-border-glass);
}

.region-features li::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--home-brand-1);
}

.region-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--home-brand-1);
  text-decoration: none;
}

.region-cta svg { width: 16px; height: 16px; }
.region-cta:hover { text-decoration: underline; }

/* Process */
.process-section {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 80px;
}

.process-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 40px;
}

.process-step-card {
  height: 100%;
  text-align: left;
  background: var(--home-surface-glass);
  border: 1px solid var(--home-border-glass);
  border-radius: var(--home-radius-lg);
  padding: 24px 22px;
  backdrop-filter: blur(var(--home-blur-soft));
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border-radius: var(--home-radius-pill);
  background: var(--home-brand-gradient);
  color: white;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  margin-bottom: 16px;
  box-shadow: var(--home-shadow-1);
}

.step-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
  line-height: 1.35;
}

.step-desc {
  font-size: 0.85rem;
  color: var(--home-text-soft);
  line-height: 1.55;
  margin: 0;
}

/* FAQ */
.faq-section {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto 80px;
}

.faq-section .section-title { text-align: center; margin-bottom: 32px; }
.faq-section .section-eyebrow { text-align: center; }

.faq-list { display: flex; flex-direction: column; gap: 8px; }

.faq-item {
  background: var(--home-surface-glass);
  border: 1px solid var(--home-border-glass);
  border-radius: var(--home-radius-md);
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.faq-item[open] { border-color: color-mix(in srgb, var(--home-brand-1) 30%, transparent); }

.faq-item summary {
  padding: 16px 20px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.faq-item summary::-webkit-details-marker { display: none; }

.faq-item summary::after {
  content: '+';
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--home-text-faint);
  transition: transform 0.2s ease;
}

.faq-item[open] summary::after { transform: rotate(45deg); }

.faq-item p {
  padding: 0 20px 16px;
  margin: 0;
  font-size: 0.9rem;
  color: var(--home-text-soft);
  line-height: 1.6;
}

/* Bottom CTA */
.bottom-cta {
  position: relative;
  z-index: 1;
}

.bottom-cta-inner {
  text-align: center;
  padding: 56px 40px;
  border-radius: var(--home-radius-xl);
  background: var(--home-brand-gradient);
  color: white;
  box-shadow: var(--home-glow-brand), var(--home-shadow-2);
}

.bottom-cta-inner h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  margin: 0 0 12px;
  color: white;
}

.bottom-cta-inner p {
  font-size: 1rem;
  opacity: 0.9;
  max-width: 480px;
  margin: 0 auto 28px;
  line-height: 1.6;
}

.bottom-cta-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  border-radius: var(--home-radius-md);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.25s ease;
}

.btn-primary {
  background: white;
  color: var(--home-brand-1);
}

.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

.btn-secondary {
  background: rgba(255,255,255,0.15);
  color: white;
  border: 1px solid rgba(255,255,255,0.35);
  backdrop-filter: blur(8px);
}

.btn-secondary:hover { background: rgba(255,255,255,0.25); }

/* Responsive */
@media (max-width: 960px) {
  .pricing-cards { grid-template-columns: 1fr; max-width: 420px; margin-inline: auto; }
  .region-columns { grid-template-columns: 1fr; }
  .process-steps { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 600px) {
  .hosting-inner { padding: 28px 20px; }
  .process-steps { grid-template-columns: 1fr; }
  .hero-stats { gap: 24px; }
}
</style>
