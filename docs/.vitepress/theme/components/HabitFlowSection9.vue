<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import feather from 'feather-icons'

const icon = (name) => feather.icons[name]?.toSvg({ class: 'feather-icon' }) || ''

const sectionRef = ref(null)
const progress = ref(0)

// Animation - faster progression
function handleScroll() {
  if (!sectionRef.value) return
  const rect = sectionRef.value.getBoundingClientRect()
  const windowHeight = window.innerHeight
  const startThreshold = windowHeight * 0.15
  const scrollDistance = windowHeight * 1.6 // Complete in 160% viewport for vertical layout
  const rawProgress = (startThreshold - rect.top) / scrollDistance
  progress.value = Math.min(1, Math.max(0, rawProgress))
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Phase thresholds - adjusted for faster animation
const phase = computed(() => {
  if (progress.value < 0.12) return 'nodes'
  if (progress.value < 0.25) return 'ai'
  if (progress.value < 0.4) return 'habit'
  if (progress.value < 0.7) return 'tree'
  return 'platforms'
})

// Scattered nodes with percentage positions (relative to parent)
const workflowNodes = [
  { id: 'trigger', label: 'HTTP Request', module: 'Webhook Trigger', type: 'trigger', color: 'green', x: 8, y: 15 },
  { id: 'openai', label: 'OpenAI', module: 'Chat Completion', type: 'action', color: 'red', x: 54, y: 5 },
  { id: 'gmail', label: 'Gmail', module: 'Send Email', type: 'action', color: 'red', x: 23, y: 65 },
  { id: 'gdrive', label: 'Google Drive', module: 'Upload File', type: 'action', color: 'red', x: 63, y: 60 },
]

// Code lines
const codeLines = [
  '<template>',
  '  <div class="dashboard">',
  '    <header>AI Assistant</header>',
  '    <ChatWindow :messages="msgs" />',
  '    <InputBar @send="handleSend" />',
  '  </div>',
  '</template>',
]

// Tree branches
const treeBranches = [
  { label: 'Automation', icon: 'repeat', desc: 'Scheduled workflows' },
  { label: 'Micro-App', icon: 'smartphone', desc: 'Full-stack apps' },
  { label: 'REST API', icon: 'server', desc: 'HTTP endpoints' },
  { label: 'Web Server', icon: 'globe', desc: 'Production hosting' },
]

// Platforms
const platforms = [
  { icon: 'smartphone', label: 'iOS', color: '#000' },
  { icon: 'smartphone', label: 'Android', color: '#3ddc84' },
  { icon: 'monitor', label: 'Windows', color: '#0078d4' },
  { icon: 'monitor', label: 'macOS', color: '#555' },
  { icon: 'monitor', label: 'Linux', color: '#f59e0b' },
  { icon: 'hard-drive', label: 'Server', color: '#5865F2' },
  { icon: 'cloud', label: 'Docker', color: '#2496ed' },
]

// Collapse progress
const collapseProgress = computed(() => {
  if (progress.value < 0.25) return 0
  if (progress.value > 0.4) return 1
  return (progress.value - 0.25) / 0.15
})

// Visible code lines
const visibleCodeLines = computed(() => {
  if (progress.value < 0.12) return 0
  const aiProgress = (progress.value - 0.12) / 0.13
  return Math.min(codeLines.length, Math.floor(aiProgress * codeLines.length) + 1)
})
</script>

<template>
  <section ref="sectionRef" class="materialize-section">
    <div class="materialize-container">
      <div class="section-header">
        <h2>Watch Ideas <span class="gradient">Materialize</span></h2>
        <p>Logic + AI-Generated UI = Deployable Applications</p>
      </div>

      <!-- Main Canvas -->
      <div class="main-canvas">
        <div class="sticky-content">
          
          <!-- Convergence Zone - All elements collapse here -->
          <div class="convergence-zone">
            
            <!-- Phase 1: Scattered Nodes -->
            <div 
              class="nodes-panel"
              :class="{ collapsing: collapseProgress > 0 }"
              :style="{ 
                '--collapse': collapseProgress,
                transform: `scale(${1 - collapseProgress * 0.9}) translateY(${collapseProgress * 280}px)`,
                opacity: 1 - collapseProgress * 0.95
              }"
            >
              <div class="phase-label">
                <span v-html="icon('git-merge')"></span>
                Build Logic Using Nodes
              </div>
              <div class="workflow-area">
                <!-- SVG for animated connections -->
                <svg class="connections-layer" viewBox="0 0 700 200" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#5865F2" />
                    </marker>
                  </defs>
                  <!-- trigger -> openai -->
                  <path 
                    d="M170,55 C280,55 300,35 400,35" 
                    class="connection" 
                    :class="{ visible: progress > 0.04 }"
                    marker-end="url(#arrowhead)"
                  />
                  <!-- trigger -> gmail -->
                  <path 
                    d="M130,80 C140,110 170,130 180,155" 
                    class="connection" 
                    :class="{ visible: progress > 0.06 }"
                    marker-end="url(#arrowhead)"
                  />
                  <!-- openai -> gdrive -->
                  <path 
                    d="M500,55 C540,80 510,110 500,135" 
                    class="connection" 
                    :class="{ visible: progress > 0.08 }"
                    marker-end="url(#arrowhead)"
                  />
                  <!-- gmail -> gdrive -->
                  <path 
                    d="M290,155 C360,155 380,145 450,145" 
                    class="connection" 
                    :class="{ visible: progress > 0.1 }"
                    marker-end="url(#arrowhead)"
                  />
                </svg>
                
                <!-- Scattered Nodes -->
                <div 
                  v-for="(node, i) in workflowNodes" 
                  :key="node.id"
                  class="workflow-node"
                  :class="[node.color, { visible: progress > 0.01 + i * 0.015 }]"
                  :style="{ left: node.x + '%', top: node.y + '%' }"
                >
                  <div class="node-handle top" v-if="node.type !== 'trigger'"></div>
                  <div class="node-header">
                    <span class="node-id">{{ node.id }}</span>
                  </div>
                  <div class="node-body">
                    <div class="node-icon">
                      <span v-if="node.id === 'openai'">🤖</span>
                      <span v-else-if="node.id === 'gmail'">📧</span>
                      <span v-else-if="node.id === 'gdrive'">📁</span>
                      <span v-else v-html="icon('zap')"></span>
                    </div>
                    <div class="node-info">
                      <div class="node-label">{{ node.label }}</div>
                      <div class="node-module">{{ node.module }}</div>
                    </div>
                  </div>
                  <div class="node-handle bottom"></div>
                </div>
              </div>
            </div>

            <!-- Plus Sign -->
            <div class="plus-sign" :class="{ visible: progress > 0.08, shrink: collapseProgress > 0.5 }">+</div>

            <!-- Phase 2: AI Panel -->
            <div 
              class="ai-panel"
              :class="{ active: phase === 'ai' || phase === 'habit', collapsing: collapseProgress > 0 }"
              :style="{ 
                transform: `scale(${1 - collapseProgress * 0.9}) translateY(${collapseProgress * 140}px)`,
                opacity: 1 - collapseProgress * 0.95
              }"
            >
              <div class="phase-label ai-label">
                <span v-html="icon('cpu')"></span>
                AI Generates UI
              </div>
              <div class="ai-dual-view">
                <!-- Code Window -->
                <div class="code-window">
                  <div class="window-header">
                    <span class="dot red"></span>
                    <span class="dot yellow"></span>
                    <span class="dot green"></span>
                    <span class="filename">App.vue</span>
                  </div>
                  <div class="code-content">
                    <div 
                      v-for="(line, i) in codeLines" 
                      :key="i"
                      class="code-line"
                      :class="{ visible: i < visibleCodeLines }"
                    >
                      <span class="line-num">{{ i + 1 }}</span>
                      <span class="line-code">{{ line }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- Arrow -->
                <div class="transform-arrow" :class="{ active: progress > 0.14 }">
                  <span v-html="icon('arrow-right')"></span>
                </div>
                
                <!-- Mock App -->
                <div class="mock-app" :class="{ building: progress > 0.14 }">
                  <div class="mock-header" :class="{ visible: progress > 0.16 }">AI Assistant</div>
                  <div class="mock-chat" :class="{ visible: progress > 0.18 }">
                    <div class="chat-bubble bot">Hello! How can I help?</div>
                    <div class="chat-bubble user" :class="{ visible: progress > 0.2 }">Generate a report</div>
                  </div>
                  <div class="mock-input" :class="{ visible: progress > 0.22 }">
                    <div class="input-field"></div>
                    <div class="send-btn"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Equals Sign -->
            <div class="equals-sign" :class="{ visible: collapseProgress > 0.3 }">Bundle Logic Workflow + UI into</div>

            <!-- Central .habit file -->
            <div 
              class="habit-file"
              :class="{ forming: collapseProgress > 0.5, complete: collapseProgress >= 1 }"
            >
              <div class="habit-icon">
                <span v-html="icon('package')"></span>
              </div>
              <span class="habit-ext">.habit</span>
              <div class="habit-glow"></div>
            </div>
          </div>

          <!-- Phase 4: Tree Branches -->
          <div class="tree-phase" :class="{ active: phase === 'tree' || phase === 'platforms' }">
            <div class="tree-header">
              <span class="arrow-down" v-html="icon('arrow-down')"></span>
              <h3>One file becomes...</h3>
            </div>
            <div class="tree-branches">
              <div 
                v-for="(branch, i) in treeBranches" 
                :key="branch.label"
                class="branch-card"
                :class="{ visible: progress > 0.42 + i * 0.06 }"
              >
                <div class="branch-connector"></div>
                <div class="branch-icon">
                  <span v-html="icon(branch.icon)"></span>
                </div>
                <div class="branch-info">
                  <strong>{{ branch.label }}</strong>
                  <span>{{ branch.desc }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Phase 5: Platforms -->
          <div class="platforms-phase" :class="{ active: phase === 'platforms' }">
            <div class="platforms-hero">
              <h3>That can run on...</h3>
            </div>
            <div class="platforms-grid">
              <div 
                v-for="(p, i) in platforms" 
                :key="p.label"
                class="platform-chip"
                :class="{ visible: progress > 0.72 + i * 0.03 }"
                :style="{ '--platform-color': p.color }"
              >
                <span class="chip-icon" v-html="icon(p.icon)"></span>
                <span>{{ p.label }}</span>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="summary-bar" :class="{ show: progress > 0.92 }">
            <div class="sum-equation">
              <span class="sum-item nodes-sum">Nodes</span>
              <span class="sum-op">+</span>
              <span class="sum-item ai-sum">AI UI</span>
              <span class="sum-op">=</span>
              <span class="sum-item habit-sum">.habit</span>
              <span class="sum-op">→</span>
              <span class="sum-item deploy-sum">Anywhere</span>
            </div>
          </div>

        </div><!-- end sticky-content -->
      </div>
    </div>
  </section>
</template>

<style scoped>
.materialize-section {
  padding: 80px 24px 100px;
  background: linear-gradient(180deg, var(--vp-c-bg) 0%, var(--vp-c-bg-soft) 100%);
  overflow: hidden;
}

.materialize-container {
  max-width: 1100px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
}

.gradient {
  background: linear-gradient(135deg, #5865F2, #38bdf8, #22c55e);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% auto;
  animation: gradient-shift 3s linear infinite;
}

@keyframes gradient-shift {
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
}

.section-header p {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* Main Canvas */
.main-canvas {
  position: relative;
  min-height: 200vh; /* Room for vertical layout */
}

.sticky-content {
  position: sticky;
  top: 80px;
  padding-bottom: 40px;
}

/* Convergence Zone - Where everything collapses */
.convergence-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  min-height: 500px;
  margin-bottom: 40px;
}

/* Phase Labels */
.phase-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 16px;
}

.phase-label :deep(svg) {
  width: 16px;
  height: 16px;
  color: #5865F2;
}

.ai-label {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1));
  border-color: #ec4899;
}

