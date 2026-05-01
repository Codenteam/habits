<script setup>
// V11, "What brings you here?", V2 layout (left rail + right content)
// Rail items are long descriptive questions. Every persona has screenshot placeholders.
import { ref, onMounted, onUnmounted } from 'vue'
import { withBase } from 'vitepress'
import feather from 'feather-icons'

const icon = (n) => feather.icons[n]?.toSvg({ class: 'fi' }) || ''

const sectionRef = ref(null)
const isVisible = ref(false)
const currentPersonaId = ref('enterprise')

function check() {
  if (!sectionRef.value) return
  if (sectionRef.value.getBoundingClientRect().top < window.innerHeight * 0.85) isVisible.value = true
}
onMounted(() => {
  window.addEventListener('scroll', check, { passive: true })
  window.addEventListener('keydown', onKeydown)
  check()
})
onUnmounted(() => {
  window.removeEventListener('scroll', check)
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

// ── Inline code viewer ───────────────────────────────────────────────────────
function tokenize(raw, lang) {
  const e = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if ((lang === 'yaml' || lang === 'sh') && raw.trimStart().startsWith('#'))
    return `<span class="cc-comment">${e(raw)}</span>`
  if (lang === 'ts' && raw.trimStart().startsWith('//'))
    return `<span class="cc-comment">${e(raw)}</span>`
  if (lang === 'yaml') {
    const m = raw.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_-]*)(\s*:.*)$/)
    if (m) return `${e(m[1])}<span class="cc-key">${e(m[2])}</span><span class="cc-plain">${e(m[3])}</span>`
  }
  let s = e(raw)
  if (lang === 'ts')
    s = s.replace(/\b(import|export|from|const|let|var|async|await|return|function|new|if|else|for)\b/g,
      '<span class="cc-keyword">$1</span>')
  return s
}

const CODE_ENTERPRISE_DOCKER = [
  'name: habits-admin',
  '',
  'services:',
  '  admin:',
  '    image: habits-admin:latest',
  '    restart: unless-stopped',
  '    env_file: admin.env',
  '    ports:',
  '      - "80:80"',
  '      - "443:443"',
  '      - "5354:53/udp"',
  '    volumes:',
  '      - habits-admin-data:/data',
  '',
  'volumes:',
  '  habits-admin-data:',
].join('\n')

const CODE_DEVELOPER_INIT = [
  "import { createBit, createAction, Property } from '@ha-bits/cortex-core';",
  '',
  '// ── Auth ────────────────────────────────────────────────────────────────',
  'const customAIAuth = Property.SecretText({',
  "  displayName: 'API Key', required: true,",
  '});',
  '',
  '// ── Action ──────────────────────────────────────────────────────────────',
  'const askCustomAI = createAction({',
  '  auth:        customAIAuth,',
  "  name:        'ask_custom_ai',",
  "  displayName: 'Ask Custom AI',",
  "  description: 'Send a prompt to your own AI endpoint.',",
  '  props: {',
  "    prompt: Property.LongText({  displayName: 'Prompt', required: true  }),",
  "    model:  Property.ShortText({ displayName: 'Model',  defaultValue: 'gpt-4o' }),",
  '  },',
  '  async run({ auth, propsValue }) {',
  "    const res = await fetch('https://api.my-company.com/ai', {",
  "      method:  'POST',",
  "      headers: { 'Authorization': `Bearer ${auth}` },",
  '      body:    JSON.stringify({ prompt: propsValue.prompt, model: propsValue.model }),',
  '    });',
  '    return res.json();',
  '  },',
  '});',
  '',
  '// ── Bit ──────────────────────────────────────────────────────────────────',
  'export const customAI = createBit({',
  "  displayName: 'Custom AI',",
  "  description: 'Your own AI model, packaged as a reusable habits bit.',",
  "  logoUrl:    'lucide:Cpu',",
  '  actions:   [askCustomAI],',
  '});',
].join('\n')

const CODE_DEVELOPER_VSCODE = [
  'name: my-saas-habit',
  'description: AI automation delivered as a product URL',
  '',
  'trigger:',
  '  type: webhook',
  '',
  'nodes:',
  '  - id:     ask-ai',
  '    module: @ha-bits/bit-customai',
  '    action: ask_custom_ai',
  '    label:  Ask AI',
  '    props:',
  '      prompt: "{{trigger.body.message}}"',
  '      model:  gpt-4o',
  '',
  '  - id:     respond',
  '    module: @ha-bits/bit-http',
  '    action: send_response',
  '    label:  Return result',
  '    props:',
  '      body:        "{{ask-ai.output.answer}}"',
  '      contentType: application/json',
  '',
  'connections:',
  '  ask-ai: "{{env.CUSTOM_AI_API_KEY}}"',
].join('\n')

