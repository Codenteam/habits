# Self-Improving Habits (Reward)

> ⚠️ **Planning Phase**: This feature is currently in the planning phase and not yet implemented.

---

## Overview

Just like the human brain refines habits over time, Habits can evolve and improve through feedback loops. There are two planned approaches for self-improvement:

## Improvement Methods

### 1. Direct Feedback

Users can provide feedback on each workflow output. When a habit produces a result, you can rate it or provide comments. The Base (our Basal Ganglia) will incorporate this feedback to adjust the habit's behavior.

```
Output → User Feedback → Base learns → Improved Habit
```

### 2. Thrill Seeking (A/B Mutations)

Inspired by how exploration drives learning, habits can apply random mutations to their behavior—trying slight variations to discover better approaches. Users then indicate which variation performed better, similar to A/B testing.

```
Habit A (original) ──┐
                     ├── User picks winner → Base adopts improvement
Habit B (mutation) ──┘
```

---

## Configuration

To enable self-improving in a habit, add the `feedback` and/or `thrill` flags to your workflow configuration in `config.json`:

```json
{
  "id": "global-constants",
  "path": "./workflows/global-constants.json",
  "enabled": true,
  "description": "Global constants workflow",
  "feedback": true,
  "thrill": true
}
```

| Flag | Purpose |
|------|---------|
| `feedback` | Enables direct user feedback collection on workflow outputs |
| `thrill` | Enables A/B mutation testing for evolutionary improvement |

---

## How It Works

The **Base** (Basal Ganglia) collects feedback from both methods and intelligently incorporates it into the habit, gradually optimizing performance over time.

| Method | Trigger | Learning Style |
|--------|---------|----------------|
| Direct Feedback | User rates output | Supervised |
| Thrill Seeking | Random mutations | Evolutionary |
