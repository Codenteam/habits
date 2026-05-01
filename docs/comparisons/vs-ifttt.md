---
isComparison: true
title: Habits vs IFTTT
intro: IFTTT is a consumer-focused cloud service for connecting apps and smart-home devices through simple "if this, then that" applets. Habits is a developer-grade, self-hostable automation runtime, open-source, scriptable, and capable of logic far beyond one-trigger-one-action.

habits:
  name: Habits
  logo: /logo.png

competitor:
  name: IFTTT
  logo: /logos/ifttt.svg

tableTitle: Feature Comparison

features:
  - name: Hosting model
    icon: home
    habits: Self-hosted / embedded
    competitor: Cloud-only (SaaS)
    highlight: true

  - name: License
    icon: scale
    habits: AGPL-3.0 (core) + MIT (bits)
    competitor: Proprietary

  - name: Pricing
    icon: gem
    habits: Free / open-source
    competitor: Free tier + Pro subscription

  - name: Data ownership
    icon: lock
    habits: Stays on your infrastructure
    competitor: Routed through IFTTT cloud

  - name: Workflow complexity
    icon: git-branch
    habits: Multi-step, branching, conditional
    competitor: Single trigger → actions

  - name: Custom code / scripts
    icon: code
    habits: Deno/TypeScript inline
    competitor: Filter code (JS, limited)

  - name: Offline execution
    icon: plug
    habits: true
    competitor: false

  - name: Smart-home / IoT integrations
    icon: plug
    habits: Via HTTP / MQTT / custom bits
    competitor: Huge native catalog

  - name: Mobile apps
    icon: smile
    habits: true
    competitor: true

  - name: Developer API / REST runtime
    icon: globe
    habits: true
    competitor: partial

  - name: Version-controlled workflows
    icon: git-branch
    habits: YAML in git
    competitor: false

  - name: CLI execution
    icon: monitor
    habits: true
    competitor: false

  - name: Pre-built integrations
    icon: puzzle
    habits: 200+ bits (open-source)
    competitor: 900+ services (proprietary)

  - name: AI-assisted workflow building
    icon: bot
    habits: true
    competitor: partial

heroBar:
  title: When "if this, then that" isn't enough
  subtitle: IFTTT is great for flipping a smart bulb when the sun sets. Habits is what you pick when the "then" needs branching logic, custom code, a database write, an AI call, or to run without ever leaving your own infrastructure.
  actions:
    - text: Build your first habit
      link: /getting-started/first-habit
      type: primary
    - text: Why Habits?
      link: /getting-started/motivation
      type: secondary

sections:
  - title: Your data, your runtime
    icon: shield
    type: highlight
    description: IFTTT routes every trigger and action through its cloud. Habits executes on infrastructure you own, a VPS, a container, a serverless function, or an edge device, so sensitive data never leaves your boundary.
    items:
      - icon: home
        title: Self-host anywhere
        text: Run the Cortex runtime on your own server, laptop, or edge device.
      - icon: lock
        title: Built-in DLP / PII protection
        text: First-class guardrails for redacting sensitive fields before they hit third-party APIs.
      - icon: unlock
        title: No vendor lock-in
        text: Workflows are YAML files, portable across machines and providers.

  - title: Real logic, not just applets
    icon: brain
    type: default
    description: IFTTT applets are one-trigger-one-chain. Habits gives you conditional branches, loops, retries, parallel nodes, and inline scripts, the full shape of a real automation.
    code: |
      nodes:
        - id: new-email
          type: bits
          data: { module: "@ha-bits/bit-gmail" }
        - id: is-invoice
          type: script
          data:
            params:
              language: typescript
              code: |
                return input.subject.toLowerCase().includes("invoice")
        - id: extract
          type: bits
          data: { module: "@ha-bits/bit-openai" }
        - id: store
          type: bits
          data: { module: "@ha-bits/bit-database" }

  - title: Free and open-source
    icon: unlock
    type: default
    description: No Pro tier, no applet cap, no per-action pricing. Habits core is AGPL-3.0 and every integration (bit) is MIT, use it personally, commercially, or ship it inside a product.
    items:
      - icon: zap
        title: Unlimited workflows
        text: No paywalls on "multi-step" or "advanced" features.
      - icon: trophy
        title: Commercial use allowed
        text: Ship Habits-powered automations to customers under the standard OSS terms.

relatedLinks:
  - label: Next comparison
    title: Habits vs Tasker
    link: /comparisons/vs-tasker
  - label: Next comparison
    title: Habits vs n8n
    link: /comparisons/vs-n8n
  - label: Get started
    title: Build your first habit
    link: /getting-started/first-habit
---
