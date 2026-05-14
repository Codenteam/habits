<template>
  <div class="contact-form-wrapper">
    <div class="contact-form-inner">
      <div class="contact-form-left">
        <p class="contact-eyebrow">Get in touch</p>
        <h2 class="contact-heading">{{ heading }}</h2>
        <p class="contact-sub">{{ subtext }}</p>
      </div>

      <form class="contact-form" @submit.prevent="submit">
        <div v-if="submitted" class="form-success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="success-icon">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p class="success-title">Message sent</p>
          <p class="success-text">We'll be in touch shortly.</p>
        </div>

        <template v-else>
          <div class="form-row">
            <div class="form-field">
              <label class="field-label">Name</label>
              <input v-model="form.name" type="text" class="field-input" placeholder="Your name" required />
            </div>
            <div class="form-field">
              <label class="field-label">Email</label>
              <input v-model="form.email" type="email" class="field-input" placeholder="you@company.com" required />
            </div>
          </div>

          <div class="form-field">
            <label class="field-label">Company</label>
            <input v-model="form.company" type="text" class="field-input" placeholder="Your company or organization" />
          </div>

          <div class="form-field">
            <label class="field-label">Message</label>
            <textarea v-model="form.message" class="field-textarea" rows="4" placeholder="Tell us about your use case or what you'd like to automate..." required />
          </div>

          <button type="submit" class="submit-btn" :disabled="sending">
            <span v-if="sending" class="btn-spinner" />
            {{ sending ? 'Sending...' : 'Send message' }}
          </button>
        </template>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const props = withDefaults(defineProps<{
  heading?: string
  subtext?: string
}>(), {
  heading: 'Ready to automate your workflows?',
  subtext: 'Every organization runs differently. Tell us about yours and we\'ll show you how Habits fits right in.',
})

const form = reactive({ name: '', email: '', company: '', message: '' })
const sending = ref(false)
const submitted = ref(false)

async function submit() {
  sending.value = true
  // Encode as mailto for now, replace with your endpoint when ready
  await new Promise(r => setTimeout(r, 600))
  sending.value = false
  submitted.value = true
}
</script>

<style scoped>
.contact-form-wrapper {
  margin-top: 64px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 48px;
}

.contact-form-inner {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 48px;
  /* max-width: 900px; */
  margin: 0 auto;
  align-items: start;
}

@media (max-width: 720px) {
  .contact-form-inner {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

/* Left column */
.contact-eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--vp-c-brand-1);
  margin: 0 0 10px;
}

.contact-heading {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 12px;
  line-height: 1.3;
  border: none;
  padding: 0;
}

.contact-sub {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  line-height: 1.65;
  margin: 0;
}

/* Form */
.contact-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 520px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.field-input,
.field-textarea {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  color: var(--vp-c-text-1);
  font-size: 0.88rem;
  padding: 9px 12px;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.field-input:focus,
.field-textarea:focus {
  border-color: var(--vp-c-brand-1);
}

.field-textarea {
  resize: vertical;
  min-height: 96px;
}

.submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 10px 22px;
  cursor: pointer;
  transition: opacity 0.15s;
  align-self: flex-start;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Success state */
.form-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  text-align: center;
}

.success-icon {
  width: 32px;
  height: 32px;
  color: var(--vp-c-brand-1);
}

.success-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
}

.success-text {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin: 0;
}
</style>
