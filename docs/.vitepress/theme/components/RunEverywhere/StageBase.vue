<template>
  <div class="vis-base">
    <div class="window">
      <div class="title-bar">
        <span class="b r"></span><span class="b y"></span><span class="b g"></span>
        <span class="t">Habits Base, visual builder</span>
      </div>
      <div class="canvas">
        <svg viewBox="0 0 400 220" class="nodes-svg">
          <defs>
            <linearGradient id="edge-g"><stop offset="0%" stop-color="#5865F2"/><stop offset="100%" stop-color="#43e97b"/></linearGradient>
          </defs>
          <!-- edges -->
          <path d="M 86 60 C 130 60, 130 110, 174 110" stroke="url(#edge-g)" stroke-width="2.5" fill="none" />
          <path d="M 86 160 C 130 160, 130 110, 174 110" stroke="url(#edge-g)" stroke-width="2.5" fill="none" />
          <path d="M 252 110 C 290 110, 290 90, 322 90" stroke="url(#edge-g)" stroke-width="2.5" fill="none" />
          <!-- nodes -->
          <g><rect x="20" y="40" width="68" height="40" rx="6" fill="#5865F2"/><text x="54" y="64" text-anchor="middle" fill="white" font-size="11" font-weight="700">Trigger</text></g>
          <g><rect x="20" y="140" width="68" height="40" rx="6" fill="#38bdf8"/><text x="54" y="164" text-anchor="middle" fill="white" font-size="11" font-weight="700">Input</text></g>
          <g><rect x="174" y="92" width="78" height="40" rx="6" fill="#43e97b"/><text x="213" y="116" text-anchor="middle" fill="white" font-size="11" font-weight="700">AI Agent</text></g>
          <g><rect x="322" y="72" width="58" height="40" rx="6" fill="#fbbf24"/><text x="351" y="96" text-anchor="middle" fill="#0f172a" font-size="11" font-weight="700">Output</text></g>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vis-base { width: 100%; height: 100%; }
.window {
  width: 100%;
  background: #0a0e1a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.04);
}
.title-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 14px;
  background: linear-gradient(180deg, #1e293b, #131b2c);
  border-bottom: 1px solid #334155;
}
.title-bar .b { width: 11px; height: 11px; border-radius: 50%; }
.b.r { background: #ef4444; } .b.y { background: #f59e0b; } .b.g { background: #22c55e; }
.title-bar .t { margin-left: 12px; font-size: 0.78rem; color: #94a3b8; font-family: 'Monaco', monospace; font-weight: 600; }
.canvas {
  background: #0d1117;
  background-image: radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0);
  background-size: 14px 14px;
  padding: 14px;
}
.nodes-svg { display: block; width: 100%; height: auto; }
</style>
