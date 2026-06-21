---
title: "Ecommerce & Retail Order Management"
description: "Automate order confirmations, fulfilment routing, shipping updates, delivery confirmations, return processing, and exception alerts."
aside: false
---

<script setup>
import { Tag, Zap } from 'lucide-vue-next'

const images = [
    { img: '/showcase/ecommerce-retail-order-management/1.webp', caption: 'Ecommerce & Retail Order Management' }
]

const habitTabs = [
    { label: 'order-confirmation', url: '/showcase/ecommerce-retail-order-management/order-confirmation.yaml' },
    { label: 'fulfilment-routing', url: '/showcase/ecommerce-retail-order-management/fulfilment-routing.yaml' },
    { label: 'shipping-update', url: '/showcase/ecommerce-retail-order-management/shipping-update.yaml' },
    { label: 'delivery-confirmation', url: '/showcase/ecommerce-retail-order-management/delivery-confirmation.yaml' },
    { label: 'return-processing', url: '/showcase/ecommerce-retail-order-management/return-processing.yaml' },
    { label: 'order-exception-alert', url: '/showcase/ecommerce-retail-order-management/order-exception-alert.yaml' }
]
</script>

# Ecommerce & Retail Order Management

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-intermediate">
        <span class="difficulty-dot"></span>
        Intermediate
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-ecommerce"><component :is="Tag" :size="12" /> ecommerce</span> <span class="showcase-tag tag-orders"><component :is="Tag" :size="12" /> orders</span> <span class="showcase-tag tag-automation"><component :is="Zap" :size="12" /> automation</span> <span class="showcase-tag tag-logistics"><component :is="Tag" :size="12" /> logistics</span></div>
    </div>
    
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<div class="showcase-taxonomy"><div class="taxonomy-group"><span class="taxonomy-label">Industries</span><span class="taxonomy-values"><a href="../industries/ecommerce-retail" class="taxonomy-pill">ecommerce retail</a></span></div><div class="taxonomy-group"><span class="taxonomy-label">Departments</span><span class="taxonomy-values"><a href="../industries/ecommerce-retail#order-management" class="taxonomy-pill">order management</a></span></div></div>

<p class="showcase-description">Automate order confirmations, fulfilment routing, shipping updates, delivery confirmations, return processing, and exception alerts.</p>

A collection of habits that keep every order moving smoothly: from placement through to return. Each habit operates independently and can be deployed individually or as a complete order management automation suite.

## What It Does

- **Order Confirmation**: send personalised order confirmations with estimated delivery
- **Fulfilment Routing**: route orders to the optimal warehouse based on stock and location
- **Shipping Update**: send real-time shipping updates at each carrier milestone
- **Delivery Confirmation**: confirm delivery and trigger a review request
- **Return Processing**: initiate return labels, track receipt, and trigger refund
- **Order Exception Alert**: alert the ops team when orders are delayed or stuck


<div class="habits-grid">
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Order Confirmation</h3>
      <span class="trigger-badge trigger-webhook">Webhook</span>
    </div>
    <p class="habit-description">Send personalised order confirmations with itemised details and estimated delivery date.</p>
    <div class="bit-list"><span class="bit-badge">webhook</span><span class="bit-badge">email</span><span class="bit-badge">sms</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Fulfilment Routing</h3>
      <span class="trigger-badge trigger-webhook">Webhook</span>
    </div>
    <p class="habit-description">Route each order to the optimal warehouse based on real-time stock levels and customer location.</p>
    <div class="bit-list"><span class="bit-badge">webhook</span><span class="bit-badge">http</span><span class="bit-badge">scheduler</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Shipping Update</h3>
      <span class="trigger-badge trigger-webhook">Webhook</span>
    </div>
    <p class="habit-description">Send real-time shipping updates to customers at each carrier tracking milestone.</p>
    <div class="bit-list"><span class="bit-badge">webhook</span><span class="bit-badge">email</span><span class="bit-badge">sms</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Delivery Confirmation</h3>
      <span class="trigger-badge trigger-webhook">Webhook</span>
    </div>
    <p class="habit-description">Confirm delivery to the customer and trigger a product review request 24 hours later.</p>
    <div class="bit-list"><span class="bit-badge">webhook</span><span class="bit-badge">email</span><span class="bit-badge">scheduler</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Return Processing</h3>
      <span class="trigger-badge trigger-webhook">Webhook</span>
    </div>
    <p class="habit-description">Issue return labels automatically, track item receipt, and trigger the refund on confirmation.</p>
    <div class="bit-list"><span class="bit-badge">webhook</span><span class="bit-badge">email</span><span class="bit-badge">http</span></div>
  </div>
  <div class="habit-card">
    <div class="habit-header">
      <h3 class="habit-name">Order Exception Alert</h3>
      <span class="trigger-badge trigger-scheduler">Scheduled</span>
    </div>
    <p class="habit-description">Detect delayed or stuck orders and alert the operations team with full order context.</p>
    <div class="bit-list"><span class="bit-badge">scheduler</span><span class="bit-badge">slack</span><span class="bit-badge">email</span></div>
  </div>
</div>



<hr style="clear:both;">

## Run Your .habit File

<Checklist name="dot-habit/mobile" title="Run on Mobile" icon="smartphone">

<!--@include: ../getting-started/checklists/dot-habit/mobile.md{3,}-->

</Checklist>

<Checklist name="dot-habit/desktop" title="Run on Desktop" icon="monitor">

<!--@include: ../getting-started/checklists/dot-habit/desktop.md{3,}-->

</Checklist>

<Checklist name="dot-habit/server" title="Run on Server" icon="server">

<!--@include: ../getting-started/checklists/dot-habit/server.md{3,}-->

</Checklist>

<Checklist name="dot-habit/serverless" title="Run Serverless" icon="cloud">

<!--@include: ../getting-started/checklists/dot-habit/serverless.md{3,}-->

</Checklist>

## Workflow Visualization

<HabitViewerTabs :tabs="habitTabs" :height="450" />


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
