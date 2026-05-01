<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { withBase } from 'vitepress'
import feather from 'feather-icons'

const icon = (name) => feather.icons[name]?.toSvg({ class: 'feather-icon' }) || ''

const sectionRef = ref(null)
const isVisible = ref(false)
const mouseX = ref(0)
const mouseY = ref(0)

function checkVisibility() {
  if (!sectionRef.value) return
  const rect = sectionRef.value.getBoundingClientRect()
  isVisible.value = rect.top < window.innerHeight * 0.85
}

function handleMouseMove(e) {
  if (!sectionRef.value) return
  const rect = sectionRef.value.getBoundingClientRect()
  mouseX.value = (e.clientX - rect.left) / rect.width - 0.5
  mouseY.value = (e.clientY - rect.top) / rect.height - 0.5
}

onMounted(() => {
  window.addEventListener('scroll', checkVisibility, { passive: true })
  window.addEventListener('mousemove', handleMouseMove, { passive: true })
  checkVisibility()
})

onUnmounted(() => {
  window.removeEventListener('scroll', checkVisibility)
  window.removeEventListener('mousemove', handleMouseMove)
})

// Parallax transform
const parallaxStyle = computed(() => ({
  transform: `translate(${mouseX.value * 10}px, ${mouseY.value * 10}px)`
}))

const workflowNodes = [
  { id: 'trigger', label: 'HTTP Trigger', icon: 'zap', color: 'green' },
  { id: 'openai', label: 'OpenAI', icon: '🤖', color: 'blue' },
  { id: 'email', label: 'Send Email', icon: '📧', color: 'red' },
]

const deployTargets = [
  { label: 'Automation', icon: 'repeat' },
  { label: 'Agent', icon: 'cpu' },
  { label: 'SaaS', icon: 'layers' },
  { label: 'Micro-App', icon: 'smartphone' },
  { label: 'REST API', icon: 'server' },
  { label: 'Web Server', icon: 'globe' },
]

const platforms = [
  { label: 'Android', icon: 'smartphone', color: '#3ddc84' },
  { label: 'iOS', icon: 'smartphone', color: '#fff' },
  { label: 'Windows', icon: 'monitor', color: '#0078d4' },
  { label: 'macOS', icon: 'monitor', color: '#a855f7' },
  { label: 'Linux', icon: 'monitor', color: '#f59e0b' },
  { label: 'Servers', icon: 'server', color: '#6366f1' },
  { label: 'Docker', icon: 'box', color: '#2496ed' },
  { label: 'Serverless', icon: 'cloud', color: '#ff9900' },
]

</script>