const CODE_DEVELOPER_CUSTOM_NODES = [
  'docker run -p 3000:3000 node:20 \\',
  '  npx @ha-bits/cortex cortex --config my-habit.habit',
  '',
  '# habits/cortex \u2014 loading habit',
  '# \u2713 parsed    my-saas-habit v1.0.0',
  '# \u2713 validated 2 nodes',
  '',
  '# habits/cortex \u2014 pre-installing modules',
  '# \u2713 @ha-bits/bit-customai   installed  (1.2s)',
  '# \u2713 @ha-bits/bit-http       installed  (0.4s)',
  '',
  '# \u2713 habit ready',
  '# \u2713 server listening on http://0.0.0.0:3000',
  '',
  '# POST /api/my-saas-habit   \u2014 awaiting requests',
].join('\n')

const personas = [
  {
    id: 'enterprise',
    icon: 'server',
    color: '#8b5cf6',
    subject: 'Company Automations Hub',
    question: 'I need to host multiple automations for my company, with custom domains and a central admin panel.',
    badge: 'Enterprise / Team',
    title: 'Host habits for your whole company',
    description: 'Your automation developers work on the base to produce a working automation, and initiate a sharing process directly from within base to DevOps admin panel.',
    steps: [
      { n: 1, icon: 'box',           title: 'Pull and run the Docker image', desc: 'One docker image is all you need.', cmd: 'docker compose up' },
      { n: 2, icon: 'globe',         title: 'Assign a subdomain',            desc: 'Type a domain. The admin panel provisions DNS records and HTTPS automatically, no manual cert work.', cmd: null },
      { n: 3, icon: 'upload-cloud',  title: 'Upload or browse habits',       desc: 'Drag any .habit file into the panel, or pick from the built-in showcase library and deploy with a single click.', cmd: null },
      { n: 4, icon: 'external-link', title: 'Your habit goes live',          desc: 'Fully isolated, HTTPS-secured, and reachable at the subdomain you chose. Repeat for each habit.', cmd: null },
    ],
    shots: [
      { shot: 'Docker compose file and service startup output', file: 'enterprise-docker-boot', caption: 'One compose file boots everything the admin UI spin up together so your team can start using habits immediately.', code: { title: 'compose.yaml', lang: 'yaml', highlight: [5], text: CODE_ENTERPRISE_DOCKER } },
      { shot: 'Admin panel, subdomain & DNS assignment form',            file: 'enterprise-admin-subdomain', caption: 'Assign a subdomain in seconds, type a name and the admin panel auto-provisions the DNS record and TLS certificate with no manual configuration.' },
      { shot: 'Admin UI, habit library and upload interface',            file: 'enterprise-admin-library',   caption: 'Upload or browse habits centrally, drag any .habit file into the panel or pick from the built-in showcase library and deploy with a single click.' },
      { shot: 'Live marketing-campaign habit running at custom subdomain', file: 'enterprise-live-subdomain', caption: 'Your habit goes live, fully isolated, HTTPS-secured, and reachable at the subdomain you chose. Repeat for every habit your team needs.' },
    ],
    shotsGrid: 'shots-grid-2',
    captionLabel: (i) => `Step ${i + 1}`,
    cmd: null,
    stores: null,
    cta: { href: '/recipes/company-hub', text: 'Full setup guide →' },
  },
  {
    id: 'automation',
    icon: 'cpu',
    color: '#a855f7',
    subject: 'Create No-code Automation',
    question: 'I want to build visual workflows, connecting APIs, AI, and webhooks, without coding.',
    badge: 'Automation Builder',
    title: 'Build and run visual workflows',
    description: 'habits Base is a local drag-and-drop node canvas. Connect APIs, AI models, webhooks, schedules, and transforms, then pack everything into a single deployable binary that anyone can run with <code>npx</code>.',
    steps: null,
    shots: [
      { shot: 'habits Base canvas, node editor with connected nodes', file: 'automation-canvas',    caption: 'Open the visual canvas, drag nodes onto the board and connect them to start building your workflow, no code required.' },
      { shot: 'Node palette, API, AI, transform, and trigger nodes',  file: 'automation-palette',   embed: '/templates/automation-palette.svg', caption: 'Pick from built-in nodes, APIs, AI models, webhooks, schedules, and transforms are all ready to wire together in seconds.' },
      { shot: 'Live run panel, real-time execution log and output',   file: 'automation-run-panel', caption: 'Run and inspect in real time, every node shows its output live as the workflow executes so you can debug instantly.' },
      { shot: 'Pack dialog, exporting habit as a single binary file', file: 'automation-pack',      embed: '/templates/automation-pack.svg', caption: 'Pack into a single file, export your entire habit as a deployable binary that anyone can run with a single npx command.' },
    ],
    shotsGrid: 'shots-grid-2',
    captionLabel: (i) => `Step ${i + 1}`,
    cmd: 'npx habits@latest base',
    stores: null,
    cta: { href: '/recipes/no-code-automation', text: 'Build your first habit →' },
  },
  {
    id: 'apps',
    icon: 'smartphone',
    color: '#22c55e',
    subject: 'Local Apps',
    question: 'I want the app on my phone (iOS / Android) or a native desktop app on Mac, Windows, or Linux.',
    badge: 'Mobile & Desktop',
    title: 'Native apps for phone and desktop',
    description: 'Both apps embed a full Cortex runtime, habits run directly on the device with no server needed. The mobile app supports iOS and Android. The desktop app is a native Tauri build for macOS, Windows, and Linux, with offline operation and OS integrations like keychain and system notifications.',
    steps: null,
    shots: [
      { shot: 'App Store listing for habits mobile app',            file: 'mobile-app-store',  caption: 'Download the mobile app, habits is available on the App Store and Google Play so you can carry your automations in your pocket.' },
      { shot: 'Habit detail view, inputs, trigger, and run button', file: 'mobile-detail',     caption: 'Trigger from anywhere, fill inputs, configure a schedule or webhook trigger, and run any habit with a single tap.' },
      { shot: 'Download page, macOS, Windows, Linux options',       file: 'desktop-download',  caption: 'Download the desktop app, native builds for macOS, Windows, and Linux mean no browser needed and instant startup.' },
      { shot: 'OS integration, keychain access prompt dialog',      file: 'desktop-keychain',  caption: 'Deep OS integration, the apps can access your system keychain, WiFi settings, and notifications like any native app.' },
    ],
    shotsGrid: 'shots-grid-2',
    captionLabel: (i) => i < 2 ? 'Mobile' : 'Desktop',
    cmd: null,
    stores: [
      { icon: 'smartphone', text: 'App Store',               href: '#' },
      { icon: 'smartphone', text: 'Google Play',             href: '#' },
      { icon: 'monitor',    text: 'macOS / Windows / Linux', href: '#' },
    ],
    cta: { href: '/recipes/native-apps', text: 'Native apps guide →' },
  },
  {
    id: 'developer',
    icon: 'zap',
    color: '#ec4899',
    subject: 'Bits (Nodes) Builder',
    question: 'I want to integrate a service to habits by implementing a new bit type.',
    badge: 'Builder',
    title: 'Customize Habits',
    description: 'Write a custom bit in TypeScript, wire it into a habit YAML, and serve it to customers, all with zero backend code. One <code>docker run</code> line is all it takes to deploy.',
    steps: null,
    shots: [
      { shot: 'Custom TypeScript bit, a reusable AI action block', file: 'developer-init',         caption: 'Write a custom bit, a reusable TypeScript action block that can call any API, run any logic, and be shared as an npm package.', code: { title: 'custom-ai / src / index.ts',   lang: 'ts',   highlight: [9, 26],   text: CODE_DEVELOPER_INIT } },
      { shot: 'habit.yaml using @ha-bits/bit-smartai node',        file: 'developer-vscode',       caption: 'Wire it in YAML, your custom bit becomes a first-class node inside any habit workflow, composable with all built-in nodes.',   code: { title: 'my-saas-habit / habit.yaml', lang: 'yaml', highlight: [10, 11], text: CODE_DEVELOPER_VSCODE } },
      { shot: 'One docker line deploys your habit to Node.js',     file: 'developer-custom-nodes', caption: 'Deploy with one line, a single docker run command makes your habit available as a hosted, production-ready service.',           code: { title: 'Terminal \u2014 ~/my-saas-habit', lang: 'sh', highlight: [1], text: CODE_DEVELOPER_CUSTOM_NODES } },
      { shot: 'Habit running as a SaaS product customers can use', file: 'developer-npm',          caption: 'Customers get a live URL, your automation runs as a SaaS product your customers use through a browser with zero backend code from you.', imgStyle: { transform: 'scale(1.35)', transformOrigin: 'center center' } },
    ],
    shotsGrid: 'shots-grid-2',
    captionLabel: (i) => `Step ${i + 1}`,
    cmd: 'npx habits@latest init my-habit\ncd my-habit && habits base',
    stores: null,
    cta: { href: '/recipes/build-for-customers', text: 'Developer quickstart →' },
  },
  // ── Extra personas (hidden by default) ──────────────────────────────────
  {
    id: 'on-the-go',
    extra: true,
    icon: 'wifi-off',
    color: '#f97316',
    subject: 'On the Go',
    question: 'I need automations that run on my phone without internet — offline-first, local data and triggers.',
    badge: 'Offline Mobile',
    title: 'Run habits anywhere, no internet needed',
    description: 'The habits mobile app embeds a full Cortex runtime so your automations execute entirely on-device. WiFi went down? Your habits keep running. Trigger via NFC, schedule, or local sensor, then sync results when connectivity returns.',
    steps: null,
    shots: [
      { shot: 'Habit running offline, no connection indicator',       file: 'on-the-go-offline',  caption: 'Runs fully offline, the embedded Cortex runtime executes your entire workflow on-device with no server dependency.' },
      { shot: 'Local trigger options, NFC, schedule, and sensor',     file: 'on-the-go-triggers', caption: 'Local triggers only, kick off a habit from an NFC tap, a time schedule, or a device sensor without any network call.' },
      { shot: 'Sync queue, pending uploads waiting for connectivity', file: 'on-the-go-sync',     caption: 'Smart sync queue, results and logs are held locally and flushed automatically once connectivity is restored.' },
      { shot: 'Habit list, all habits cached and ready to run',       file: 'on-the-go-cached',   caption: 'Everything pre-cached, habits and their dependencies are bundled at install time so the first run is instant.' },
    ],
    shotsGrid: 'shots-grid-2',
    captionLabel: (i) => `Step ${i + 1}`,
    cmd: null,
    stores: [
      { icon: 'smartphone', text: 'App Store',   href: '#' },
      { icon: 'smartphone', text: 'Google Play', href: '#' },
    ],
    cta: { href: '/recipes/offline-mobile', text: 'Offline guide →' },
  },
  {
    id: 'saas-host',
    extra: true,
    icon: 'dollar-sign',
    color: '#06b6d4',
    subject: 'Host for Customers',
    question: 'I want to offer habits as a white-label service — custom branding, billing, and multi-tenant management all under my name.',
    badge: 'SaaS / White-label',
    title: 'Sell habits under your own brand',
    description: 'Spin up a multi-tenant habits platform with your logo, your domain, and your pricing. Each customer gets an isolated environment. Billing integrates with Stripe so you can charge per seat, per usage, or by subscription — all without touching the underlying infrastructure.',
    steps: null,
    shots: [
      { shot: 'White-label admin panel with custom logo and domain',   file: 'saas-host-branding',  caption: 'Your brand, your domain, swap in your logo and point a CNAME at the platform — customers never see the habits name.' },
      { shot: 'Multi-tenant dashboard, customer list and usage stats', file: 'saas-host-tenants',   caption: 'Manage all customers from one dashboard, see usage, toggle features, and provision new tenants in seconds.' },
      { shot: 'Billing settings, Stripe plans and usage meters',       file: 'saas-host-billing',   caption: 'Built-in billing, connect Stripe once and habits tracks usage, applies plan limits, and handles invoices automatically.' },
      { shot: 'Customer-facing habit runner, branded UI',              file: 'saas-host-customer',  caption: 'Customers get a clean, branded experience, they run and configure habits through your UI, not a generic tool.' },
    ],
    shotsGrid: 'shots-grid-2',
    captionLabel: (i) => `Step ${i + 1}`,
    cmd: null,
    stores: null,
    cta: { href: '/recipes/saas-hosting', text: 'White-label guide →' },
  },
  {
    id: 'data-pipelines',
    extra: true,
    icon: 'database',
    color: '#f59e0b',
    subject: 'Data Pipelines',
    question: 'I need to move, transform, and sync data between databases, spreadsheets, and APIs on a recurring schedule.',
    badge: 'Data Engineering',
    title: 'ETL and data sync without the overhead',
    description: 'Build reliable data pipelines visually. Pull from Postgres, MySQL, Google Sheets, REST APIs, or S3 — transform with built-in map, filter, and aggregate nodes — then push to any destination. Schedules, retry logic, and failure alerts are built in.',
    steps: null,
    shots: [
      { shot: 'Pipeline canvas, source nodes connected to transform and sink', file: 'data-pipelines-canvas',    caption: 'Visual pipeline builder, drag source, transform, and destination nodes and connect them into a reliable data flow.' },
      { shot: 'Source connector list, databases, sheets, APIs',                file: 'data-pipelines-sources',   caption: 'Dozens of connectors, pick from Postgres, MySQL, Sheets, REST APIs, S3, and more with zero custom code.' },
      { shot: 'Transform node, field mapping and filter configuration',        file: 'data-pipelines-transform', caption: 'Built-in transforms, map fields, filter rows, aggregate totals, and reshape payloads in a visual editor.' },
      { shot: 'Schedule and retry config, cron and failure alert settings',    file: 'data-pipelines-schedule',  caption: 'Reliable by default, set a cron schedule, configure retries, and get Slack or email alerts on failure.' },
    ],
    shotsGrid: 'shots-grid-2',
    captionLabel: (i) => `Step ${i + 1}`,
    cmd: 'npx habits@latest base',
    stores: null,
    cta: { href: '/recipes/data-pipelines', text: 'Data pipeline guide →' },
  },
  {
    id: 'ai-workflows',
    extra: true,
    icon: 'message-square',
    color: '#14b8a6',
    subject: 'AI & LLM Workflows',
    question: 'I want to build RAG pipelines, chatbots, or AI-powered processing using ChatGPT, local models, or embeddings.',
    badge: 'AI / LLM',
    title: 'Wire AI models into production workflows',
    description: 'Connect OpenAI, Anthropic, Ollama, or any custom model endpoint to real data sources and actions. Build RAG pipelines with vector search, multi-step reasoning chains, or AI-triggered automations — all as composable habit nodes with full observability.',
    steps: null,
    shots: [
      { shot: 'AI workflow canvas, LLM node wired to retrieval and action nodes', file: 'ai-workflows-canvas',    caption: 'Compose AI like any other node, drop an LLM node onto the canvas and connect it to retrieval, memory, and action nodes.' },
      { shot: 'RAG pipeline, embed, search, and prompt nodes connected',         file: 'ai-workflows-rag',       caption: 'RAG in minutes, chain an embed node, a vector-search node, and a prompt node to build retrieval-augmented generation.' },
      { shot: 'Model selector, OpenAI, Anthropic, Ollama, and custom endpoint',  file: 'ai-workflows-models',    caption: 'Any model, any provider, switch between OpenAI, Anthropic, Ollama local models, or your own endpoint in one click.' },
      { shot: 'Execution trace, per-node token usage and latency breakdown',      file: 'ai-workflows-trace',     caption: 'Full observability, every run shows per-node token usage, latency, and the exact prompt sent so you can tune fast.' },
    ],
    shotsGrid: 'shots-grid-2',
    captionLabel: (i) => `Step ${i + 1}`,
    cmd: 'npx habits@latest base',
    stores: null,
    cta: { href: '/recipes/ai-workflows', text: 'AI workflows guide →' },
  },
]

