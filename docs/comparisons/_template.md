---
isComparison: true
title: Habits vs [Competitor]
intro: A brief introduction explaining what both tools do and why someone might compare them.

habits:
  name: Habits
  logo: /logo.png

competitor:
  name: Competitor Name
  logo: /logos/competitor.svg

tableTitle: Feature Comparison

features:
  # Each feature row in the comparison table
  # habits/competitor values can be:
  #   - true (shows ✓)
  #   - false (shows ✗)
  #   - "partial" (shows ◐)
  #   - any string (shows the text)
  # icon: Use Lucide icon names (see docs/.vitepress/theme/components/Icon.vue)
  
  - name: License
    icon: file
    habits: Apache 2.0
    competitor: MIT
    highlight: true  # Optional: highlights this row
    
  - name: Feature Name
    icon: zap
    habits: true
    competitor: false
    
  - name: Another Feature
    icon: wrench
    habits: partial
    competitor: true
    
  - name: Text Feature
    icon: cpu
    habits: ~50MB
    competitor: ~500MB+

heroBar:
  title: The Big Differentiator Statement
  subtitle: A supporting line that emphasizes why Habits is the better choice for specific use cases.
  actions:
    - text: Primary CTA
      link: /getting-started/first-habit
      type: primary
    - text: Secondary CTA
      link: /docs/
      type: secondary

sections:
  # Three sections highlighting key differences
  # Types: "default", "highlight", "warning"
  # icon: Use Lucide icon names (see Icon.vue for available names)
  
  - title: Key Advantage #1
    icon: rocket
    type: highlight
    description: Explain why this matters and how Habits excels here.
    items:
      - icon: cloud
        title: Benefit title
        text: Explanation of the benefit
      - icon: zap
        title: Another benefit
        text: More details
    cta:  # Optional call-to-action
      text: Learn more
      link: /docs/

  - title: Key Advantage #2
    icon: wrench
    type: default
    description: Another area where Habits shines.
    code: |  # Optional code example
      nodes:
        - type: bit
          data:
            module: "@ha-bits/example"

  - title: Key Advantage #3
    icon: puzzle
    type: default
    description: Third differentiator or use case.
    items:
      - icon: package
        title: Step one
        text: How to get started
      - icon: code
        title: Step two
        text: Next action

relatedLinks:
  # Navigation to other comparisons or docs
  - label: Next comparison
    title: Habits vs Another
    link: /comparisons/vs-another
  - label: Get started
    title: Build your first habit
    link: /getting-started/first-habit
---