<template>
  <section ref="sectionRef" class="flow-section" :class="{ 'is-visible': isVisible }">
    <div class="container" :style="parallaxStyle">
      <div class="header" :class="{ visible: isVisible }">
        <div class="header-badge" style="display: none;">
          <span class="pulse-ring"></span>
          <span class="badge-text">Next-Gen Deployment</span>
        </div>
        <h2>Build <span class="gradient">Anything</span> With Nodes</h2>
        <p class="subtitle">Because people love building with nodes</p>
      </div>

      <!-- 3-column layout with glassmorphism -->
      <div class="flow-grid" :class="{ visible: isVisible }">
        <!-- Column 1: Nodes -->
        <div class="flow-card nodes-card glass">
          <div class="card-glow"></div>
          <div class="card-label">
            <span v-html="icon('git-merge')"></span>
            Logic Nodes
          </div>
          <div class="workflow-canvas">
            <!-- Animated cursor for drag-drop effect -->
            <div class="node-cursor" :class="{ active: isVisible }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 3l14 9-7 2-3 7-4-18z"/>
              </svg>
              <span class="cursor-drag-icon">⬡</span>
            </div>
            <!-- 1. Trigger -->
            <div class="workflow-row" style="--delay: 0.3s; --node-index: 0">
              <div class="workflow-node trigger">
                <div class="node-glow"></div>
                <span class="node-icon" v-html="icon('mail')"></span>
                <span class="node-name">On Email Received</span>
                <div class="node-badge">Trigger</div>
              </div>
            </div>
            <div class="connector-line animated" style="--conn-delay: 0.6s">
              <div class="flow-particle"></div>
            </div>
            <!-- 2. Parse data -->
            <div class="workflow-row" style="--delay: 0.8s; --node-index: 1">
              <div class="workflow-node action cyan">
                <div class="node-glow cyan"></div>
                <span class="node-icon" v-html="icon('user-plus')"></span>
                <span class="node-name">Enrich Contact</span>
              </div>
            </div>
            <div class="connector-line animated" style="--conn-delay: 1.1s">
              <div class="flow-particle"></div>
            </div>
            <!-- 3. AI Processing -->
            <div class="workflow-row" style="--delay: 1.3s; --node-index: 2">
              <div class="workflow-node action purple">
                <div class="node-glow purple"></div>
                <span class="node-icon" v-html="icon('cpu')"></span>
                <span class="node-name">OpenAI</span>
              </div>
            </div>
            <div class="connector-line animated" style="--conn-delay: 1.6s">
              <div class="flow-particle"></div>
            </div>
            <!-- 4. Branch condition -->
            <div class="workflow-row" style="--delay: 1.8s; --node-index: 3">
              <div class="workflow-node action orange">
                <div class="node-glow orange"></div>
                <span class="node-icon" v-html="icon('git-branch')"></span>
                <span class="node-name">If Success</span>
              </div>
            </div>
            <div class="connector-line split-line animated" style="--conn-delay: 2.1s">
              <div class="flow-particle"></div>
            </div>
            <!-- 5. Parallel actions -->
            <div class="workflow-row split" style="--delay: 2.3s; --node-index: 4">
              <div class="workflow-node action blue">
                <div class="node-glow blue"></div>
                <span class="node-icon" v-html="icon('database')"></span>
                <span class="node-name">Save DB</span>
              </div>
              <div class="workflow-node action purple">
                <div class="node-glow purple"></div>
                <span class="node-icon" v-html="icon('message-square')"></span>
                <span class="node-name">Slack</span>
              </div>
            </div>
            <div class="connector-line merge animated" style="--conn-delay: 2.6s">
              <div class="flow-particle"></div>
            </div>
            <!-- 6. Final output -->
            <div class="workflow-row split" style="--delay: 2.8s; --node-index: 5">
              <div class="workflow-node action red">
                <div class="node-glow red"></div>
                <span class="node-icon" v-html="icon('mail')"></span>
                <span class="node-name">Send Email</span>
              </div>
              <div class="workflow-node action cyan">
                <div class="node-glow cyan"></div>
                <span class="node-icon" v-html="icon('share-2')"></span>
                <span class="node-name">Post Online</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Plus -->
        <div class="operator">
          <span class="operator-glow"></span>
          <span class="operator-text">+</span>
        </div>

        <!-- Column 2: AI UI -->
        <div class="flow-card ai-card glass">
          <div class="card-glow cyan"></div>
          <div class="card-label ai-label">
            <span v-html="icon('cpu')"></span>
            AI-Generated UI
          </div>
          <div class="mock-preview">
            <!-- Animated wand cursor for AI drawing effect -->
            <div class="ui-cursor" :class="{ active: isVisible }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 4V2"/>
                <path d="M15 16v-2"/>
                <path d="M8 9h2"/>
                <path d="M20 9h2"/>
                <path d="M17.8 11.8L19 13"/>
                <path d="M15 9h.01"/>
                <path d="M17.8 6.2L19 5"/>
                <path d="M12.2 6.2L11 5"/>
                <path d="m3 21 8.5-8.5"/>
                <path d="M12.5 11.5 21 3"/>
              </svg>
              <span class="cursor-sparkle">✨</span>
            </div>
            <div class="mock-bar">
              <span class="mock-dot"></span>
              <span class="mock-dot"></span>
              <span class="mock-dot"></span>
            </div>
            <div class="mock-content">
              <div class="mock-line short typing" style="--ui-delay: 0.8s"></div>
              <div class="mock-line typing" style="--ui-delay: 1.4s"></div>
              <div class="mock-line medium typing" style="--ui-delay: 2.0s"></div>
              <div class="mock-button typing" style="--ui-delay: 2.6s"></div>
            </div>
            <div class="ai-sparkles">
              <span class="sparkle" style="--x: 10%; --y: 20%; --delay: 0s">✨</span>
              <span class="sparkle" style="--x: 80%; --y: 30%; --delay: 0.5s">✨</span>
              <span class="sparkle" style="--x: 50%; --y: 70%; --delay: 1s">✨</span>
            </div>
          </div>
        </div>

        <!-- Equals -->
        <div class="operator">
          <span class="operator-glow"></span>
          <span class="operator-text">=</span>
        </div>

        <!-- Column 3: .habit -->
        <a :href="withBase('/dot-habit')" class="habit-card-link">
          <div class="flow-card habit-card holographic">
            <div class="holographic-shine"></div>
            <div class="habit-badge"> 
              <span class="badge-glow"></span>
              <span v-html="icon('package')"></span>
            </div>
            <span class="habit-name">.habit</span>
            <span class="habit-desc">Single deployable file</span>

            <div class="orbit-ring">
              <span class="orbit-dot"></span>
            </div>
          </div>
        </a>
      </div>

      <!-- Deploy targets -->
      <div class="deploy-row" :class="{ visible: isVisible }">
        <span class="deploy-label">
          <span class="label-icon" v-html="icon('arrow-down')"></span>
          Bundles everything into a single file that deploys as
        </span>
        <div class="deploy-targets">
          <div 
            v-for="(target, i) in deployTargets" 
            :key="target.label"
            class="deploy-chip"
            :style="{ '--delay': `${0.4 + i * 0.1}s` }"
          >
            <span class="chip-glow"></span>
            <span v-html="icon(target.icon)"></span>
            {{ target.label }}
          </div>
        </div>
      </div>

      <!-- Platforms -->
      <div class="platforms-row" :class="{ visible: isVisible }">
        <span class="platforms-label">
          <span class="label-icon" v-html="icon('globe')"></span>
          Runs everywhere
        </span>
        <div class="platforms-list">
          <div 
            v-for="(platform, i) in platforms" 
            :key="platform.label"
            class="platform-chip"
            :style="{ 
              '--delay': `${0.6 + i * 0.08}s`,
              '--platform-color': platform.color
            }"
          >
            <span class="chip-ripple"></span>
            <span v-html="icon(platform.icon)"></span>
            {{ platform.label }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ===============================================
   ULTRA-FUTURISTIC ANIMATED SECTION
   =============================================== */

.flow-section {
  padding: 50px 24px;
  background: transparent;
  position: relative;
  min-height: 700px;
}

/* Container with subtle parallax */
.container {
  max-width: var(--home-section-max-w);
  margin: 0 auto;
  position: relative;
  z-index: 1;
  transition: transform 0.1s ease-out;
}

/* Header with futuristic badge */
.header {
  text-align: center;
  margin-bottom: 56px;
  opacity: 0;
  transform: translateY(30px) scale(0.95);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.header.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 15px;
  padding: 6px 16px;
  background: rgba(88, 101, 242, 0.1);
  border: 1px solid rgba(88, 101, 242, 0.3);
  border-radius: 20px;
  margin-bottom: 16px;
  position: relative;
}

.pulse-ring {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  position: relative;
}

.pulse-ring::before {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid #22c55e;
  border-radius: 50%;
  animation: pulseRing 2s ease-out infinite;
}

@keyframes pulseRing {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.badge-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--home-brand-1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header h2 {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}

.gradient {
  background: var(--home-brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--vp-c-text-2);
  font-size: 1.15rem;
  margin: 0;
  opacity: 0.9;
}

/* Flow Grid with 3D transforms */
.flow-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s;
}

.flow-grid.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Glass Card Style */
.flow-card.glass {
  background: var(--home-surface-glass);
  backdrop-filter: blur(var(--home-blur));
  -webkit-backdrop-filter: blur(var(--home-blur));
  border: 1px solid var(--home-border-glass);
  border-radius: var(--home-radius-lg);
  padding: 24px;
  min-width: 200px;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.flow-card.glass:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--home-brand-1) 35%, transparent);
}