// Lightbox state
const lightbox = ref({ open: false, shots: [], index: 0 })

function openLightbox(shots, index) {
  lightbox.value = { open: true, shots, index }
  document.body.style.overflow = 'hidden'
}
function closeLightbox() {
  lightbox.value.open = false
  document.body.style.overflow = ''
}
function lbNext() {
  lightbox.value.index = (lightbox.value.index + 1) % lightbox.value.shots.length
}
function lbPrev() {
  lightbox.value.index = (lightbox.value.index - 1 + lightbox.value.shots.length) % lightbox.value.shots.length
}
function onKeydown(e) {
  if (!lightbox.value.open) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowRight') lbNext()
  if (e.key === 'ArrowLeft') lbPrev()
}
</script>

<template>
<div>
  <section ref="sectionRef" class="v11-wrap" :class="{ 'is-visible': isVisible }">
    <div class="v11-header">
      <h2>Get <span class="h2-accent">started</span></h2>
      <p>Pick the description that fits and we'll show you exactly where to begin.</p>
    </div>

    <div class="v11-layout">
      <!-- Left rail: long questions -->
      <nav class="v11-rail">
        <button
          v-for="p in personas"
          :key="p.id"
          class="rail-item"
          :class="{ active: currentPersonaId === p.id, 'rail-extra': p.extra }"
          :style="{ '--c': p.color }"
          @click="currentPersonaId = p.id"
        >
          <span class="ri-dot" :style="{ background: p.color }"></span>
          <span class="ri-icon" v-html="icon(p.icon)"></span>
          <span class="ri-text">
            <span class="ri-subject" :style="{ color: p.color }">{{ p.subject }}</span>
            <span class="ri-question">{{ p.question }}</span>
          </span>
          <span class="ri-arrow" v-html="icon('chevron-right')"></span>
        </button>
      </nav>

      <!-- Right content -->
      <div class="v11-content">

        <template v-for="p in [personas.find(q => q.id === currentPersonaId)]">
        <transition name="swap" mode="out-in">
          <div :key="currentPersonaId" class="content-block" :style="{ '--c': p.color }">
            <div class="cb-badge">{{ p.badge }}</div>
            <h3>{{ p.title }}</h3>
            <p v-html="p.description"></p>

            <div v-if="p.steps" class="steps-list">
              <div v-for="s in p.steps" :key="s.n" class="step-row">
                <span class="step-n">{{ s.n }}</span>
                <div class="step-body">
                  <strong>{{ s.title }}</strong>
                  <p>{{ s.desc }}</p>
                  <code v-if="s.cmd">$ {{ s.cmd }}</code>
                </div>
              </div>
            </div>

            <div class="shots-grid" :class="p.shotsGrid">
              <button v-for="(s, i) in p.shots" :key="i" class="shot-card" :class="s.code || s.embed ? 'shot-static' : 'shot-clickable'" type="button" @click="!s.code && !s.embed && openLightbox(p.shots, i)">
                <div v-if="s.code" class="code-card">
                  <div class="cc-titlebar">
                    <span class="cc-dot cc-r"></span><span class="cc-dot cc-y"></span><span class="cc-dot cc-g"></span>
                    <span class="cc-filename">{{ s.code.title }}</span>
                  </div>
                  <pre class="cc-code"><span v-for="(line, li) in s.code.text.split('\n')" :key="li" class="cc-line" :class="{ 'cc-hl': s.code.highlight.includes(li + 1) }" v-html="tokenize(line, s.code.lang)"></span></pre>
                </div>
                <img v-else-if="s.embed" :src="withBase(s.embed)" :alt="s.shot" class="shot-img" />
                <img v-else :src="withBase('/images/get-started/' + s.file + '.webp')" :alt="s.shot" class="shot-img" :style="s.imgStyle" />
                <div class="shot-caption">
                  <span class="caption-step">{{ p.captionLabel(i) }}</span>
                  <span class="caption-text">{{ s.caption }}</span>
                  <span class="caption-expand" v-html="icon('maximize-2')"></span>
                </div>
              </button>
            </div>

            <div v-if="p.stores" class="cb-stores">
              <a v-for="store in p.stores" :key="store.text" :href="store.href" class="store-pill">
                <span v-html="icon(store.icon)"></span> {{ store.text }}
              </a>
            </div>

            <pre v-if="p.cmd" class="cb-cmd">{{ p.cmd }}</pre>
            <a :href="withBase(p.cta.href)" class="cb-cta">{{ p.cta.text }}</a>
          </div>
        </transition>
        </template>

      </div>
    </div>
  </section>

  <!-- Lightbox -->
  <Teleport to="body">
    <div v-if="lightbox.open" class="lb-overlay" @click.self="closeLightbox" role="dialog" aria-modal="true">
      <button class="lb-close" type="button" @click="closeLightbox" aria-label="Close" v-html="icon('x')"></button>

      <div class="lb-body">
        <template v-if="lightbox.shots[lightbox.index].code">
          <div class="code-card" style="width:100%;max-width:860px;">
            <div class="cc-titlebar">
              <span class="cc-dot cc-r"></span><span class="cc-dot cc-y"></span><span class="cc-dot cc-g"></span>
              <span class="cc-filename">{{ lightbox.shots[lightbox.index].code.title }}</span>
            </div>
            <pre class="cc-code"><span v-for="(line, li) in lightbox.shots[lightbox.index].code.text.split('\n')" :key="li" class="cc-line" :class="{ 'cc-hl': lightbox.shots[lightbox.index].code.highlight.includes(li + 1) }" v-html="tokenize(line, lightbox.shots[lightbox.index].code.lang)"></span></pre>
          </div>
        </template>
        <img v-else
          :src="withBase('/images/get-started/' + lightbox.shots[lightbox.index].file + '.webp')"
          :alt="lightbox.shots[lightbox.index].shot"
          class="lb-img"
        />
        <div class="lb-info">
          <div class="lb-meta">
            <span class="lb-step-badge">Step {{ lightbox.index + 1 }} of {{ lightbox.shots.length }}</span>
          </div>
          <p class="lb-caption">{{ lightbox.shots[lightbox.index].caption }}</p>
          <div class="lb-dots">
            <button
              v-for="(s, i) in lightbox.shots"
              :key="i"
              class="lb-dot"
              :class="{ active: i === lightbox.index }"
              type="button"
              :aria-label="'Go to step ' + (i + 1)"
              @click="lightbox.index = i"
            ></button>
          </div>
        </div>
      </div>

      <button class="lb-nav lb-prev" type="button" @click="lbPrev" aria-label="Previous" v-html="icon('chevron-left')"></button>
      <button class="lb-nav lb-next" type="button" @click="lbNext" aria-label="Next" v-html="icon('chevron-right')"></button>
    </div>
  </Teleport>
