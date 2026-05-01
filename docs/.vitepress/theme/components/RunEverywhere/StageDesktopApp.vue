<template>
  <div class="vis-desktop">
    <img src="/images/home-mac.png" alt="Habits on Mac" class="mac-img" />
  </div>
</template>

<style scoped>
.vis-desktop {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.mac-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  border-radius: 8px;
}
</style>

<style scoped>
.vis-desktop { width: 100%; height: 100%; position: relative; }
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
.app-body { display: grid; grid-template-columns: 90px 1fr; min-height: 220px; }
.app-side { background: #0d1117; border-right: 1px solid #1e293b; padding: 10px 0; }
.side-row {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  font-size: 0.72rem;
  color: #64748b;
  border-left: 3px solid transparent;
}
.side-row.active { color: #5865F2; background: #131b2c; border-left-color: #5865F2; font-weight: 700; }
.side-row .dot { width: 6px; height: 6px; background: #43e97b; border-radius: 50%; }
.app-main { padding: 14px 18px; }
.app-status { font-family: 'Monaco', monospace; font-size: 0.75rem; color: #43e97b; font-weight: 800; margin-bottom: 8px; }
.app-graph { background: #0d1117; padding: 6px; border-radius: 4px; margin-bottom: 12px; }
.app-graph svg { width: 100%; height: 50px; display: block; }
.app-rows { display: flex; flex-direction: column; gap: 5px; }
.app-row { display: flex; justify-content: space-between; font-family: 'Monaco', monospace; font-size: 0.72rem; color: #94a3b8; }
.app-row .ok { color: #43e97b; font-weight: 800; }
</style>
