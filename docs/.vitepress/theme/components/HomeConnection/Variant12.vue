<!-- V12: CI/CD Pipeline Spine
     Each section = a pipeline stage (like GitHub Actions / GitLab CI).
     Stages show: ○ pending → ◉ running (spinner) → ✓ passed
     The track between stages fills like a job queue draining.
     Completed stages stack up from top, giving a satisfying "pipeline finished" read. -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const active = ref(-1)
const sectionIds = ['build-anything-section', 'run-everywhere-section', 'get-started-section', 'explore-section', 'showcase-section', 'bits-section', 'pricing-section']
const stages = [
  { label: 'what',       color: '#94a3b8' },
  { label: 'how',         color: '#7dd3fc' },
  { label: 'get started', color: '#6ee7b7' },
  { label: 'explore',     color: '#a5b4fc' },
  { label: 'showcase',    color: '#93c5fd' },
  { label: 'bits',        color: '#c4b5fd' },
  { label: 'go',          color: '#f0f9ff' },
]
const NODE_TOP = [7, 21, 35, 49, 63, 77, 91]
let runner = null

// Simulate a "running" spinner on the currently active node
const running = ref(-1)

function onEnter(i) {
  running.value = i
  clearTimeout(runner)
  runner = setTimeout(() => { running.value = -1 }, 1200)
  active.value = i
}

function onScroll() {
  const mid = window.scrollY + window.innerHeight * 0.4
  let found = -1
  sectionIds.forEach((id, i) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    if (mid >= top) found = i
  })
  if (found !== active.value) onEnter(found)
}

function scrollToSection(i) {
  const el = document.getElementById(sectionIds[i])
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  clearTimeout(runner)
})
</script>

<template>
  <Teleport to="body">
    <div class="hc12-wrap">
      <div class="hc12-track">

        <!-- Connecting dashes between stages -->
        <div
          v-for="i in [0, 1, 2, 3, 4, 5]"
          :key="'dash-' + i"
          class="hc12-dash"
          :class="{ done: active > i }"
          :style="{
            '--c1': stages[i].color,
            '--c2': stages[i + 1].color,
            top: NODE_TOP[i] + '%',
            height: (NODE_TOP[i + 1] - NODE_TOP[i]) + '%',
          }"
        ></div>

        <!-- Stage nodes -->
        <div
          v-for="(stage, i) in stages"
          :key="i"
          class="hc12-node"
          :class="{
            pending:  active < i,
            running:  running === i,
            passed:   active > i,
            current:  active === i && running !== i,
          }"
          :style="{ '--c': stage.color, top: NODE_TOP[i] + '%' }"
          @click="scrollToSection(i)"
        >
          <!-- Status icon -->
          <div class="hc12-icon-wrap">
            <svg v-if="running === i" class="hc12-spinner" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="7" fill="none" stroke="var(--c)" stroke-width="2" stroke-dasharray="30 14" />
            </svg>
            <span v-else-if="active > i" class="hc12-check">✓</span>
            <span v-else class="hc12-pending-dot"></span>
          </div>

          <!-- Label pill -->
          <div class="hc12-pill">{{ stage.label }}</div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.hc12-wrap {
  position: fixed;
  left: 14px;
  top: 0;
  height: 100dvh;
  z-index: 60;
  display: flex;
  align-items: center;
}
.hc12-track {
  position: relative;
  width: 14px;
  height: 58vh;
  overflow: visible;
}

/* Dash segments */
.hc12-dash {
  position: absolute;
  left: 6px;
  width: 2px;
  background: var(--home-track);
  transform: translateY(7px);
  transition: background 0.6s;
}
.hc12-dash.done {
  background: linear-gradient(to bottom, var(--c1), var(--c2));
}

/* Node */
.hc12-node {
  position: absolute;
  left: 0;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 6px 4px 0;
}
.hc12-node:hover .hc12-pending-dot {
  border-color: color-mix(in srgb, var(--c) 70%, var(--home-text-soft));
  background: color-mix(in srgb, var(--c) 15%, transparent);
}
.hc12-node:hover .hc12-pill {
  color: color-mix(in srgb, var(--c) 80%, var(--home-text-soft));
}

/* Icon area */
.hc12-icon-wrap {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hc12-spinner {
  width: 14px;
  height: 14px;
  animation: hc12-spin 0.9s linear infinite;
}
@keyframes hc12-spin { to { transform: rotate(360deg); } }

.hc12-check {
  font-size: 0.55rem;
  font-weight: 900;
  color: var(--c);
  line-height: 1;
  text-shadow: 0 0 6px var(--c);
}
.hc12-pending-dot {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.5px solid var(--home-border-strong);
  transition: border-color 0.2s, background 0.2s;
}
.hc12-node.current .hc12-pending-dot {
  border-color: var(--c);
  box-shadow: 0 0 6px var(--c);
  background: color-mix(in srgb, var(--c) 30%, transparent);
}

/* Label pill */
.hc12-pill {
  font-size: 0.42rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: var(--home-font-body);
  color: var(--home-text-faint);
  white-space: nowrap;
  transition: color 0.4s;
}
.hc12-node.passed .hc12-pill,
.hc12-node.current .hc12-pill,
.hc12-node.running .hc12-pill {
  color: var(--c);
}

@media (max-width: 1400px) { .hc12-wrap { display: none; } }
</style>
