---
title: "Healthcare Patient Management"
description: "Automate appointment reminders, discharge summaries, readmission alerts, referral coordination, and patient satisfaction surveys."
aside: false
---

<script setup>
import { Tag, Zap, Brain } from 'lucide-vue-next'

const images = [
    { img: '/showcase/healthcare-patient-management/1.webp', caption: 'Healthcare Patient Management' }
]
</script>

# Healthcare Patient Management

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-intermediate">
        <span class="difficulty-dot"></span>
        Intermediate
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-healthcare"><component :is="Tag" :size="12" /> healthcare</span> <span class="showcase-tag tag-automation"><component :is="Zap" :size="12" /> automation</span> <span class="showcase-tag tag-scheduling"><component :is="Tag" :size="12" /> scheduling</span> <span class="showcase-tag tag-ai"><component :is="Brain" :size="12" /> ai</span></div>
    </div>
    
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<div class="showcase-taxonomy"><div class="taxonomy-group"><span class="taxonomy-label">Industries</span><span class="taxonomy-values"><a href="../industries/healthcare" class="taxonomy-pill">healthcare</a></span></div><div class="taxonomy-group"><span class="taxonomy-label">Departments</span><span class="taxonomy-values"><a href="../industries/healthcare#patient-management" class="taxonomy-pill">patient management</a></span></div></div>

<p class="showcase-description">Automate appointment reminders, discharge summaries, readmission alerts, referral coordination, and patient satisfaction surveys.</p>

A collection of habits that cover the full patient journey, from appointment booking
to post-discharge follow-up. Each habit operates independently and can be deployed
individually or as a complete patient management automation suite.

## What It Does

- **Appointment Reminder**: automated SMS and email reminders before each appointment
- **Discharge Summary**: AI-assisted discharge notes delivered to patient and GP
- **Readmission Risk Alert**: flag high-risk patients before they re-present
- **Referral Coordination**: route specialist referrals and track acknowledgement
- **Patient Satisfaction Survey**: send and analyse post-visit surveys automatically
- **No-Show Follow-up**: re-engage patients who missed their appointment


<div class="habits-grid">
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Appointment Reminder</h3>
      <span class="trigger-badge trigger-scheduler">Scheduled</span>
    </div>
    <p class="habit-description">Send automated SMS and email reminders to patients before each scheduled appointment.</p>
    <div class="bit-list"><span class="bit-badge">email</span><span class="bit-badge">sms</span><span class="bit-badge">scheduler</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Discharge Summary</h3>
      <span class="trigger-badge trigger-webhook">Webhook</span>
    </div>
    <p class="habit-description">Generate AI-assisted discharge notes and deliver them to the patient and their GP.</p>
    <div class="bit-list"><span class="bit-badge">ai</span><span class="bit-badge">email</span><span class="bit-badge">webhook</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Readmission Risk Alert</h3>
      <span class="trigger-badge trigger-scheduler">Scheduled</span>
    </div>
    <p class="habit-description">Flag high-risk patients before they re-present using outcome data and AI scoring.</p>
    <div class="bit-list"><span class="bit-badge">ai</span><span class="bit-badge">scheduler</span><span class="bit-badge">slack</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Referral Coordination</h3>
      <span class="trigger-badge trigger-webhook">Webhook</span>
    </div>
    <p class="habit-description">Route specialist referrals automatically and track acknowledgement status.</p>
    <div class="bit-list"><span class="bit-badge">email</span><span class="bit-badge">webhook</span><span class="bit-badge">http</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Patient Satisfaction Survey</h3>
      <span class="trigger-badge trigger-scheduler">Scheduled</span>
    </div>
    <p class="habit-description">Send post-visit surveys and automatically analyse responses with AI.</p>
    <div class="bit-list"><span class="bit-badge">email</span><span class="bit-badge">ai</span><span class="bit-badge">scheduler</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">No-Show Follow-up</h3>
      <span class="trigger-badge trigger-scheduler">Scheduled</span>
    </div>
    <p class="habit-description">Re-engage patients who missed their appointment with a personalised follow-up message.</p>
    <div class="bit-list"><span class="bit-badge">email</span><span class="bit-badge">sms</span><span class="bit-badge">scheduler</span></div>
  </div>
</div>


## Key Files

::: code-group
<<< @/../showcase/healthcare-patient-management/stack.yaml [stack.yaml]
:::


<div class="showcase-notice"><p class="showcase-notice-title">Tailored to your systems & workflows</p><p class="showcase-notice-text">Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows.</p></div>

<ContactForm
  heading="Want this habit running in your environment?"
  subtext="This habit is a starting point. Tell us about your stack and we'll help you get it working exactly the way your team needs."
/>

<style>
.showcase-header {
  margin: 20px 0 28px;
}

.showcase-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-right {
  flex-shrink: 0;
}

.meta-divider {
  width: 1px;
  height: 20px;
  background: var(--vp-c-divider);
}

.difficulty-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 500;
  letter-spacing: 0.01em;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
}

.difficulty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.difficulty-beginner .difficulty-dot {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.difficulty-intermediate .difficulty-dot {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.difficulty-advanced .difficulty-dot {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.showcase-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 0.75em;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  transition: all 0.15s ease;
}

.showcase-tag:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.showcase-tag svg {
  opacity: 0.7;
}

.showcase-description {
  font-size: 1.1em;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0 0 24px;
}

.showcase-taxonomy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0 20px;
}

.taxonomy-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.taxonomy-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--vp-c-text-3);
  min-width: 90px;
}

.taxonomy-values {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.taxonomy-pill {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  text-transform: capitalize;
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
}

a.taxonomy-pill:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.showcase-notice {
  margin: 24px 0;
  padding: 16px 18px;
  background: color-mix(in srgb, var(--vp-c-brand-1) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
  border-radius: 10px;
}

.showcase-notice-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 4px;
}

.showcase-notice-text {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.55;
  margin: 0;
}

.habits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin: 24px 0;
  clear: both;
}

.habit-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.2s;
}

.habit-card:hover {
  border-color: var(--vp-c-brand-2);
}

.habit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.habit-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.4;
  margin: 0;
  border: none;
  padding: 0;
}

.habit-description {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

.bit-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.bit-badge {
  font-size: 0.68rem;
  font-family: var(--vp-font-family-mono);
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(100, 150, 255, 0.08);
  color: var(--vp-c-brand-1);
  border: 1px solid rgba(100, 150, 255, 0.2);
  white-space: nowrap;
}

.trigger-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
}

.trigger-scheduler {
  background: rgba(124, 58, 237, 0.15);
  color: #a78bfa;
  border: 1px solid rgba(124, 58, 237, 0.3);
}

.trigger-webhook {
  background: rgba(37, 99, 235, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(37, 99, 235, 0.3);
}

.trigger-email {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.trigger-manual {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.gallery-container {
  float: right;
  width: 400px;
  margin-left: 24px;
  margin-bottom: 16px;
}

.vp-doc h2 {
  border-top-width: 0;
}

@media (max-width: 768px) {
  .showcase-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .meta-divider {
    display: none;
  }
  
  .gallery-container {
    float: none;
    width: 100%;
    margin: 0 0 20px;
  }
}
</style>