/* Custom cursor for nodes card - pointer with drag icon */
.nodes-card {
  min-width: 260px;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M7 4l18 12-9 2.5-4 9.5L7 4z' fill='%235865F2' stroke='%23fff' stroke-width='1.5'/%3E%3Ctext x='22' y='12' font-size='10' fill='%2322c55e'%3E⬡%3C/text%3E%3C/svg%3E") 7 4, pointer;
}

/* Custom cursor for habit card - deployable file icon */
.habit-card-link {
  text-decoration: none;
  display: block;
}

.habit-card {
  
}

/* Custom cursor for AI card - magic wand with sparkle */
.ai-card {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M4 28L20 12' stroke='%23ec4899' stroke-width='2.5' stroke-linecap='round'/%3E%3Cpath d='M20 12l4-4' stroke='%23ec4899' stroke-width='2'/%3E%3Ccircle cx='24' cy='8' r='2' fill='%23ec4899'/%3E%3Ctext x='20' y='8' font-size='8'%3E✨%3C/text%3E%3C/svg%3E") 4 28, crosshair;
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, color-mix(in srgb, var(--home-brand-1) 18%, transparent) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
}

.card-glow.cyan {
  background: radial-gradient(circle, color-mix(in srgb, var(--home-brand-2) 18%, transparent) 0%, transparent 50%);
}