.ai-label :deep(svg) {
  color: #ec4899;
}

/* Nodes Panel */
.nodes-panel {
  flex-shrink: 0;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s;
  transform-origin: center 400px; /* Far below - toward .habit */
  width: 100%;
}

.nodes-panel.collapsing {
  pointer-events: none;
}

/* Workflow Area - Scattered layout */
.workflow-area {
  position: relative;
  width: 100%;
  height: 300px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: visible;
}

/* Connections SVG Layer */
.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.connection {
  fill: none;
  stroke: #5865F2;
  stroke-width: 2;
  stroke-dasharray: 8 4;
  opacity: 0;
  transition: opacity 0.4s;
}

.connection.visible {
  opacity: 1;
  animation: dash-flow 0.8s linear infinite;
}

@keyframes dash-flow {
  to { stroke-dashoffset: -12; }
}

/*  nodes - Absolute positioned */
.workflow-node {
  position: absolute;
  min-width: 120px;
  border-radius: 8px;
  border: 2px solid;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  opacity: 0;
  transform: translateY(15px) scale(0.9);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1;
}

.workflow-node.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.workflow-node.green {
  background: #14532d;
  border-color: #22c55e;
}

.workflow-node.green .node-header {
  background: #166534;
  color: #86efac;
}

.workflow-node.red {
  background: #7f1d1d;
  border-color: #ef4444;
}

