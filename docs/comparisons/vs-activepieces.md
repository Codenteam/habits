---
isComparison: true
title: Habits vs ActivePieces
intro: ActivePieces is an open-source Zapier alternative built around a "pieces" ecosystem and a hosted/self-hosted server. Habits is a lightweight, embeddable runtime that runs the same automations on edge, serverless, CLI, mobile, and even packaged apps — with workflows stored as plain YAML.

habits:
  name: Habits
  logo: /logo.png

competitor:
  name: ActivePieces
  logo: /logos/activepieces.svg

tableTitle: Feature Comparison

features:
  - name: License
    icon: scale
    habits: AGPL-3.0 (core) + MIT (bits)
    competitor: MIT
    highlight: true

  - name: Self-hostable
    icon: home
    habits: true
    competitor: true

  - name: Workflow storage
    icon: file-code
    habits: YAML files (git-native)
    competitor: Database-backed flows

  - name: Trigger / action model
    icon: zap
    habits: Nodes (bits + scripts)
    competitor: Pieces (triggers/actions)

  - name: Custom code steps
    icon: code
    habits: Javascript inline
    competitor: TypeScript pieces

  - name: Edge & serverless deploy
    icon: cloud
    habits: true
    competitor: false

  - name: Runs as CLI
    icon: monitor
    habits: true
    competitor: false

  - name: Pack to standalone app
    icon: package
    habits: true
    competitor: false

  - name: Decentralized execution
    icon: git-branch
    habits: true
    competitor: false

  - name: Mobile apps
    icon: smile
    habits: true
    competitor: false

  - name: AI-assisted workflow building
    icon: bot
    habits: true
    competitor: partial

  - name: Built-in DLP / PII protection
    icon: shield
    habits: With plugins
    competitor: false

  - name: Dynamic module loading
    icon: puzzle
    habits: Habits Registry / npm / GitHub
    competitor: Pieces registry

  - name: Minimal footprint
    icon: cpu
    habits: Lightweight runtime
    competitor: Full server stack

heroBar:
  title: The same automations — without the server
  subtitle: "ActivePieces needs a running server to execute. Habits runs Everywhere: a Lambda, a container, a phone, or a CLI in your CI pipeline."
  actions:
    - text: Build your first habit
      link: /getting-started/first-habit
      type: primary
    - text: See the architecture
      link: /getting-started/concepts
      type: secondary

sections:
  - title: Runtime, not a platform
    icon: rocket
    type: highlight
    description: ActivePieces is a platform you run; Habits is a runtime you embed. If you want to ship automation inside your own product rather than point users at a separate UI, Habits fits that shape.
    items:
      - icon: puzzle
        title: Embed in your app
        text: Drop the Cortex runtime into any Node/Deno process and execute habits in-line.
      - icon: monitor
        title: CLI-first
        text: "`habits execute --config ./stack.yaml` — run automations from scripts, cron, or CI."
      - icon: zap
        title: No server required
        text: Habits doesn't need a long-running process or a database to execute a workflow.

  - title: Git-native workflows
    icon: git-branch
    type: default
    description: ActivePieces stores flows in its database. Habits stores them as YAML alongside your code — reviewable in PRs, version-controlled, and diffable.
    code: |
      nodes:
        - id: on-webhook
          type: bits
          data:
            module: "@ha-bits/bit-webhook"
        - id: enrich
          type: bits
          data:
            module: "@ha-bits/bit-openai"
        - id: store
          type: bits
          data:
            module: "@ha-bits/bit-database"

  - title: Bits and scripts, together
    icon: puzzle
    type: default
    description: Mix pre-built Habits bits with inline Deno/TypeScript scripts in one workflow — no need to author a new "piece" every time you have one-off logic.
    items:
      - icon: package
        title: 200+ bits
        text: Pre-built, MIT-licensed integrations — gradually being published to public npm.
      - icon: code
        title: Inline scripts
        text: Drop custom TypeScript into a workflow without packaging it as a separate module.

relatedLinks:
  - label: Next comparison
    title: Habits vs n8n
    link: /comparisons/vs-n8n
  - label: Next comparison
    title: Habits vs Tasker
    link: /comparisons/vs-tasker
  - label: Get started
    title: Build your first habit
    link: /getting-started/first-habit
---
