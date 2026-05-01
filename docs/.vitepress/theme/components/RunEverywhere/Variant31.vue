<script setup>
// v31, Typewriter morph + scroll-driven, same as v22.
// Bottom bar: scrollable filmstrip of scaled visual thumbnails with stage names.
// On desktop all 9 thumbs fit; bar auto-centers on the active one.
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import StageVisual from './_StageVisual.vue'

const stages = [
  { verb: 'Create',  noun: 'your habit',  suffix: '',                       name: 'Visual Builder', kind: 'base',         segment: 'Create your habit,' },
  // { verb: 'Code',    noun: 'your habit',  suffix: '',                       name: 'YAML Code',      kind: 'yaml',         segment: ' or code it,' },
  { verb: 'Run',     noun: 'your habit',  suffix: ' on PC / Mac',           name: 'Desktop App',    kind: 'desktop-app',  segment: ' run it on PC/Mac,' },
  { verb: 'Run',     noun: 'your habit',  suffix: ' on Android / iOS',      name: 'Mobile App',     kind: 'mobile-app',   segment: ' or Android/iOS,' },
  { verb: 'Run',     noun: 'your habit',  suffix: ' in Docker',             name: 'Docker',         kind: 'docker',       segment: ' host it on Docker,' },
  { verb: 'Run',     noun: 'your habit',  suffix: ' as a server',           name: 'Server CLI',     kind: 'server',       segment: 'run on your server,' },
  { verb: 'Monitor', noun: 'your habit',  suffix: '',                       name: 'Monitoring',     kind: 'monitoring',   segment: '  monitor the habits,' },
  { verb: 'Link',    noun: 'your habits', suffix: ' to company subdomains', name: 'Admin DNS',      kind: 'admin-single', segment: ' link to your company subdomains.' },
  { verb: 'Admin',   noun: 'your habits', suffix: '',                       name: 'Admin Panel',    kind: 'admin-list',   segment: ' all in a single panel' }
]

const wrap = ref(null)
const filmstrip = ref(null)
// Plain array (not reactive), we just need DOM refs, not observed values
const thumbRefs = []

const idx = ref(0)
const progress = ref(0)

// Current segment split into chars for staggered animation
const newSegChars = computed(() => stages[idx.value].segment.split(''))

const verbText = ref(stages[0].verb)
const nounText = ref(stages[0].noun)
const suffixText = ref(stages[0].suffix)

function onScroll() {
  if (!wrap.value) return
  const r = wrap.value.getBoundingClientRect()
  const total = wrap.value.offsetHeight - window.innerHeight
  progress.value = Math.max(0, Math.min(1, -r.top / Math.max(total, 1)))
  idx.value = Math.min(stages.length - 1, Math.max(0, Math.floor(progress.value * stages.length - 0.001)))
}

function jumpTo(i) {
  if (!wrap.value) return
  const total = wrap.value.offsetHeight - window.innerHeight
  window.scrollTo({ top: wrap.value.offsetTop + (i + 0.5) / stages.length * total, behavior: 'smooth' })
}

function centerThumb(i) {
  const bar = filmstrip.value
  const el = thumbRefs[i]
  if (!bar || !el) return
  const barCenter = bar.offsetWidth / 2
  const thumbCenter = el.offsetLeft + el.offsetWidth / 2
  bar.scrollTo({ left: thumbCenter - barCenter, behavior: 'smooth' })
}

let timers = []
function clearTimers() { timers.forEach(clearTimeout); timers = [] }

function typewrite(currentRef, target, delay = 0) {
  return new Promise((resolve) => {
    const startVal = currentRef.value
    let common = 0
    while (common < startVal.length && common < target.length && startVal[common] === target[common]) common++
    let i = startVal.length
    function back() {
      if (i <= common) { fwd(); return }
      currentRef.value = startVal.slice(0, --i)
      timers.push(setTimeout(back, 22))
    }
    function fwd() {
      if (i >= target.length) { resolve(); return }
      currentRef.value = target.slice(0, ++i)
      timers.push(setTimeout(fwd, 38))
    }
    timers.push(setTimeout(back, delay))
  })
}

watch(idx, async (v) => {
  clearTimers()
  centerThumb(v)
  const s = stages[v]
  await typewrite(verbText, s.verb)
  await typewrite(nounText, s.noun, 60)
  await typewrite(suffixText, s.suffix, 60)
})

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  nextTick(() => centerThumb(0))
})
onBeforeUnmount(() => { window.removeEventListener('scroll', onScroll); clearTimers() })
</script>

