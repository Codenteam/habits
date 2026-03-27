<script setup>
import HabitFlowSection1 from './HabitFlowSection1.vue'
import HabitFlowSection2 from './HabitFlowSection2.vue'
import HabitFlowSection3 from './HabitFlowSection3.vue'
import HabitFlowSection4 from './HabitFlowSection4.vue'
import HabitFlowSection5 from './HabitFlowSection5.vue'
import HabitFlowSection6 from './HabitFlowSection6.vue'
import HabitFlowSection7 from './HabitFlowSection7.vue'
import HabitFlowSection8 from './HabitFlowSection8.vue'
import HabitFlowSection9 from './HabitFlowSection9.vue'
import HabitFlowSection10 from './HabitFlowSection10.vue'

const sections = [
  { id: 1, name: 'Vertical Stages', desc: 'Step-by-step stages with numbered sections, code preview, mock UI, outputs grid', component: HabitFlowSection1 },
  { id: 2, name: 'Horizontal Timeline', desc: 'Progress bar, panel switching on scroll, nodes/AI/habit/deploy phases', component: HabitFlowSection2 },
  { id: 3, name: 'Orbiting Sun', desc: 'Central .habit with orbiting outputs, animated platform scroll strip', component: HabitFlowSection3 },
  { id: 4, name: 'Stacking Cards', desc: 'Expandable cards that reveal content on scroll, clean stack effect', component: HabitFlowSection4 },
  { id: 5, name: 'Conveyor Belt', desc: 'Animated belt with moving items, machine stages, industrial feel', component: HabitFlowSection5 },
  { id: 6, name: 'Growing Tree', desc: 'Roots→trunk→branches metaphor, particles, organic growth animation', component: HabitFlowSection6 },
  { id: 7, name: '3D Layers', desc: 'Perspective layers, depth effect, connecting beams', component: HabitFlowSection7 },
  { id: 8, name: 'Matrix Style', desc: 'Dark theme, code rain background, terminal aesthetic', component: HabitFlowSection8 },
  { id: 9, name: 'Particle Morph', desc: 'Particles that scatter→gather→form .habit, phase transitions', component: HabitFlowSection9 },
  { id: 10, name: 'Clean Infographic', desc: 'Stats, workflow steps, equation card, comprehensive overview', component: HabitFlowSection10 },
]
</script>

<template>
  <div class="review-page">


    <!-- Sections -->
    <div v-for="s in sections" :key="s.id" class="section-wrapper" :id="`section-${s.id}`">
      <div class="section-header-bar">
        <div class="section-number">{{ s.id }}</div>
        <div class="section-meta">
          <h2>{{ s.name }}</h2>
          <p>{{ s.desc }}</p>
        </div>
        <div class="section-file">HabitFlowSection{{ s.id }}.vue</div>
      </div>
      
      <div class="section-content">
        <component :is="s.component" />
      </div>
      
      <div class="section-divider">
        <span>End of Section {{ s.id }} — {{ s.name }}</span>
      </div>
    </div>

    <!-- Back to top -->
    <a href="#" class="back-to-top">↑ Back to Top</a>
  </div>
</template>

<style scoped>
.review-page {
  min-height: 100vh;
}

/* Navigation */
.review-nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--vp-c-bg);
  border-bottom: 2px solid #5865F2;
  padding: 20px 24px;
  text-align: center;
}

.review-nav h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
}

.review-nav p {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 0 0 16px;
}

.nav-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nav-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-soft);
  border: 2px solid var(--vp-c-divider);
  border-radius: 8px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #5865F2;
  border-color: #5865F2;
  color: white;
  transform: translateY(-2px);
}

/* Section Wrapper */
.section-wrapper {
  scroll-margin-top: 120px;
}

.section-header-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(88, 101, 242, 0.1), rgba(56, 189, 248, 0.1));
  border-top: 4px solid #5865F2;
  border-bottom: 1px solid var(--vp-c-divider);
}

.section-number {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #5865F2, #38bdf8);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}

.section-meta {
  flex: 1;
}

.section-meta h2 {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--vp-c-text-1);
}

.section-meta p {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 0;
}

.section-file {
  padding: 8px 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.section-content {
  /* Let each section handle its own styling */
}

.section-divider {
  padding: 40px 24px;
  text-align: center;
  background: repeating-linear-gradient(
    -45deg,
    var(--vp-c-bg),
    var(--vp-c-bg) 10px,
    var(--vp-c-bg-soft) 10px,
    var(--vp-c-bg-soft) 20px
  );
  border-top: 2px dashed var(--vp-c-divider);
  border-bottom: 2px dashed var(--vp-c-divider);
}

.section-divider span {
  display: inline-block;
  padding: 12px 24px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 30px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

/* Back to top */
.back-to-top {
  display: block;
  text-align: center;
  padding: 30px;
  background: #5865F2;
  color: white;
  font-weight: 700;
  text-decoration: none;
  font-size: 1.1rem;
}

.back-to-top:hover {
  background: #4752c4;
}

/* Responsive */
@media (max-width: 768px) {
  .section-header-bar {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .section-file {
    display: none;
  }
  
  .nav-btn {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
}
</style>
