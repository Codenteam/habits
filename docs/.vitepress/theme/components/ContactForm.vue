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

        <div v-else-if="error" class="form-error">
          <p class="error-title">Something went wrong</p>
          <p class="error-text">{{ error }}</p>
          <button type="button" class="retry-btn" @click="error = ''">Try again</button>
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

          <button type="submit" class="submit-btn" :disabled="sending || !apiConfigured || configLoading">
            <span v-if="sending || configLoading" class="btn-spinner" />
            {{ configLoading ? 'Loading...' : sending ? 'Sending...' : 'Send message' }}
          </button>

          <p v-if="!API_URL" class="config-hint">
            Contact form API is not configured for this environment.
          </p>
        </template>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (cb: () => void) => void
        execute: (siteKey: string, options: { action: string }) => Promise<string>
      }
    }
  }
}

const props = withDefaults(defineProps<{
  heading?: string
  subtext?: string
  formPurpose?: string
}>(), {
  heading: 'Ready to automate your workflows?',
  subtext: 'Every organization runs differently. Tell us about yours and we\'ll show you how Habits fits right in.',
})

const API_URL = import.meta.env.VITE_CONTACT_FORM_API_URL as string | undefined

function contactConfigUrl(submitUrl: string): string {
  if (submitUrl.includes('/api/submit-contact')) {
    return submitUrl.replace(/\/api\/submit-contact\/?$/, '/api/contact-config')
  }
  return `${submitUrl.replace(/\/$/, '')}/api/contact-config`
}

const recaptchaSiteKey = ref<string | null>(null)
const configLoading = ref(false)

const apiConfigured = computed(() => Boolean(API_URL && recaptchaSiteKey.value))

const form = reactive({ name: '', email: '', company: '', message: '' })
const sending = ref(false)
const submitted = ref(false)
const error = ref('')
const recaptchaReady = ref(false)

const resolvedFormPurpose = computed(() => {
  if (props.formPurpose) return props.formPurpose
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.replace(/\/$/, '') || '/'
    return `docs:${path}`
  }
  return 'docs:contact'
})

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (!siteKey) return Promise.resolve()
  if (window.grecaptcha?.enterprise) {
    recaptchaReady.value = true
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-recaptcha="contact-form"]')
    if (existing) {
      existing.addEventListener('load', () => { recaptchaReady.value = true; resolve() })
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.defer = true
    script.dataset.recaptcha = 'contact-form'
    script.onload = () => {
      window.grecaptcha?.enterprise?.ready(() => {
        recaptchaReady.value = true
        resolve()
      })
    }
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA'))
    document.head.appendChild(script)
  })
}

async function getRecaptchaToken(): Promise<string> {
  const siteKey = recaptchaSiteKey.value
  const enterprise = window.grecaptcha?.enterprise
  if (!siteKey || !enterprise) {
    throw new Error('reCAPTCHA is not configured')
  }
  await loadRecaptchaScript(siteKey)
  return enterprise.execute(siteKey, { action: 'contact_form' })
}

async function fetchContactConfig(): Promise<void> {
  if (!API_URL) return
  configLoading.value = true
  try {
    const response = await fetch(contactConfigUrl(API_URL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    const data = await response.json().catch(() => ({}))
    const output = data.output ?? data
    const key = output.recaptchaSiteKey
    if (!response.ok || !key) {
      throw new Error('Contact form config unavailable')
    }
    recaptchaSiteKey.value = String(key)
    await loadRecaptchaScript(recaptchaSiteKey.value)
  } catch {
    // Leave recaptchaSiteKey null; config hint shown in template
  } finally {
    configLoading.value = false
  }
}

async function submit() {
  if (!API_URL || !recaptchaSiteKey.value) {
    error.value = 'Contact form is not configured. Set VITE_CONTACT_FORM_API_URL.'
    return
  }

  sending.value = true
  error.value = ''

  try {
    const recaptchaToken = await getRecaptchaToken()

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer: window.location.href,
        recaptchaToken,
        formPurpose: resolvedFormPurpose.value,
        answers: {
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          message: form.message.trim(),
        },
      }),
    })

    const data = await response.json().catch(() => ({}))
    const output = data.output ?? data

    if (!response.ok || output.verified === false || output.verified === 'false' || (output.verified !== true && output.verified !== 'true')) {
      const errMsg = output.error || data.error || (data.status === 'failed' ? 'Submission failed' : `Request failed (${response.status})`)
      throw new Error(
        String(errMsg).includes('reCAPTCHA') ? 'reCAPTCHA verification failed. Please try again.' : String(errMsg)
      )
    }

    if (output.success === false || output.success === 'false') {
      throw new Error('Failed to deliver your message. Please try again later.')
    }

    submitted.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to send message. Please try again.'
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  fetchContactConfig()
})
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
  margin: 0 auto;
  align-items: start;
}

@media (max-width: 720px) {
  .contact-form-inner {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

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

.config-hint {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  margin: 0;
}

.form-success,
.form-error {
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

.form-error {
  border-color: color-mix(in srgb, #ef4444 35%, var(--vp-c-divider));
}

.success-icon {
  width: 32px;
  height: 32px;
  color: var(--vp-c-brand-1);
}

.success-title,
.error-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
}

.success-text,
.error-text {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin: 0;
}

.retry-btn {
  margin-top: 8px;
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  padding: 8px 16px;
  cursor: pointer;
}

.retry-btn:hover {
  border-color: var(--vp-c-brand-1);
}
</style>