.workflow-node.red .node-header {
  background: #991b1b;
  color: #fca5a5;
}

.node-header {
  padding: 5px 8px;
  font-family: monospace;
  font-size: 0.65rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.node-body {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
}

.node-icon {
  font-size: 1.2rem;
}

.node-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.workflow-node.green .node-icon { color: #86efac; }
.workflow-node.red .node-icon { color: #fca5a5; }

.node-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
}

.node-module {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.6);
}

.node-handle {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  background: var(--vp-c-divider);
  border-radius: 50%;
}

.node-handle.top { top: -4px; }
.node-handle.bottom { bottom: -4px; }

/* Plus Sign */
.plus-sign {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--vp-c-text-3);
  opacity: 0;
  transition: all 0.5s;
  flex-shrink: 0;
}

.plus-sign.visible {
  opacity: 1;
}

.plus-sign.shrink {
  transform: scale(0.3) translateY(80px);
  opacity: 0;
}

/* AI Panel */
.ai-panel {
  flex-shrink: 0;
  opacity: 0;
  transform: translateY(20px);
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s;
  transform-origin: center 800px; /* Below - toward .habit */
  width: 100%;
}

.ai-panel.active {
  opacity: 1;
  transform: translateY(0);
}

.ai-panel.collapsing {
  pointer-events: none;
}

