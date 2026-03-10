# QA Testing Guide

Quick verification for Habits using `npx` (no source code required).

---

## 1. Test Base Mode

```bash
# Start server
npx habits@latest base
```

Open browser and verify:

| URL | Expected |
|-----|----------|
| http://localhost:3000/habits/base/ | React UI loads |
| http://localhost:3000/habits/base/api | JSON response |
| http://localhost:3000/habits/base/api/templates | List of templates |
| http://localhost:3000/habits/base/api/modules | List of modules |

Stop server: `Ctrl+C`

---

## 2. Test Cortex Mode

Download example configs from https://codenteam.com/intersect/habits/showcase

Test each example:

```bash
# Mixed example
npx habits@latest cortex --config ./stack.yaml

# Business Intersect example  
npx habits@latest cortex --config ./business-intersect-stack.yaml
```

Open browser and verify:

| URL | Expected |
|-----|----------|
| http://localhost:3000/ | Habit UI loads |
| http://localhost:3000/habits/cortex/ | Management UI loads |
| http://localhost:3000/misc/workflows | JSON with workflows |

Stop server: `Ctrl+C`

---

## 3. Follow Documentation Tutorials

Go to https://codenteam.com/intersect/habits and complete:

### First Habit (Required)
1. Getting Started → First Habit
2. Follow all steps, verify habit runs

### Examples (Complete all 4)
| Example | Key Verification |
|---------|------------------|
| Email Classification | Workflow executes, emails categorized |
| Minimal Blog | Blog renders, posts display |
| Marketing Campaign | Multi-step workflow completes |
| OpenClaw Clone | Full app functions |

---

## 4. Test @next Version

Replace `@latest` with `@next` to test pre-release:

```bash
npx habits@next base
npx habits@next cortex --config <path-to-config>
```

---

## 5. Troubleshooting

**Port already in use:**
```bash
lsof -i :3000
kill <PID>
```

**Clear npx cache:**
```bash
rm -rf ~/.npm/_npx
```

**Check version:**
```bash
npx habits@latest --version
```
