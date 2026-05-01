<script setup>
// Variant 1: Cinematic Full-screen Sticky Scene
// Quote fades in elegantly on load. Entire section is sticky until scrolled past.
// A prominent animated scroll cue ensures users know to scroll.
</script>

<template>
  <div class="qi1-wrapper" aria-label="Intro quote">
    <div class="qi1-sticky">
      <div class="qi1-content">
        <div class="qi1-line"></div>
        <blockquote class="qi1-quote">
          <p class="qi1-text">
            All our life, so far as it has definite form, is but a mass of habits.
          </p>
          <footer class="qi1-attribution">William James</footer>
        </blockquote>
        <div class="qi1-line"></div>
      </div>

      <div class="qi1-scroll-cue" aria-hidden="true">
        <span class="qi1-scroll-label">Scroll</span>
        <span class="qi1-arrow">
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="8" y1="0" x2="8" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <polyline points="2,14 8,20 14,14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Outer wrapper gives the sticky element room to scroll out */
.qi1-wrapper {
  height: 200vh;
  position: relative;
  z-index: 1;
}

/* Sticky panel takes full viewport */
.qi1-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  background: var(--vp-c-bg);
  overflow: hidden;
}

/* Soft radial glow behind text */
.qi1-sticky::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 70% 50% at 50% 50%,
    rgba(139, 92, 246, 0.08) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.qi1-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  max-width: 680px;
  width: 100%;
  animation: qi1-entrance 1.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.qi1-line {
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--home-brand-1, #8b5cf6), transparent);
  opacity: 0.6;
}

.qi1-quote {
  margin: 0;
  padding: 0;
  border: none;
  text-align: center;
}

.qi1-text {
  font-size: clamp(1.3rem, 3vw, 2rem);
  font-weight: 300;
  line-height: 1.6;
  letter-spacing: 0.01em;
  color: var(--vp-c-text-1);
  font-style: italic;
  margin: 0 0 20px;
}

.qi1-attribution {
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--home-brand-1, #8b5cf6);
  opacity: 0.85;
}

/* Scroll cue */
.qi1-scroll-cue {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--home-text-faint, rgba(15, 23, 42, 0.4));
  animation: qi1-cue-in 1s 1.6s both;
}

.qi1-scroll-label {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 500;
}

.qi1-arrow {
  animation: qi1-bounce 1.8s ease-in-out infinite;
}

/* Keyframes */
@keyframes qi1-entrance {
  from {
    opacity: 0;
    transform: translateY(32px);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes qi1-cue-in {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes qi1-bounce {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(6px); }
}
</style>