.ai-dual-view {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  width: 100%;
}

/* Code Window */
.code-window {
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
  flex: 1;
  max-width: 480px;
}

.window-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 10px;
  background: #2d2d2d;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.red { background: #ff5f56; }
.dot.yellow { background: #ffbd2e; }
.dot.green { background: #27ca40; }

.filename {
  margin-left: auto;
  font-size: 0.65rem;
  color: #888;
}

.code-content {
  padding: 8px 0;
  min-height: 120px;
}

.code-line {
  display: flex;
  gap: 8px;
  padding: 1px 10px;
  font-family: 'Fira Code', monospace;
  font-size: 0.55rem;
  line-height: 1.5;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s;
}

.code-line.visible {
  opacity: 1;
  transform: translateX(0);
}

.line-num {
  color: #555;
  width: 14px;
  text-align: right;
}

.line-code {
  color: #9cdcfe;
}

/* Transform Arrow */
.transform-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  opacity: 0;
  transition: opacity 0.5s;
}

.transform-arrow.active {
  opacity: 1;
}

.transform-arrow :deep(svg) {
  width: 20px;
  height: 20px;
  color: #5865F2;
  animation: arrow-pulse 1s ease-in-out infinite;
}

@keyframes arrow-pulse {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
}

/* Mock App */
.mock-app {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  flex: 1;
  max-width: 440px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.mock-app.building {
  border-color: #5865F2;
}

.mock-header {
  padding: 10px;
  background: #5865F2;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  opacity: 0;
  transition: opacity 0.4s;
}

.mock-header.visible {
  opacity: 1;
}

.mock-chat {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.4s;
}

.mock-chat.visible {
  opacity: 1;
}

.chat-bubble {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.6rem;
  max-width: 85%;
}

.chat-bubble.bot {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  align-self: flex-start;
}

.chat-bubble.user {
  background: #5865F2;
  color: white;
  align-self: flex-end;
  opacity: 0;
  transition: opacity 0.4s;
}

.chat-bubble.user.visible {
  opacity: 1;
}

.mock-input {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid var(--vp-c-divider);
  opacity: 0;
  transition: opacity 0.4s;
}

.mock-input.visible {
  opacity: 1;
}

.input-field {
  flex: 1;
  height: 24px;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
}

.send-btn {
  width: 24px;
  height: 24px;
  background: #5865F2;
  border-radius: 6px;
}

/* Equals Sign */
.equals-sign {
  font-size: 3rem;
  font-weight: 700;
  color: var(--vp-c-text-3);
  opacity: 0;
  transition: all 0.5s;
  flex-shrink: 0;
}

.equals-sign.visible {
  opacity: 1;
}

/* Habit File - Appears below */
.habit-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 30px;
  background: linear-gradient(135deg, rgba(88, 101, 242, 0.15), rgba(56, 189, 248, 0.15));
  border: 2px solid #5865F2;
  border-radius: 14px;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 10;
}

.habit-file.forming {
  opacity: 1;
  transform: scale(1);
}

.habit-file.complete {
  animation: habit-pulse 2s ease-in-out infinite;
}

@keyframes habit-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(88, 101, 242, 0.4); }
  50% { box-shadow: 0 0 25px 8px rgba(88, 101, 242, 0.3); }
}

