<script setup>
const serverCmd = `$ habits cortex --config ./stack.habit --port 8080
✓ cortex 1.0 started
✓ loaded 3 habits
✓ listening on :8080
[14:02:10] habit ready · /api/hello
[14:02:11] habit ready · /api/cron`
</script>

<template>
  <div class="vis-server">
    <div class="window dark">
      <div class="title-bar dark">
        <span class="b r"></span><span class="b y"></span><span class="b g"></span>
        <span class="t">~, habits cortex</span>
      </div>
      <pre class="terminal">{{ serverCmd }}</pre>
    </div>
  </div>
</template>

<style scoped>
.vis-server { width: 100%; height: 100%; }
.window {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15,23,42,0.04);
}
.window.dark { background: #0a0e1a; border: 1px solid #1e293b; }
.title-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 14px;
  border-bottom: 1px solid #cbd5e1;
}
.title-bar.dark { background: linear-gradient(180deg, #1e293b, #131b2c); border-color: #334155; }
.title-bar .b { width: 11px; height: 11px; border-radius: 50%; }
.b.r { background: #ef4444; } .b.y { background: #f59e0b; } .b.g { background: #22c55e; }
.title-bar .t { margin-left: 12px; font-size: 0.78rem; font-family: 'Monaco', monospace; font-weight: 600; }
.title-bar.dark .t { color: #94a3b8; }
.terminal {
  margin: 0; padding: 18px;
  font-family: 'Monaco', monospace;
  font-size: 0.78rem;
  color: #cbd5e1;
  background: #0a0e1a;
  line-height: 1.7;
  overflow: auto;
  max-height: 320px;
  white-space: pre-wrap;
}
</style>
