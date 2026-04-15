---
title: "Email (IMAP/SMTP)"
description: "Email integration bit for IMAP fetching and SMTP sending"
aside: false
---

<script setup>
import { Mail } from 'lucide-vue-next'
</script>

# <component :is="Mail" :size="32" class="inline-icon" /> Email (IMAP/SMTP)

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-email`</span>
  <span class="bit-version">v1.0.4</span>
  <span class="bit-downloads">📥 584 downloads</span>
  <span class="bit-categories"><span class="bit-category">email</span> <span class="bit-category">imap</span> <span class="bit-category">smtp</span> <span class="bit-category">mail</span> <span class="bit-category">nodemailer</span></span>
</div>

Email integration bit for IMAP fetching and SMTP sending

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-email-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-email"
    action: "action_name"
    data:
      # action properties...
```

## Used In Showcases

- [email-demo](/showcase/email-demo)

<style>
.bit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0 24px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.bit-package {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
}

.bit-version {
  color: var(--vp-c-text-2);
  font-size: 0.85em;
}

.bit-downloads {
  color: var(--vp-c-text-2);
  font-size: 0.85em;
  background: var(--vp-c-bg-alt);
  padding: 4px 10px;
  border-radius: 12px;
}

.bit-categories {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.bit-category {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8em;
}

.inline-icon {
  display: inline;
  vertical-align: middle;
  margin-right: 8px;
}

.vp-doc h2 {
  border-top-width: 0px;
}
</style>
