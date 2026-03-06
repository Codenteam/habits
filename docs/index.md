---
layout: habits-home
---
## See Base in action
<ClientOnly>
  <iframe 
    height="600" 
    src="https://www.youtube.com/embed/uhim-Y7b1vA" 
    title="YouTube video player" 
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    style="margin: auto; max-width: 80vw; width: 900px;"
    allowfullscreen>
  </iframe>
</ClientOnly>

## Quick Example
<!-- components-horizontal.md -->
<div class="vertical-tabs">

::::tabs
=== Architecture
### Steps to build a habit

<!--@include: ./diagrams/components-horizontal.md-->
=== Create
Install habits if not yet installed:
```bash
# Install habits globally
curl -o- https://codenteam.com/intersect/habits/install.sh | bash

```

## Option 1: Using WaC/AaC files
Create a project folder with the following structure:

```
my-automation/
├── .env
├── stack.yaml
└── habit.yaml
└── frontend/
    └── index.html
```

::: code-group

<<< @/../examples/mixed/.env.example [.env]

<<< @/../examples/mixed/stack.yaml [stack.yaml]

<<< @/../examples/mixed/habit.yaml [habit.yaml]

<<< @/../examples/mixed/frontend/index.html [frontend/index.html]

:::

## Option 2: Using UI
You can either build using base by running: 
```bash
habits base

```
Once done, export.

=== Run

## Run the Server

If you have habits installed globally:
```bash
habits cortex --config ./stack.yaml
```

If you have habits installed using npx:
```bash
npx habits@latest cortex --config ./stack.yaml
```

If you want to use cortex:
```bash
npx @ha-bits/cortex@latest server --config ./stack.yaml
```
Then call your workflow:

```bash
curl -X POST http://localhost:3000/api/text-to-audio
```

=== Frontend/UI

This is the bundled UI, generated using Base.
<img src="/images/mixed-frontend.webp" alt="Frontend UI" height=200/>



::::

</div>

## Screenshots

<script setup>
const screenshots = [
  { img: '/images/base.webp', caption: 'Habits Base (Automation Builder)', link: '/getting-started/introduction#habits-base-screenshot' },
  { img: '/images/base-frontend.webp', caption: 'Habits Base UI Editor (Automation Frontend Builder)', link: '/getting-started/introduction#habits-base-frontend-screenshot' },
  { img: '/images/cortex.webp', caption: 'Cortex Engine', link: '/deep-dive/running#cortex-engine-screenshot' },
  { img: '/images/mixed.webp', caption: 'Mix bits, n8n, ActivePieces and scripts', link: '/examples/mixed#mixed-frameworks-screenshot' },
  { img: '/images/swagger.webp', caption: 'OpenAPI Swagger', link: '/deep-dive/running#swagger-screenshot' },
  { img: '/images/mixed-frontend.webp', caption: 'Text to Audio Example', link: '/examples/mixed#text-to-audio-screenshot' },
  { img: '/images/blog-clone.webp', caption: 'Simple CMS built with Habits', link: '/examples/minimal-blog#minimal-blog-screenshot' },
  { img: '/images/marketing-campaign.webp', caption: 'Marketing Campaign', link: '/examples/marketing-campaign' },
]
</script>

<ScreenshotGallery :screenshots="screenshots" layout="grid" />

## Options

<div class="pricing-table">
  <table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>
          <div class="plan-header">
            <span class="plan-name">Free </span>
            <span class="plan-price">Open Source</span>
            <span class="plan-desc">Apache 2.0 License</span>
          </div>
        </th>
        <th>
          <div class="plan-header enterprise">
            <span class="plan-name">Enterprise</span>
            <span class="plan-price">Contact Us</span>
            <span class="plan-desc">Still Open Source</span>
          </div>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Core Framework</td>
        <td>✅ Full Access</td>
        <td>✅ Full Access</td>
      </tr>
      <tr>
        <td>Built-in Bits</td>
        <td>✅ All Included</td>
        <td>✅ All Included</td>
      </tr>
      <tr>
        <td>Habits Base (Visual Builder)</td>
        <td>✅ Included</td>
        <td>✅ Included</td>
      </tr>
      <tr>
        <td>Self-Hosting</td>
        <td>✅ Unlimited</td>
        <td>✅ Unlimited</td>
      </tr>
      <tr>
        <td>Community Support</td>
        <td>✅ GitHub Issues</td>
        <td>✅ GitHub Issues</td>
      </tr>
      <tr class="highlight">
        <td>Custom Bits Development</td>
        <td>❌</td>
        <td>✅ Tailored to your needs</td>
      </tr>
      <tr class="highlight">
        <td>Custom Pipelines & Workflows</td>
        <td>❌</td>
        <td>✅ Pre-built for your use case</td>
      </tr>
      <tr class="highlight">
        <td>White-Label UI</td>
        <td>❌</td>
        <td>✅ Your branding</td>
      </tr>
      <tr class="highlight">
        <td>Integration Consulting</td>
        <td>❌</td>
        <td>✅ Expert guidance</td>
      </tr>
      <tr class="highlight">
        <td>Priority Support</td>
        <td>❌</td>
        <td>✅ Dedicated team</td>
      </tr>
      <tr class="highlight">
        <td>Training & Onboarding</td>
        <td>❌</td>
        <td>✅ Hands-on sessions</td>
      </tr>
      <tr class="highlight">
        <td>SLA & Guaranteed Response</td>
        <td>❌</td>
        <td>✅ 24h response time</td>
      </tr>
    </tbody>
  </table>
  <div class="pricing-cta">
    <a href="https://github.com/codenteam/habits" class="cta-button free">Open-source</a>
    <a href="mailto:enterprise@codenteam.com" class="cta-button enterprise">Contact Enterprise</a>
  </div>
</div>

<style>
.pricing-table {
  margin: 2rem 0;
  overflow-x: auto;
}
.pricing-table table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
  display: table;
}
.pricing-table th, .pricing-table td {
  padding: 1rem;
  text-align: center;
  border: 1px solid var(--vp-c-divider);
}
.pricing-table th:first-child, .pricing-table td:first-child {
  text-align: left;
  font-weight: 500;
}
.pricing-table thead th {
  background: var(--vp-c-bg-soft);
}
.plan-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.plan-name {
  font-size: 1.1rem;
  font-weight: 600;
}
.plan-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.plan-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.plan-header.enterprise .plan-price {
  color: var(--vp-c-brand-2);
}
.pricing-table tbody tr:hover {
  background: var(--vp-c-bg-soft);
}
.pricing-table tbody tr.highlight td:first-child {
  font-weight: 600;
}
.pricing-cta {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}
.cta-button {
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.cta-button.free {
  background: var(--vp-c-brand-1);
  color: white;
}
.cta-button.enterprise {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 2px solid var(--vp-c-brand-1);
}
</style>

<footer class="home-footer">
  <p>
    <a href="https://github.com/codenteam/habits" target="_blank">GitHub</a> · 
    <a href="https://codenteam.com/intersect/habits">Documentation</a> · 
    By <a href="https://codenteam.com" target="_blank">Codenteam</a>
  </p>
  <p class="copyright">© 2024-2026 Codenteam. Licensed under Apache 2.0</p>
</footer>

<style>
.home-footer {
  text-align: center;
  padding: 2rem 0;
  margin-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.home-footer a {
  color: var(--vp-c-brand-1);
}
.home-footer .copyright {
  font-size: 0.85em;
  margin-top: 0.5rem;
}
</style>