# Email Classification Example

::: info No Frontend
This example is a daemon only and does not include a frontend.
:::

Smart email routing with conditional branching and dual input modes.


<DownloadExample examplePath="email-classification" />

## What It Does

1. Accepts email via **IMAP** (Greenmail) or **HTTP POST**
2. Classifies email type using AI (support/sales/spam/other)
3. Routes to appropriate handler based on classification
4. Logs results with metadata

## Why It's Included

Demonstrates advanced patterns:
- **Branching logic** with `bit-if`
- **Dual triggers** (IMAP polling vs HTTP submission)
- **Conditional execution** with `stopAfterIf`
- **AI classification** with structured output

## Workflow Visualization

<HabitViewer url="https://codenteam.com/intersect/habits/examples/email-classificaiton/habit.yaml" :hide-controls="true" :fit-view="true" :height="600" />

## Quick Start

<ExampleRunner examplePath="email-classification" />

::: code-group
```bash [Test via HTTP]
curl -X POST http://localhost:13000/api/email-classification-test \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "submission": {
        "from": "customer@example.com",
        "subject": "Help with my order",
        "body": "I need to return a product"
      }
    }
  }'
```
:::

## Key Files

::: code-group


<<< @/../examples/email-classification/stack.yaml [stack.yaml]
<<< @/../examples/email-classification/habit.yaml [habit.yaml]
<<< @/../examples/email-classification/.env.example [.env]

:::