.flow-card.glass:hover .card-glow {
  opacity: 1;
}

.card-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--vp-c-text-1);
}

.card-label :deep(svg) {
  width: 16px;
  height: 16px;
  color: var(--home-brand-1);
}

.ai-label {
  color: var(--home-brand-3);
}

.ai-label :deep(svg) {
  color: var(--home-brand-3);
}

/* Workflow Canvas with glowing nodes */
.workflow-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  position: relative;
}

/* Node Cursor - Drag and Drop Style */
.node-cursor {
  position: absolute;
  top: 0;
  left: 50%;
  width: 28px;
  height: 28px;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%);
}

.node-cursor.active {
  /* animation starts only when section scrolls into view */
}

.flow-section.is-visible .node-cursor.active {
  animation: nodeCursorMove 3.5s ease-in-out 0.2s forwards;
}

.node-cursor svg {
  width: 20px;
  height: 20px;
  color: var(--home-brand-1);
  filter: drop-shadow(0 2px 4px color-mix(in srgb, var(--home-brand-1) 50%, transparent));
}

.cursor-drag-icon {
  position: absolute;
  top: -8px;
  right: -12px;
  font-size: 14px;
  color: var(--home-accent-3);
  animation: dragIconPulse 0.5s ease-in-out infinite;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--home-accent-3) 60%, transparent));
}

@keyframes dragIconPulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
}

@keyframes nodeCursorMove {
  0% { 
    top: -20px; 
    opacity: 1; 
    transform: translateX(-50%) scale(1);
  }
  8% { 
    top: 25px; 
    opacity: 1; 
    transform: translateX(-50%) scale(0.9);
  }
  10% { 
    top: 25px; 
    transform: translateX(-50%) scale(1.1);
  }
  18% { 
    top: 70px; 
    transform: translateX(-50%) scale(0.9);
  }
  20% { 
    top: 70px; 
    transform: translateX(-50%) scale(1.1);
  }
  28% { 
    top: 115px; 
    transform: translateX(-50%) scale(0.9);
  }
  30% { 
    top: 115px; 
    transform: translateX(-50%) scale(1.1);
  }
  38% { 
    top: 160px; 
    transform: translateX(-50%) scale(0.9);
  }
  40% { 
    top: 160px; 
    transform: translateX(-50%) scale(1.1);
  }
  48% { 
    top: 210px; 
    transform: translateX(-50%) scale(0.9);
  }
  50% { 
    top: 210px; 
    transform: translateX(-50%) scale(1.1);
  }
  58% { 
    top: 270px; 
    transform: translateX(-50%) scale(0.9);
  }
  60% { 
    top: 270px; 
    transform: translateX(-50%) scale(1.1);
  }
  70% {
    top: 300px;
    opacity: 1;
  }
  100% { 
    top: 320px; 
    opacity: 0;
    transform: translateX(-50%) scale(0.5);
  }
}

/* UI Cursor - Magic Wand Style */
.ui-cursor {
  position: absolute;
  top: 30px;
  left: 10px;
  width: 28px;
  height: 28px;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
}

.ui-cursor.active {
  /* animation starts only when section scrolls into view */
}

.flow-section.is-visible .ui-cursor.active {
  animation: uiCursorMove 3.5s ease-in-out 0.5s forwards;
}

.ui-cursor svg {
  width: 18px;
  height: 18px;
  color: var(--home-brand-3);
  filter: drop-shadow(0 2px 4px color-mix(in srgb, var(--home-brand-3) 50%, transparent));
}

.cursor-sparkle {
  position: absolute;
  top: -4px;
  right: -8px;
  font-size: 12px;
  animation: sparkleRotate 0.8s linear infinite;
}