<template>
  <section
    ref="wrap"
    class="run-section v31"
    :style="{ minHeight: (stages.length * 100) + 'vh', position: 'relative' }"
  >
    <!-- Sentinel for scroll-spine: activates "Start" node when Docker stage is reached (stage index 4 of 9) -->
    <div id="get-started-section" style="position:absolute;top:44.44%;left:0;width:0;height:0;pointer-events:none;"></div>
    <div class="sticky">
      <div class="section-header">
        <h2 class="section-title">Run <span class="section-gradient">Everywhere</span></h2>
        <p class="section-subtitle" style="display: none;">Create your habit, or code it, run it on PC/Mac, or Android/iOS, host it on Docker, run on your server, monitor the habits, link to your company subdomains. all in a single panel</p>
      </div>

      <div class="grid">
        <div class="text-col">
          <p class="step">// option {{ String(idx + 1).padStart(2, '0') }} of {{ String(stages.length).padStart(2, '0') }}</p>
          <p class="run-on">
            <template v-for="(s, i) in stages" :key="i">
              <span v-if="i < idx && s.segment" :class="`run-on-seg run-on-seg--${s.kind}`">{{ s.segment }} </span>
              <span v-else-if="i === idx && s.segment" :class="`run-on-current run-on-current--${s.kind}`"><span
                  v-for="(ch, ci) in newSegChars" :key="ci"
                  class="run-on-char"
                  :style="{ animationDelay: ci * 0.035 + 's' }"
                >{{ ch }}</span><span class="run-on-char" :style="{ animationDelay: newSegChars.length * 0.035 + 's' }"> </span></span>
            </template>
          </p>
        </div>
        <div class="img-col">
          <h2 class="sentence">
            <span class="verb">{{ verbText }}</span>
            <span class="anchor"> {{ nounText }}</span>
            <span class="suffix">{{ suffixText }}</span><span class="caret-after">▌</span>
          </h2>
          <div class="bracket-frame">
            <span class="frame-corner tl"></span><span class="frame-corner tr"></span>
            <span class="frame-corner bl"></span><span class="frame-corner br"></span>
            <transition name="img" mode="out-in">
              <StageVisual :key="idx" :kind="stages[idx].kind" />
            </transition>
          </div>
        </div>
      </div>

      <!-- Filmstrip bar with scaled image thumbnails -->
      <div class="filmstrip-wrap">
        <div class="filmstrip" ref="filmstrip">
          <button
            v-for="(s, i) in stages"
            :key="i"
            :ref="el => { if (el) thumbRefs[i] = el }"
            :class="['thumb', { active: idx === i, done: i < idx }]"
            @click="jumpTo(i)"
          >
            <div class="thumb-frame">
              <div class="thumb-inner">
                <StageVisual :kind="s.kind" />
              </div>
            </div>
            <span class="thumb-name">{{ s.name }}</span>
          </button>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: (progress * 100) + '%' }"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.run-section { position: relative; padding: 0; }

.sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex; flex-direction: column;
  padding: 20px 24px 18px;
  max-width: var(--home-section-max-w); margin: 0 auto;
  font-family: system-ui, sans-serif;
  overflow: hidden;
}