</div>
</template>

<style scoped>
.v11-wrap {
  padding: 96px 24px;
  background: transparent;
}

.v11-header {
  text-align: center;
  max-width: 560px;
  margin: 0 auto 52px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.v11-wrap.is-visible .v11-header { opacity: 1; transform: translateY(0); }
.v11-header h2 {
  font-size: clamp(1.9rem, 3.5vw, 2.6rem);
  font-weight: 800;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
  margin: 0 0 10px;
}
.h2-accent {
  background: var(--home-brand-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.v11-header p { color: var(--vp-c-text-2); font-size: 1rem; margin: 0; }

/* Layout */
.v11-layout {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: var(--home-section-max-w); 
  margin: 0 auto;
  align-items: stretch;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s 0.15s ease, transform 0.6s 0.15s ease;
}
.v11-wrap.is-visible .v11-layout { opacity: 1; transform: translateY(0); }

/* Rail, icon card grid */
.v11-rail {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  width: 100%;
}

.rail-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--home-radius-md);
  border: 1px solid var(--home-border-glass);
  background: var(--home-surface-glass);
  -webkit-backdrop-filter: blur(var(--home-blur));
  backdrop-filter: blur(var(--home-blur));
  cursor: pointer;
  text-align: left;
  transition: background 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  color: var(--home-text-soft);
}
.rail-item:hover {
  background: var(--home-surface-glass-strong);
  color: var(--vp-c-text-1);
  transform: translateY(-3px);
  box-shadow: var(--home-shadow-1);
}
.rail-item.active {
  background: color-mix(in srgb, var(--c) 12%, var(--home-surface-glass));
  border-color: color-mix(in srgb, var(--c) 55%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 22%, transparent), var(--home-shadow-2);
  color: var(--vp-c-text-1);
  transform: translateY(-3px);
}

.ri-dot { display: none; }
.ri-arrow { display: none; }

.ri-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.ri-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--home-radius-md);
  background: color-mix(in srgb, var(--c) 15%, var(--home-surface-glass));
  flex-shrink: 0;
  transition: background 0.2s;
}
.rail-item.active .ri-icon {
  background: color-mix(in srgb, var(--c) 22%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c) 40%, transparent);
}
.ri-icon :deep(svg) { width: 16px; height: 16px; stroke: var(--c); fill: none; stroke-width: 2; flex-shrink: 0; }

