---
layout: doc
isComparison: true
title: Habits vs Habits
intro: >
  "How does Habits compare to X?" We get this a lot. X being automation platforms,
  agent frameworks, vibe-coding tools, or enterprise software.
  Our answer? We stopped keeping track. Here is our honest self-assessment.

habits:
  name: Habits
  logo: /logo.png

competitor:
  name: Also Habits
  logo: /logo.png

tableTitle: "The Only Fair Comparison We Could Think Of"

features:
  - name: Is it Open Source?
    icon: heart
    habits: "Apache 2.0 baby"
    competitor: "Still Apache 2.0"
    highlight: true
    
  - name: Is it Enterprise Ready?
    icon: shield
    habits: "Obviously"
    competitor: "Without the price tag"
    highlight: true
    
  - name: Automation Platform?
    icon: settings
    habits: "Like n8n but chill"
    competitor: "Like Zapier but free"
    
  - name: Agent Framework?
    icon: bot
    habits: "Agents included"
    competitor: "No PhD required"
    highlight: true
    
  - name: Vibe Coding Tool?
    icon: sparkles
    habits: "AI does the work"
    competitor: "You take the credit"
    
  - name: Visual Builder?
    icon: palette
    habits: "Drag. Drop. Done."
    competitor: "For the mouse lovers"
    
  - name: Code-First?
    icon: code
    habits: "YAML enthusiasts unite"
    competitor: "Git push and forget"
    
  - name: Serverless Ready?
    icon: cloud
    habits: "Lambda friendly"
    competitor: "Edge-case approved"
    
  - name: Multi-Framework?
    icon: puzzle
    habits: "n8n + Activepieces"
    competitor: "+ Custom scripts"
    
  - name: Lightweight?
    icon: zap
    habits: "~50MB runtime"
    competitor: "Your laptop says thanks"
    
  - name: Documentation?
    icon: book
    habits: "You're reading it"
    competitor: "It exists (shocking)"
    
  - name: Community?
    icon: heart
    habits: "Small but mighty"
    competitor: "Growing daily"
    
  - name: Ego?
    icon: smile
    habits: "Appropriately sized"
    competitor: "We're working on it"

heroBar:
  title: "One Tool. Zero Identity Crisis."
  subtitle: "We're an automation platform. We're an agent framework. We're a vibe-coding tool. We're whatever you need us to be. And yes, we're aware this sounds like a dating profile."
  actions:
    - text: "Fine, I'll Try It"
      link: /getting-started/first-habit
      type: primary
    - text: "Convince Me More"
      link: /showcase/
      type: secondary

sections:
  - title: "It's an Automation Platform (Apparently)"
    icon: settings
    type: highlight
    description: "People keep comparing us to n8n, Activepieces, Zapier, and Make. We're flattered, honestly. We connect APIs, transform data, and trigger on events — but with less overhead and more freedom."
    items:
      - icon: plug
        title: 200+ Integrations
        text: "Slack, Stripe, OpenAI, databases — the usual suspects"
      - icon: zap
        title: Event-Driven
        text: "Webhooks, schedules, file watchers — endless possibilities"
      - icon: puzzle
        title: Multi-Framework
        text: "Mix n8n nodes and Activepieces pieces (yes, really)"
    cta:
      text: "See what we've built"
      link: /showcase/

  - title: "It's Also an Agent Framework (Why Not)"
    icon: bot
    type: default
    description: "Build AI agents with tool use, memory, and reasoning. Connect any LLM, orchestrate complex workflows. We didn't plan this — it just happened."
    code: |
      nodes:
        - id: agent
          type: bit
          data:
            module: "@ha-bits/bit-agent"
            params:
              model: gpt-4
              tools: [search, query-db, send-email]
              memory: conversation
    cta:
      text: "Build an agent"
      link: /bits/bit-agent

  - title: "And a Vibe Coding Tool (Sure, Why Not)"
    icon: sparkles
    type: default
    description: "Describe what you want. AI generates the workflow AND the frontend. Ship apps without writing boilerplate. Take all the credit at standup."
    items:
      - icon: wand
        title: Natural Language
        text: "\"Build me an invoice generator\" — done"
      - icon: palette
        title: Auto-Generated UI
        text: "AI creates forms for your workflows automatically"
      - icon: rocket
        title: One Command Deploy
        text: "npx habits@latest cortex --config magic.yaml"
    cta:
      text: "Try AI generation"
      link: /getting-started/first-habit-using-ai

relatedLinks:
  - label: "Serious comparison"
    title: "Habits vs n8n"
    link: /comparisons/vs-n8n
  - label: "Another serious one"
    title: "Habits vs Activepieces"
    link: /comparisons/vs-activepieces
  - label: "One more"
    title: "Habits vs Lovable"
    link: /comparisons/vs-lovable
---

<div style="display:none"></div>
