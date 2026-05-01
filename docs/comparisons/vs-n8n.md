---
isComparison: true
title: Habits vs n8n
intro: Both Habits and n8n are self-hostable workflow automation tools. Habits is a lightweight, AGPL-3.0 runtime built for edge, serverless, and embedded deployments, while n8n is a full-featured, fair-code licensed platform with a managed cloud offering.

habits:
  name: Habits
  logo: /logo.png

competitor:
  name: n8n
  logo: /logos/n8n.svg

tableTitle: Feature Comparison

features:
  - name: License
    icon: scale
    habits: AGPL-3.0 (core) + MIT (bits)
    competitor: Sustainable Use (fair-code)
    highlight: true

  - name: Self-hostable
    icon: home
    habits: true
    competitor: true

  - name: Workflow format
    icon: file-code
    habits: YAML (git-friendly)
    competitor: JSON (DB-stored)

  - name: Visual builder
    icon: mouse-pointer
    habits: partial
    competitor: true

  - name: Custom code nodes
    icon: code
    habits: Deno/TypeScript
    competitor: JavaScript/Python

  - name: Edge & serverless deploy
    icon: cloud
    habits: true
    competitor: false

  - name: Decentralized execution
    icon: git-branch
    habits: true
    competitor: false

  - name: Pack to standalone app
    icon: package
    habits: true
    competitor: false

  - name: Pre-built integrations
    icon: plug
    habits: 200+ bits (being open-sourced)
    competitor: 400+ nodes

  - name: CLI execution
    icon: monitor
    habits: true
    competitor: partial

  - name: REST API runtime
    icon: globe
    habits: true
    competitor: true

  - name: Mobile apps
    icon: smile
    habits: true
    competitor: false

  - name: Built-in DLP / PII protection
    icon: shield
    habits: true
    competitor: false

  - name: Dynamic module loading
    icon: puzzle
    habits: npm / GitHub / local
    competitor: Community nodes

  - name: Commercial use without source disclosure
    icon: unlock
    habits: false
    competitor: partial

heroBar:
  title: Lightweight, portable, and fully open-source
  subtitle: When your automation needs to ship on Lambda, a container, an IoT device, or inside a product you distribute, Habits was built for those constraints, not retrofitted into them.
  actions:
    - text: Build your first habit
      link: /getting-started/first-habit
      type: primary
    - text: Read the introduction
      link: /getting-started/introduction
      type: secondary

sections:
  - title: Ship automation anywhere
    icon: rocket
    type: highlight
    description: Habits runs as a tiny runtime that fits where n8n's full server won't, serverless functions, edge workers, embedded devices, and packaged desktop apps.
    items:
      - icon: cloud
        title: Serverless-friendly
        text: Execute habits on AWS Lambda, Cloudflare Workers, or Vercel Edge without a persistent server.
      - icon: package
        title: Pack to a standalone app
        text: Bundle a workflow with a frontend and ship it as a product, no central server required.
      - icon: smile
        title: Mobile runtime
        text: Run habits inside mobile apps for on-device automations that never touch a cloud.
    cta:
      text: See when to use Habits
      link: /getting-started/when-to-use

  - title: YAML-first, git-native
    icon: file-code
    type: default
    description: Habits workflows are plain YAML files. Diff them in pull requests, review them in CI, and roll them back with git, the same flow your code already uses.
    code: |
      nodes:
        - id: fetch
          type: bits
          data:
            module: "@ha-bits/bit-http"
            operation: get
        - id: summarize
          type: bits
          data:
            module: "@ha-bits/bit-openai"

  - title: Fully open-source stack
    icon: unlock
    type: default
    description: Habits core is AGPL-3.0 and every bit is MIT. No "fair-code" clauses, no commercial usage restrictions on the integrations themselves, modify, redistribute, and embed freely under the standard OSS rules.
    items:
      - icon: shield
        title: AGPL-3.0 core
        text: Strong copyleft for the runtime, modifications stay open.
      - icon: unlock
        title: MIT bits
        text: Every integration is permissively licensed so you can reuse them anywhere.

relatedLinks:
  - label: Next comparison
    title: Habits vs ActivePieces
    link: /comparisons/vs-activepieces
  - label: Next comparison
    title: Habits vs IFTTT
    link: /comparisons/vs-ifttt
  - label: Get started
    title: Build your first habit
    link: /getting-started/first-habit
---