.ri-subject {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: inherit;
  line-height: 1.3;
}

.ri-question {
  font-size: 0.68rem;
  line-height: 1.45;
  font-weight: 400;
  color: var(--home-text-faint);
  white-space: normal;
}
.rail-item.active .ri-question { color: var(--home-text-soft); }
.rail-extra { display: none; }

/* Content panel */
.v11-content {
  flex: 1;
  min-width: 0;
  position: relative;
}

.swap-enter-active { transition: opacity 0.0s ease, transform 0.0s ease; }
.swap-leave-active { transition: opacity 0.00s ease; position: absolute; width: 100%; }
.swap-enter-from   { opacity: 0; transform: translateX(8px); }
.swap-leave-to     { opacity: 0; }

.content-block {
  background: var(--home-surface-glass);
  -webkit-backdrop-filter: blur(var(--home-blur));
  backdrop-filter: blur(var(--home-blur));
  border: 1px solid color-mix(in srgb, var(--c) 22%, var(--home-border-glass));
  border-radius: var(--home-radius-lg);
  padding: 32px;
}

.cb-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 100px;
  background: color-mix(in srgb, var(--c) 15%, transparent);
  color: var(--c);
  margin-bottom: 14px;
}

.content-block h3 {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--vp-c-text-1);
  margin: 0 0 10px;
  letter-spacing: -0.015em;
}
.content-block > p {
  font-size: 0.875rem;
  color: var(--home-text-soft);
  margin: 0 0 24px;
  line-height: 1.75;
}
.content-block code {
  background: var(--home-code-bg);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--home-code-fg);
}