@keyframes sparkleRotate {
  from { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.2); }
  to { transform: rotate(360deg) scale(1); }
}

@keyframes uiCursorMove {
  0% { 
    top: 20px; 
    left: 10px;
    opacity: 1; 
  }
  15% { 
    top: 35px; 
    left: 60%;
    opacity: 1; 
  }
  25% { 
    top: 50px; 
    left: 80%;
  }
  40% { 
    top: 60px; 
    left: 85%;
  }
  55% { 
    top: 75px; 
    left: 50%;
  }
  70% { 
    top: 95px; 
    left: 45%;
  }
  85% {
    top: 100px;
    left: 70%;
    opacity: 1;
  }
  100% { 
    top: 110px; 
    left: 80%;
    opacity: 0;
  }
}

.workflow-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transform: translateY(-30px) scale(0.6);
}

.flow-section.is-visible .workflow-row {
  animation: nodeDrop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) var(--delay, 0s) both;
}

@keyframes nodeDrop {
  0% {
    opacity: 0;
    transform: translateY(-12px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.workflow-row.split {
  gap: 16px;
}

.workflow-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: var(--vp-c-bg);
  border: 1px solid;
  border-radius: 10px;
  min-width: 95px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.node-glow {
  position: absolute;
  inset: -1px;
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: -1;
}

.workflow-node:hover .node-glow {
  opacity: 1;
}

.workflow-node.trigger .node-glow {
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.2);
}

.node-glow.purple {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.2);
}

.node-glow.blue {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2);
}

.node-glow.red {
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2);
}

.node-glow.cyan {
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(6, 182, 212, 0.2);
}

.node-glow.orange {
  box-shadow: 0 0 20px rgba(249, 115, 22, 0.5), 0 0 40px rgba(249, 115, 22, 0.2);
}

.node-glow.yellow {
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.5), 0 0 40px rgba(234, 179, 8, 0.2);
}

.workflow-node:hover {
  transform: translateY(-3px) scale(1.02);
}

.workflow-node.trigger {
  border-color: #22c55e;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.05));
}

.workflow-node.action.purple {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(139, 92, 246, 0.05));
}

.workflow-node.action.blue {
  border-color: #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.05));
}

.workflow-node.action.red {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.05));
}

.workflow-node.action.cyan {
  border-color: #06b6d4;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(6, 182, 212, 0.05));
}

.workflow-node.action.orange {
  border-color: #f97316;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(249, 115, 22, 0.05));
}

.workflow-node.action.yellow {
  border-color: #eab308;
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(234, 179, 8, 0.05));
}

