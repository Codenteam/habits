<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-header">
        <div class="register-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <h1 class="register-title">Request a Private Base Instance</h1>
        <p class="register-sub">
          Get your own hosted environment to run habits on the public server.
          Fill in the form and we'll get back to you with your private instance details.
        </p>
      </div>

      <div v-if="submitted" class="success-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="success-icon">
          <circle cx="12" cy="12" r="10" />
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p class="success-title">Request received</p>
        <p class="success-text">We'll reach out to you shortly with your private instance details.</p>
      </div>

      <form v-else class="register-form" @submit.prevent="submit">
        <div class="form-row">
          <div class="form-field">
            <label class="field-label">Name <span class="required">*</span></label>
            <input v-model="form.name" type="text" class="field-input" placeholder="Your full name" required />
          </div>
          <div class="form-field">
            <label class="field-label">Email <span class="required">*</span></label>
            <input v-model="form.email" type="email" class="field-input" placeholder="you@company.com" required />
          </div>
        </div>

        <div class="form-field">
          <label class="field-label">Company / Organization</label>
          <input v-model="form.company" type="text" class="field-input" placeholder="Your company or organization" />
        </div>

        <div class="form-field">
          <label class="field-label">Use Case <span class="required">*</span></label>
          <textarea v-model="form.useCase" class="field-textarea" rows="4" placeholder="Describe what you want to automate or run on your private instance..." required />
        </div>

        <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

        <button type="submit" class="submit-btn" :disabled="sending">
          <span v-if="sending" class="btn-spinner" />
          {{ sending ? 'Sending...' : 'Request Private Instance' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const form = reactive({ name: '', email: '', company: '', useCase: '' })
const sending = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

async function submit() {
  sending.value = true
  errorMsg.value = ''
  try {
    const payload = {
      type: 'register-hub',
      name: form.name,
      email: form.email,
      company: form.company,
      useCase: form.useCase,
    }
    const res = await fetch('https://forms.codenteam.com/api/register-hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Server error: ${res.status}`)
    submitted.value = true
  } catch (err: any) {
    errorMsg.value = err?.message || 'Something went wrong. Please try again.'
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.register-page {
  padding: 48px 24px 80px;
  display: flex;
  justify-content: center;
}

.register-container {
  width: 100%;
  max-width: 600px;
}

.register-header {
  text-align: center;
  margin-bottom: 40px;
}

.register-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  margin-bottom: 20px;
}

.register-icon svg {
  width: 28px;
  height: 28px;
}

.register-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin-bottom: 12px;
  color: var(--vp-c-text-1);
}

.register-sub {
  font-size: 1rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  max-width: 480px;
  margin: 0 auto;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 32px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 520px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.required {
  color: var(--vp-c-danger-1, #f66);
}

.field-input,
.field-textarea {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
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
  min-height: 100px;
}

.error-banner {
  background: var(--vp-c-danger-soft, rgba(246,102,102,0.1));
  color: var(--vp-c-danger-1, #f66);
  border: 1px solid var(--vp-c-danger-1, #f66);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.9rem;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white, #fff);
  border: none;
  border-radius: 10px;
  padding: 13px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  margin-top: 4px;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 48px 32px;
}

.success-icon {
  width: 48px;
  height: 48px;
  color: var(--vp-c-brand-1);
}

.success-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.success-text {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
}
</style>