/* Screenshots grid */
.shots-grid {
  display: grid;
  gap: 10px;
  margin-bottom: 24px;
}
.shots-grid-2 { grid-template-columns: repeat(2, 1fr); }
.shots-grid-4 { grid-template-columns: repeat(4, 1fr); }

.shot-card { border-radius: 10px; overflow: hidden; }

/* Code card (YAML viewer replacing first enterprise shot) */
.code-card {
  background: #0a0e1a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 16/9;
  display: flex;
  flex-direction: column;
}
.cc-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #131b2c;
  border-bottom: 1px solid #1e2d40;
  flex-shrink: 0;
}
.cc-dot { width: 10px; height: 10px; border-radius: 50%; }
.cc-r { background: #ef4444; }
.cc-y { background: #f59e0b; }
.cc-g { background: #22c55e; }
.cc-filename {
  margin-left: 10px;
  font-size: 0.72rem;
  color: #94a3b8;
  font-family: 'Monaco', 'Menlo', monospace;
  font-weight: 600;
}
.cc-code {
  margin: 0;
  padding: 14px 16px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.7rem;
  background: #0d1117;
  color: #cbd5e1;
  line-height: 1.6;
  overflow-x: hidden;
  overflow-y: auto;
  max-height: 260px;
  white-space: pre;
  flex: 1;
  min-height: 0;
}
.cc-line    { display: block; padding: 0 2px; min-height: 1.6em; }
.cc-hl {
  background: rgba(139, 92, 246, 0.15);
  border-left: 3px solid #8b5cf6;
  margin-left: -16px;
  padding-left: 13px;
  margin-right: -16px;
  padding-right: 16px;
}
:deep(.cc-comment) { color: #6e7c90; font-style: italic; }
:deep(.cc-key)     { color: #93c5fd; }
:deep(.cc-keyword) { color: #c4b5fd; }
:deep(.cc-string)  { color: #7ec8a0; }
:deep(.cc-plain)   { color: #cbd5e1; }
.lb-code-card {
  display: none;
}
.lb-cc-code {
  display: none;
}

.shot-img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  background: #0a0a14;
  border-radius: 10px;
  display: block;
}
.shot-placeholder {
  aspect-ratio: 16/9;
  background: var(--home-surface-glass);
  border: 1px dashed var(--home-border-strong);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--home-text-faint);
}
.shot-icon { display: flex; }
.shot-icon :deep(svg) { width: 20px; height: 20px; stroke: currentColor; fill: none; }
.shot-label { font-size: 0.65rem; text-align: center; padding: 0 10px; line-height: 1.4; }

/* Steps list */
.steps-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
.step-row {
  display: flex;
  gap: 10px;
  align-items: center;
  background: var(--home-step-bg);
  border: 1px solid var(--home-border-glass);
  border-radius: 8px;
  padding: 9px 12px;
}
.step-n {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--c) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
  color: var(--c);
  font-size: 0.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-body { flex: 1; }
.step-body strong { display: inline-block; font-size: 0.78rem; color: var(--vp-c-text-1); margin-bottom: 1px; }

.step-body p { display: inline-block; font-size: 0.72rem; color: var(--home-text-soft); margin: 3px 9px 3px; line-height: 1.45; }

.step-body code { font-size: 0.7rem; background: var(--home-code-bg); padding: 1px 6px; border-radius: 4px; color: var(--home-code-fg); }

/* Command block */
.cb-cmd {
  font-family: var(--home-font-mono);
  font-size: 0.82rem;
  background: var(--home-code-bg);
  border: 1px solid var(--home-border-glass);
  border-radius: 10px;
  padding: 14px 18px;
  color: var(--home-code-fg);
  margin: 0 0 24px;
  white-space: pre;
  line-height: 1.7;
}

/* CTA */
.cb-cta {
  display: inline-flex;
  padding: 9px 22px;
  background: color-mix(in srgb, var(--c) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
  border-radius: 100px;
  color: var(--vp-c-text-1);
  font-size: 0.83rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s;
}
.cb-cta:hover { background: color-mix(in srgb, var(--c) 20%, transparent); }

/* Stores */
.cb-stores { display: flex; gap: 10px; flex-wrap: wrap; }
.cb-stores + .cb-cta { margin-top: 16px; }
.store-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  background: var(--home-surface-glass);
  border: 1px solid var(--home-border-glass);
  border-radius: 10px;
  color: var(--home-text-soft);
  font-size: 0.83rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s;
}
.store-pill:hover { background: var(--home-surface-glass-strong); }
.store-pill :deep(svg) { width: 15px; height: 15px; fill: none; stroke: currentColor; }

/* Shot captions */
.shot-clickable, .shot-static {
  position: relative;
  display: block;
  padding: 0;
  margin: 0;
  background: none;
  border: none;
  text-align: left;
  border-radius: 10px;
  overflow: hidden;
}
.shot-clickable { cursor: zoom-in; }
.shot-static    { cursor: default; }
.shot-clickable:focus-visible {
  outline: 2px solid var(--c, #8b5cf6);
  outline-offset: 2px;
}
.shot-static .caption-expand { display: none; }

.shot-caption {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 12px 10px;
  background: rgba(0, 0, 0, 0.55);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  border-top: 1px solid rgba(255,255,255,0.06);
}
.caption-step {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--c, #8b5cf6);
  margin-top: 1px;
}
.caption-text {
  flex: 1;
  font-size: 0.72rem;
  line-height: 1.5;
  color: rgba(255,255,255,0.78);
}
.caption-expand {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  opacity: 0.4;
  transition: opacity 0.2s;
}
.shot-clickable:hover .caption-expand { opacity: 0.9; }
.caption-expand :deep(svg) { width: 13px; height: 13px; fill: none; stroke: #fff; }

/* Lightbox */
.lb-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: lb-fade-in 0.2s ease;
}
@keyframes lb-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.lb-close {
  position: absolute;
  top: 18px;
  right: 20px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  z-index: 10;
}
.lb-close:hover { background: rgba(255,255,255,0.16); }
.lb-close :deep(svg) { width: 18px; height: 18px; fill: none; stroke: #fff; stroke-width: 2; }

.lb-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: min(900px, 100%);
  width: 100%;
  animation: lb-slide-in 0.25s cubic-bezier(0.16,1,0.3,1);
}
@keyframes lb-slide-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.lb-img {
  width: 100%;
  max-height: 62vh;
  object-fit: contain;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  display: block;
}

.lb-info {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.lb-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lb-step-badge {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}
.lb-caption {
  font-size: 0.92rem;
  color: rgba(255,255,255,0.82);
  line-height: 1.65;
  margin: 0;
  max-width: 640px;
}
.lb-dots {
  display: flex;
  gap: 7px;
  margin-top: 4px;
}
.lb-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.22);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, transform 0.2s;
}
.lb-dot.active {
  background: #fff;
  transform: scale(1.25);
}

.lb-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.lb-nav:hover { background: rgba(255,255,255,0.18); }
.lb-nav :deep(svg) { width: 20px; height: 20px; fill: none; stroke: #fff; stroke-width: 2; }
.lb-prev { left: 14px; }
.lb-next { right: 14px; }

/* Mobile responsive */
@media (max-width: 720px) {
  .v11-rail { grid-template-columns: repeat(2, 1fr); }
  .shots-grid-2 { grid-template-columns: 1fr; }
  .shots-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .lb-nav { display: none; }
  .lb-img { max-height: 50vh; }
}
</style>