.node-icon :deep(svg) {
  width: 20px;
  height: 20px;
  color: var(--vp-c-text-1);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.workflow-node.trigger .node-icon :deep(svg) { color: #22c55e; }
.workflow-node.action.purple .node-icon :deep(svg) { color: #8b5cf6; }
.workflow-node.action.blue .node-icon :deep(svg) { color: #3b82f6; }
.workflow-node.action.red .node-icon :deep(svg) { color: #ef4444; }
.workflow-node.action.cyan .node-icon :deep(svg) { color: #06b6d4; }
.workflow-node.action.orange .node-icon :deep(svg) { color: #f97316; }
.workflow-node.action.yellow .node-icon :deep(svg) { color: #eab308; }

.node-emoji {
  font-size: 1.4rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.node-name {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-align: center;
}

.node-badge {
  position: absolute;
  top: -8px;
  right: -25px;
  padding: 2px 8px;
  background: linear-gradient(135deg, var(--home-accent-3), color-mix(in srgb, var(--home-accent-3) 80%, #000));
  color: white;
  font-size: 0.55rem;
  font-weight: 700;
  border-radius: 6px;
  text-transform: uppercase;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--home-accent-3) 40%, transparent);
}

/* Animated Connector Lines */
.connector-line {
  width: 2px;
  height: 18px;
  background: linear-gradient(180deg, var(--vp-c-divider), var(--home-brand-1));
  position: relative;
  overflow: visible;
  opacity: 0;
}

.flow-section.is-visible .connector-line {
  animation: connectorAppear 0.3s ease-out var(--conn-delay, 0s) forwards;
}

@keyframes connectorAppear {
  from { opacity: 0; transform: scaleY(0); }
  to { opacity: 1; transform: scaleY(1); }
}

.connector-line.animated::before {
  content: '';
  position: absolute;
  top: 0;
  left: -1px;
  width: 4px;
  height: 8px;
  background: var(--home-brand-1);
  border-radius: 2px;
  box-shadow: 0 0 8px var(--home-brand-1);
}

.flow-section.is-visible .connector-line.animated::before {
  display: none;
}

@keyframes flowDown {
  0% { top: 0; opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.connector-line::after {
  display: none;
}

.flow-particle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: var(--home-brand-2);
  border-radius: 50%;
  top: 0;
  left: -2px;
  box-shadow: 0 0 10px var(--home-brand-2), 0 0 20px var(--home-brand-2);
}

.flow-section.is-visible .flow-particle {
  animation: particleFlow 2s ease-in-out infinite 0.5s;
}

@keyframes particleFlow {
  0% { top: 0; opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

/* Split connector for branching - shows Y shape */
.connector-line.split-line {
  width: 2px;
  height: 12px;
  position: relative;
}

.connector-line.split-line::before {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 8px;
  border-left: 2px solid var(--home-brand-1);
  border-right: 2px solid var(--home-brand-1);
  border-bottom: 2px solid var(--home-brand-1);
  border-radius: 0 0 8px 8px;
}

.connector-line.split-line::after {
  display: none;
}

/* Glowing Operators */
.operator {
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--vp-c-text-2);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.operator-glow {
  display: none;
}

.operator-text {
  position: relative;
  z-index: 1;
  text-shadow: 0 0 20px color-mix(in srgb, var(--home-brand-1) 50%, transparent);
}

/* AI Card with Typing Animation */
.mock-preview {
  background: linear-gradient(145deg,
    color-mix(in srgb, var(--home-brand-1) 12%, var(--vp-c-bg)),
    color-mix(in srgb, var(--home-brand-3) 8%, var(--vp-c-bg)));
  border-radius: 10px;
  padding: 14px;
  min-height: 100px;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--home-border-glass);
}

.mock-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.mock-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff5f56;
}

.mock-dot:nth-child(2) { background: #ffbd2e; }
.mock-dot:nth-child(3) { background: #27ca40; }

.mock-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-line {
  height: 10px;
  background: linear-gradient(90deg, var(--home-track), var(--home-border-strong));
  border-radius: 5px;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: scaleX(0);
  transform-origin: left;
}

.flow-section.is-visible .mock-line.typing {
  animation: uiLineAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) var(--ui-delay, 0s) forwards;
}

@keyframes uiLineAppear {
  0% { opacity: 0; transform: scaleX(0); }
  100% { opacity: 1; transform: scaleX(1); }
}

.mock-line.typing::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--home-brand-3) 40%, transparent), transparent);
}

.flow-section.is-visible .mock-line.typing::after {
  animation: typingLine 1.5s ease-in-out infinite;
  animation-delay: calc(var(--ui-delay, 0s) + 0.4s);
}

@keyframes typingLine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.mock-line.short { width: 45%; }
.mock-line.medium { width: 75%; }

.mock-button {
  width: 50%;
  height: 24px;
  background: var(--home-brand-gradient-2);
  border-radius: 6px;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: scale(0.8);
}

.flow-section.is-visible .mock-button.typing {
  animation: uiButtonAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) var(--ui-delay, 0s) forwards;
}

@keyframes uiButtonAppear {
  0% { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}

.mock-button::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}

.flow-section.is-visible .mock-button::after {
  animation: buttonShine 2s ease-in-out infinite;
  animation-delay: calc(var(--ui-delay, 0s) + 0.5s);
}

@keyframes buttonShine {
  0% { transform: translateX(-100%) skewX(-15deg); }
  100% { transform: translateX(200%) skewX(-15deg); }
}

/* AI Sparkles */
.ai-sparkles {
  display: none;
}

/* Holographic Habit Card */
.habit-card.holographic {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: color-mix(in srgb, var(--home-brand-1) 8%, var(--home-surface-glass));
  border: 1px solid color-mix(in srgb, var(--home-brand-1) 30%, transparent);
  border-radius: var(--home-radius-lg);
  position: relative;
  overflow: hidden;
  padding: 10px;
}

.holographic-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: holoShine 3s ease-in-out infinite;
}

@keyframes holoShine {
  0% { transform: translateX(-100%) rotate(0deg); }
  100% { transform: translateX(200%) rotate(0deg); }
}

.habit-badge {
  width: 52px;
  height: 52px;
  background: color-mix(in srgb, var(--home-brand-1) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--home-brand-1) 35%, transparent);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  position: relative;
  box-shadow: 0 2px 12px color-mix(in srgb, var(--home-brand-1) 25%, transparent);
}

.badge-glow {
  display: none;
}

.habit-badge :deep(svg) {
  width: 24px;
  height: 24px;
  color: var(--home-brand-1);
}

.habit-name {
  font-size: 1.3rem;
  font-weight: 800;
  background: var(--home-brand-gradient-2);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.habit-desc {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  margin-top: 4px;
}

/* Orbit Ring */
.orbit-ring {
  display: none;
}

/* Deploy Row */
.deploy-row {
  margin-top: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s;
}

.deploy-row.visible {
  opacity: 1;
  transform: translateY(0);
}

.deploy-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.label-icon {
  display: inline-flex;
}

.label-icon :deep(svg) {
  width: 16px;
  height: 16px;
  color: var(--home-brand-1);
  animation: bounceArrow 1.5s ease-in-out infinite;
}

@keyframes bounceArrow {
  0%, 100% { transform: translateY(0); }
}

.deploy-targets {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
}

.deploy-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--home-surface-glass);
  backdrop-filter: blur(var(--home-blur-soft));
  -webkit-backdrop-filter: blur(var(--home-blur-soft));
  border: 1px solid var(--home-border-glass);
  border-radius: var(--home-radius-xl);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  opacity: 0;
  transform: translateY(15px) scale(0.9);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: var(--delay);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.deploy-row.visible .deploy-chip {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.chip-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, color-mix(in srgb, var(--home-brand-1) 18%, transparent), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.deploy-chip:hover .chip-glow {
  opacity: 1;
}

.deploy-chip :deep(svg) {
  width: 18px;
  height: 18px;
  color: var(--home-brand-1);
  transition: transform 0.3s;
}

.deploy-chip:hover {
  border-color: color-mix(in srgb, var(--home-brand-1) 50%, transparent);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--home-brand-1) 22%, transparent);
}

.deploy-chip:hover :deep(svg) {
  transform: scale(1.1);
}

/* Platforms Row */
.platforms-row {
  margin-top: 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s;
}

.platforms-row.visible {
  opacity: 1;
  transform: translateY(0);
}

.platforms-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--vp-c-text-3);
  font-weight: 500;
}

.platforms-label .label-icon :deep(svg) {
  opacity: 0.7;
}

.platforms-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.platform-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--home-surface-glass);
  border: 1px solid var(--home-border-glass);
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  opacity: 0;
  transform: translateY(10px) scale(0.9);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: var(--delay);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.platforms-row.visible .platform-chip {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.chip-ripple {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, var(--platform-color) 0%, transparent 70%);
  opacity: 0;
  transform: scale(0);
  transition: all 0.5s;
}