/* Section header, mirrors Build Anything style */
.section-header {
  text-align: center;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.section-title {
  font-size: clamp(1.8rem, 3.5vw, 3rem);
  font-weight: 800;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  line-height: 1.1;
}

.section-gradient {
  background: var(--home-brand-gradient);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: sectionGradientShift 4s ease infinite;
}

@keyframes sectionGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.section-subtitle {
  color: var(--vp-c-text-2);
  font-size: clamp(0.85rem, 1.2vw, 1rem);
  margin: 0 0 4px;
  opacity: 0.9;
}

.sentence {
  font-family: system-ui, sans-serif;
  font-size: clamp(1.2rem, 2.2vw, 1.9rem);
  font-weight: 800;
  margin: 0;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
  min-height: 1.4em;
  flex-shrink: 0;
  text-align: center;
}
.verb {
  background: var(--home-brand-gradient-2);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.suffix { color: var(--vp-c-text-3); font-weight: 600; }
.anchor { color: var(--vp-c-text-1); padding-left: 9px; }
.caret-after {
  display: inline-block;
  color: var(--home-brand-1);
  animation: blink 0.85s steps(2, start) infinite;
  margin-left: 2px;
}
@keyframes blink { 50% { opacity: 0; } }

.grid {
  display: grid; grid-template-columns: 0.65fr 1.6fr; gap: 32px;
  flex: 1; min-height: 0; align-items: center;
}

.text-col { color: var(--vp-c-text-2); }
.step {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin: 0 0 10px;
  font-family: var(--vp-font-family-mono, 'Monaco', monospace);
  letter-spacing: 0.05em;
}

.run-on {
  font-family: system-ui, sans-serif;
  font-size: clamp(0.95rem, 1.4vw, 1.15rem);
  line-height: 1.7;
  color: var(--vp-c-text-3);
  margin: 0;
}
.run-on-seg { color: var(--vp-c-text-2); }
.run-on-current, .run-on-seg { padding-left: 2px; }
.run-on-char {
  display: inline;
  color: var(--home-brand-1);
  font-weight: 700;
  opacity: 0;
  animation: char-stamp 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes char-stamp {
  0%   { opacity: 0;   transform: translateY(-6px) scale(1.4); filter: blur(4px);  color: var(--vp-c-text-1); text-shadow: 0 0 12px var(--home-brand-1), 0 0 28px var(--home-brand-2); }
  50%  { opacity: 1;   transform: translateY(2px)  scale(0.92); filter: blur(0);    color: color-mix(in srgb, var(--home-brand-1) 60%, var(--home-brand-2));  text-shadow: 0 0 8px var(--home-brand-1); }
  100% { opacity: 1;   transform: translateY(0)    scale(1);    filter: blur(0);    color: var(--home-brand-1); text-shadow: none; }
}

.img-col { display: flex; flex-direction: column; align-items: stretch; justify-content: center; min-height: 0; position: relative; gap: 8px; }

.bracket-frame {
  position: relative;
  padding: 18px;
  width: 100%;
  display: flex; align-items: center; justify-content: center;
}
.frame-corner {
  position: absolute;
  width: 24px; height: 24px;
  border: 2px solid var(--home-brand-1);
}
.frame-corner.tl { top: 0; left: 0; border-right: none; border-bottom: none; }
.frame-corner.tr { top: 0; right: 0; border-left: none; border-bottom: none; }
.frame-corner.bl { bottom: 0; left: 0; border-right: none; border-top: none; }
.frame-corner.br { bottom: 0; right: 0; border-left: none; border-top: none; }

.img-enter-from { opacity: 0; transform: scale(0.94); filter: blur(8px); }
.img-leave-to   { opacity: 0; transform: scale(0.94); filter: blur(8px); }
.img-enter-active, .img-leave-active { transition: all 0.4s ease; }

/* ─── Filmstrip ─── */
.filmstrip-wrap {
  flex-shrink: 0;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 10px;
}

.filmstrip {
  display: flex;
  gap: 0;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 6px;
}
.filmstrip::-webkit-scrollbar { display: none; }

/* On large screens spread evenly, all 9 fit without scrolling */
@media (min-width: 880px) {
  .filmstrip { justify-content: space-between; }
}

.thumb {
  flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  background: transparent; border: none;
  cursor: pointer; padding: 0;
  transition: transform 0.2s ease;
}
.thumb:hover { transform: translateY(-2px); }

/* Clip window for the scaled visual */
.thumb-frame {
  width: 110px;
  height: 70px;
  border-radius: 0;
  overflow: hidden;
  border: none;
  position: relative;
  transition: box-shadow 0.25s ease;
  background: var(--vp-c-bg-soft);
}

/* The StageVisual fills its container at natural size (~480×305px).
   Scale to fit 110×70px frame: 110/480 ≈ 0.2292, 70/305 ≈ 0.2295 */
.thumb-inner {
  position: absolute;
  top: 0; left: 0;
  width: 480px;
  height: 305px;
  transform: scale(0.2292);
  transform-origin: top left;
  pointer-events: none;
}

.thumb-name {
  font-family: system-ui, sans-serif;
  font-size: 0.58rem;
  color: var(--vp-c-text-3);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color 0.25s ease;
  display: none;
}

.thumb.done .thumb-frame {
  opacity: 0.7;
}
.thumb.active .thumb-frame {

}
.thumb.active { transform: translateY(-3px); }
.thumb.active .thumb-name { color: var(--home-brand-1); display: none; }

/* Progress line under the filmstrip */
.progress-track {
  height: 2px;
  background: var(--vp-c-divider);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 8px;
}
.progress-fill {
  height: 100%;
  background: var(--home-brand-gradient-2);
  box-shadow: 0 0 6px color-mix(in srgb, var(--home-brand-1) 60%, transparent);
  transition: width 0.1s linear;
}

/* ─── Mobile ─── */
@media (max-width: 879px) {
  .sticky { padding: 18px 16px 14px; }
  .grid { grid-template-columns: 1fr; gap: 12px; }
  .section-title { font-size: 1.8rem; }
  .thumb-frame { width: 88px; height: 56px; border: none; }
  /* 88/480 ≈ 0.1833; 56/305 ≈ 0.1836 */
  .thumb-inner { width: 480px; height: 305px; transform: scale(0.1833); }
}
</style>
