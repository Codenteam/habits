<template>
  <div class="vis-mobile">
    <img src="/images/open-habit-android.svg" alt="Habits on Android" class="android-img" />
  </div>
</template>

<style scoped>
.vis-mobile {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.android-img {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
  display: block;
}
</style>

<style scoped>
.vis-mobile { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
.phone {
  width: 200px;
  background: #0f172a;
  border-radius: 30px;
  padding: 8px;
  position: relative;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.3), inset 0 0 0 2px #1e293b;
}
.notch { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 70px; height: 18px; background: #0f172a; border-radius: 0 0 12px 12px; z-index: 2; }
.screen { background: linear-gradient(180deg, #ffffff, #f1f5f9); border-radius: 22px; padding: 28px 14px 14px; min-height: 260px; }
.status-bar { display: flex; justify-content: space-between; font-size: 0.6rem; font-weight: 700; color: #1e293b; margin-bottom: 10px; }
.phone-title { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
.phone-cards { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.phone-card { background: white; border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.phone-card.on { border-left: 3px solid #43e97b; }
.pc-name { font-size: 0.72rem; font-weight: 700; color: #1e293b; }
.pc-state { font-size: 0.65rem; color: #64748b; font-family: 'Monaco', monospace; }
.phone-card.on .pc-state { color: #43e97b; font-weight: 800; }
.phone-tabs { display: flex; justify-content: space-around; border-top: 1px solid #cbd5e1; padding-top: 10px; }
.tab { font-size: 0.62rem; color: #94a3b8; font-weight: 700; }
.tab.active { color: #5865F2; }
.home-bar { width: 100px; height: 4px; background: white; opacity: 0.8; margin: 8px auto 0; border-radius: 999px; }
</style>