.platform-chip:hover .chip-ripple {
  opacity: 0.15;
  transform: scale(2);
}

.platform-chip :deep(svg) {
  width: 16px;
  height: 16px;
  color: var(--platform-color);
  transition: all 0.3s;
}

.platform-chip:hover {
  border-color: var(--platform-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--platform-color) 30%, transparent);
}

.platform-chip:hover :deep(svg) {
  transform: scale(1.15);
  filter: drop-shadow(0 0 6px var(--platform-color));
}

/* Responsive */
@media (max-width: 768px) {
  .flow-section {
    padding: 60px 16px;
  }
  
  /* Hide cursors on mobile */
  .node-cursor,
  .ui-cursor {
    display: none;
  }
  
  .header h2 {
    font-size: 2.2rem;
  }
  
  .flow-grid {
    flex-direction: column;
    gap: 16px;
  }
  
  .operator {
    transform: rotate(90deg);
  }
  
  .flow-card.glass {
    width: 100%;
    max-width: 300px;
  }
  
  .nodes-card {
    max-width: 320px;
  }
  
  .workflow-row.split {
    flex-direction: column;
    gap: 8px;
  }
  
  .connector-line.merge {
    height: 14px;
  }
  
  .orbit-ring {
    display: none;
  }
}
</style>