.habit-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #5865F2, #38bdf8);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.habit-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.habit-ext {
  font-size: 1.1rem;
  font-weight: 700;
  color: #5865F2;
}

.habit-glow {
  position: absolute;
  inset: -12px;
  background: radial-gradient(circle, rgba(88, 101, 242, 0.2) 0%, transparent 70%);
  pointer-events: none;
}

/* Tree Phase */
.tree-phase {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s;
  margin-bottom: 30px;
}

.tree-phase.active {
  opacity: 1;
  transform: translateY(0);
}

.tree-header {
  text-align: center;
  margin-bottom: 20px;
}

.tree-header .arrow-down {
  display: flex;
  margin-bottom: 8px;
  justify-content: center;
}

.tree-header .arrow-down :deep(svg) {
  width: 24px;
  height: 24px;
  color: #5865F2;
  animation: bounce-arrow 1s infinite;
}

@keyframes bounce-arrow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(5px); }
}

.tree-header h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: var(--vp-c-text-1);
}

.tree-branches {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.branch-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-align: center;
  position: relative;
  opacity: 0;
  transform: translateY(15px);
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.branch-card.visible {
  opacity: 1;
  transform: translateY(0);
}

.branch-card:hover {
  border-color: #5865F2;
  transform: translateY(-3px);
}

.branch-connector {
  position: absolute;
  top: -16px;
  left: 50%;
  width: 2px;
  height: 16px;
  /* background: linear-gradient(180deg, #5865F2, var(--vp-c-divider)); */
}

.branch-icon {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, rgba(88, 101, 242, 0.15), rgba(56, 189, 248, 0.15));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.branch-icon :deep(svg) {
  width: 18px;
  height: 18px;
  color: #5865F2;
}

.branch-info strong {
  display: block;
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
  margin-bottom: 2px;
}

.branch-info span {
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
}

/* Platforms Phase */
.platforms-phase {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s;
}

.platforms-phase.active {
  opacity: 1;
  transform: translateY(0);
}

.platforms-hero {
  text-align: center;
  margin-bottom: 20px;
}

.platforms-hero h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: var(--vp-c-text-1);
}

.platforms-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.platform-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--vp-c-bg);
  border: 2px solid var(--vp-c-divider);
  border-radius: 24px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  opacity: 0;
  transform: scale(0.8) translateY(8px);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.platform-chip.visible {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.platform-chip:hover {
  border-color: var(--platform-color);
  transform: translateY(-2px);
}

.chip-icon {
  color: var(--platform-color);
}

.chip-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

/* Summary Bar */
.summary-bar {
  margin-top: 40px;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(88, 101, 242, 0.1), rgba(56, 189, 248, 0.1));
  border: 1px solid rgba(88, 101, 242, 0.2);
  border-radius: 14px;
  text-align: center;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s;
}

.summary-bar.show {
  opacity: 1;
  transform: translateY(0);
}

.sum-equation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sum-item {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.nodes-sum {
  background: #14532d;
  color: #86efac;
  border: 1px solid #22c55e;
}

.ai-sum {
  background: rgba(236, 72, 153, 0.15);
  color: #f472b6;
  border: 1px solid #ec4899;
}

.habit-sum {
  background: linear-gradient(135deg, #5865F2, #38bdf8);
  color: white;
}

.deploy-sum {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.sum-op {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--vp-c-text-3);
}

/* Responsive */
@media (max-width: 900px) {
  .tree-branches {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .section-header h2 {
    font-size: 1.8rem;
  }
  
  .workflow-area {
  }
  
  .workflow-node {
    min-width: 100px;
    transform: scale(0.85);
  }
  
  .ai-dual-view {
    flex-direction: column;
    gap: 10px;
  }
  
  .transform-arrow {
    transform: rotate(90deg);
  }
  
  .code-window, .mock-app {
    width: 100%;
    max-width: 220px;
  }
  
  .tree-branches {
    grid-template-columns: 1fr 1fr;
  }
  
  .platform-chip {
    padding: 8px 12px;
    font-size: 0.75rem;
  }
}

@media (max-width: 500px) {
  .tree-branches {
    grid-template-columns: 1fr;
  }
  
  .workflow-area {
    height: 160px;
  }
  
  .workflow-node {
    min-width: 90px;
  }
}
</style>
