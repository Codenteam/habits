---
isComparison: true
title: Habits vs Tasker
intro: Tasker is the long-standing king of on-device Android automation — powerful, but locked to a single platform and a proprietary profile format. Habits is a cross-platform, open-source automation runtime that spans mobile, desktop, server, serverless, and edge, with workflows stored as portable YAML.

habits:
  name: Habits
  logo: /logo.png

competitor:
  name: Tasker
  logo: /logos/tasker.png

tableTitle: Feature Comparison

features:
  - name: Platforms
    icon: globe
    habits: Mobile + desktop + server + edge
    competitor: Android only
    highlight: true

  - name: License
    icon: scale
    habits: AGPL-3.0 (core) + MIT (bits)
    competitor: Proprietary (paid app)

  - name: Pricing
    icon: gem
    habits: Free / open-source
    competitor: Paid (one-time purchase)

  - name: Workflow format
    icon: file-code
    habits: YAML (portable, git-native)
    competitor: Tasker XML (proprietary)

  - name: Version control
    icon: git-branch
    habits: true
    competitor: partial

  - name: On-device / offline execution
    icon: plug
    habits: true
    competitor: true

  - name: Device & sensor access
    icon: smile
    habits: partial
    competitor: Deep Android integration

  - name: Cloud / server automations
    icon: cloud
    habits: true
    competitor: false

  - name: Serverless / edge execution
    icon: cloud
    habits: true
    competitor: false

  - name: CLI runtime
    icon: monitor
    habits: true
    competitor: false

  - name: REST API runtime
    icon: globe
    habits: true
    competitor: false

  - name: Pre-built integrations
    icon: puzzle
    habits: 200+ bits (HTTP, DB, AI, etc.)
    competitor: Android actions + plugins

  - name: Custom scripts
    icon: code
    habits: Javascript
    competitor: JavaScriptlet

  - name: AI-assisted workflow building
    icon: bot
    habits: true
    competitor: false

  - name: Community sharing
    icon: link
    habits: YAML files / npm / GitHub
    competitor: TaskerNet

heroBar:
  title: Automation that isn't trapped on one phone
  subtitle: Tasker is unbeatable for Android-only routines. Habits is what you pick when the same automation needs to run on your phone, your laptop, a Lambda, and a Raspberry Pi — with the same YAML file.
  actions:
    - text: Build your first habit
      link: /getting-started/first-habit
      type: primary
    - text: See the mobile runtime
      link: /getting-started/introduction
      type: secondary

sections:
  - title: One workflow, every surface
    icon: rocket
    type: highlight
    description: Tasker routines live and die inside the Android app. Habits workflows are plain YAML that the same runtime can execute on mobile, desktop, server, or edge — write once, run anywhere JavaScript runs.
    items:
      - icon: globe
        title: Cross-platform
        text: Mobile apps plus desktop, server, CLI, and serverless targets.
      - icon: file-code
        title: Portable format
        text: YAML diffs cleanly in git, unlike Tasker's exported XML.
      - icon: link
        title: Share as code
        text: Distribute habits via npm, GitHub, or a plain file — no vendor platform in between.

  - title: Real integrations, not just intents
    icon: plug
    type: default
    description: Tasker shines at poking Android intents and device sensors. Habits ships 200+ bits for the API-driven world — databases, LLMs, HTTP, webhooks, email, queues — so your automations can reach beyond the device.
    code: |
      nodes:
        - id: trigger
          type: bits
          data: { module: "@ha-bits/bit-webhook" }
        - id: classify
          type: bits
          data: { module: "@ha-bits/bit-openai" }
        - id: notify
          type: bits
          data: { module: "@ha-bits/bit-http" }

  - title: Open-source, forever
    icon: unlock
    type: default
    description: Tasker is a paid, closed-source app with a single maintainer bus factor. Habits is AGPL-3.0 with MIT bits — forkable, auditable, and free to ship inside your own product.
    items:
      - icon: unlock
        title: No lock-in
        text: If you don't like how Habits runs something, change it — the source is yours.
      - icon: shield
        title: Auditable security
        text: Every bit is MIT-licensed source you can read and review.

relatedLinks:
  - label: Next comparison
    title: Habits vs IFTTT
    link: /comparisons/vs-ifttt
  - label: Next comparison
    title: Habits vs n8n
    link: /comparisons/vs-n8n
  - label: Get started
    title: Build your first habit
    link: /getting-started/first-habit
---
