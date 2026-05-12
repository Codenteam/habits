#!/usr/bin/env npx tsx
/**
 * Generate industry docs pages from showcase/industries/ stacks.
 *
 * Scans showcase/<folder>/stack.yaml for the `industries` and `departments`
 * fields, then merges with per-habit metadata from showcase.yaml to produce:
 *   - docs/industries/index.md        : IndustryBrowser page (all industries)
 *   - docs/industries/<id>.md         : IndustryPage per industry
 *
 * Data is inlined directly into <script setup> blocks inside the .md files so
 * no runtime YAML fetching is needed, the same pattern used by generate-showcase.ts.
 *
 * Usage: npx tsx scripts/generate-industry-docs.ts
 *
 * Folder convention (showcase/<industry-name>-<department-name>/):
 *   stack.yaml     : runtime server config (version, workflows, server, logging)
 *   showcase.yaml  : must contain `industries: [<id>]` and `departments: [<id>]`
 *                    plus name, description, habits[], notice, etc.
 *   habits/        : one <habit-id>.yaml per workflow
 *   demo/          : PNG/WebP screenshots
 *
 * Examples:
 *   showcase/healthcare-clinical-operations/
 *   showcase/finance-banking-compliance/
 *   showcase/ecommerce-retail-marketing/
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import { join, extname, basename } from 'path'
import { fileURLToPath } from 'url'
import { parse as parseYaml } from 'yaml'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = join(__dirname, '..')
const industriesShowcaseDir = join(rootDir, 'showcase')
const docsIndustriesDir = join(rootDir, 'docs', 'industries')

// ---------------------------------------------------------------------------
// Types: matches docs/.vitepress/theme/components/industries/types.ts
// ---------------------------------------------------------------------------

interface HabitData {
  id: string
  name: string
  description: string
  trigger: 'scheduler' | 'webhook' | 'email' | 'manual'
  bits: string[]
  stackFolder?: string // relative path from workspace root
}

interface DepartmentData {
  id: string
  name: string
  icon: string
  description: string
  habits: HabitData[]
}

interface IndustryData {
  id: string
  name: string
  icon: string
  tagline: string
  description: string
  color: string
  departments: DepartmentData[]
}

// What we read from stack.yaml (just the fields we care about)
interface StackMeta {
  name?: string
  description?: string
}

// What we read from showcase.yaml inside each dept folder
interface DeptShowcaseMeta {
  name: string
  description: string
  icon?: string
  color?: string
  industries?: string[]
  departments?: string[]
  /** Ordered list of habit entries, each maps to a habits/<id>.yaml */
  habits?: HabitEntry[]
  disabled?: boolean
  /** Optional notice box shown below the habits grid */
  notice?: { title: string; text: string }
}

interface HabitEntry {
  id: string
  name: string
  description: string
  trigger: 'scheduler' | 'webhook' | 'email' | 'manual'
  bits: string[]
}

// ---------------------------------------------------------------------------
// Industry metadata: defines display properties for the 5 industries.
// These are the only things NOT derived from the stack files.
// ---------------------------------------------------------------------------

const INDUSTRY_META: Record<
  string,
  { name: string; icon: string; tagline: string; description: string; color: string }
> = {
  healthcare: {
    name: 'Healthcare',
    icon: 'heart',
    tagline: 'Automate patient journeys, clinical operations, and compliance, end to end.',
    description:
      'From patient intake to regulatory filings, habits replace manual follow-ups, ' +
      'paper-based checklists, and error-prone data entry across every hospital department.',
    color: 'blue',
  },
  'finance-banking': {
    name: 'Finance & Banking',
    icon: 'shield',
    tagline: 'Onboard customers, detect fraud, and pass audits, without the manual grind.',
    description:
      'From KYC collection to SOX evidence packs, habits connect your core banking ' +
      'systems, compliance tools, and customer channels with zero custom glue code.',
    color: 'green',
  },
  'ecommerce-retail': {
    name: 'E-commerce & Retail',
    icon: 'package',
    tagline: 'Orders, inventory, marketing, and customer support on autopilot.',
    description:
      'From abandoned cart recovery to revenue reconciliation, habits connect your ' +
      'store, warehouse, and customers, automatically handling every touchpoint.',
    color: 'orange',
  },
  manufacturing: {
    name: 'Manufacturing',
    icon: 'cpu',
    tagline: 'Supply chain, quality control, maintenance, and production, all connected.',
    description:
      'From purchase order approvals to OEE reports, habits integrate your ERP, MES, ' +
      'CMMS, and quality systems, replacing manual emails and spreadsheets.',
    color: 'yellow',
  },
  'real-estate': {
    name: 'Real Estate',
    icon: 'home',
    tagline: 'Leads, listings, transactions, and property management, streamlined.',
    description:
      'From the moment a lead fills in a form to the day a tenant renews their lease, ' +
      'habits automate every communication, document, and follow-up.',
    color: 'purple',
  },
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

function scanDepartments(): Map<string, DepartmentData[]> {
  const map = new Map<string, DepartmentData[]>()

  if (!existsSync(industriesShowcaseDir)) {
    console.log(`⚠️  showcase/ does not exist, generating empty industry pages.`)
    return map
  }

  const dirs = readdirSync(industriesShowcaseDir).filter((name) => {
    const p = join(industriesShowcaseDir, name)
    return statSync(p).isDirectory()
  })

  for (const dir of dirs) {
    const deptPath = join(industriesShowcaseDir, dir)
    const stackFile = join(deptPath, 'stack.yaml')
    const showcaseFile = join(deptPath, 'showcase.yaml')

    if (!existsSync(stackFile)) {
      console.log(`⚠️  Skipping ${dir}: no stack.yaml`)
      continue
    }
    if (!existsSync(showcaseFile)) {
      console.log(`⚠️  Skipping ${dir}: no showcase.yaml`)
      continue
    }

    let stack: StackMeta
    let meta: DeptShowcaseMeta

    try {
      stack = parseYaml(readFileSync(stackFile, 'utf-8')) as StackMeta
      meta = parseYaml(readFileSync(showcaseFile, 'utf-8')) as DeptShowcaseMeta
    } catch (err) {
      console.error(`❌ Error parsing ${dir}:`, (err as Error).message)
      continue
    }

    if (meta.disabled) {
      console.log(`⚠️  Skipping ${dir}: disabled in showcase.yaml`)
      continue
    }

    const industryIds = meta.industries ?? []
    const departmentIds = meta.departments ?? []

    if (!industryIds.length || !departmentIds.length) {
      console.log(`⚠️  Skipping ${dir}: showcase.yaml missing industries or departments fields`)
      continue
    }

    const deptId = departmentIds[0]
    const industryId = industryIds[0]

    // Build HabitData array from showcase.yaml habits list
    const habits: HabitData[] = (meta.habits ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      trigger: h.trigger,
      bits: h.bits ?? [],
      stackFolder: `showcase/${dir}`,
    }))

    const dept: DepartmentData = {
      id: deptId,
      name: meta.name,
      icon: meta.icon ?? 'zap',
      description: meta.description,
      habits,
      ...(meta.notice ? { notice: meta.notice } : {}),
      showcaseSlug: dir,
    }

    if (!map.has(industryId)) map.set(industryId, [])
    map.get(industryId)!.push(dept)

    console.log(
      `✅ ${industryId} / ${deptId}, ${habits.length} habits (${dir})`
    )
  }

  return map
}

// ---------------------------------------------------------------------------
// Build IndustryData objects
// ---------------------------------------------------------------------------

function buildIndustries(deptMap: Map<string, DepartmentData[]>): IndustryData[] {
  return Object.entries(INDUSTRY_META).map(([id, meta]) => {
    const departments = deptMap.get(id) ?? []
    return { id, ...meta, departments }
  })
}

// ---------------------------------------------------------------------------
// Generate .md files
// ---------------------------------------------------------------------------

function generateIndexPage(industries: IndustryData[]): string {
  const summaries = industries.map((ind) => ({
    id: ind.id,
    name: ind.name,
    icon: ind.icon,
    tagline: ind.tagline,
    totalHabits: ind.departments.reduce((s, d) => s + d.habits.length, 0),
    departments: ind.departments.length,
  }))

  return `---
title: Industry Automation
description: Explore how Habits automates operations across Healthcare, Finance, E-commerce, Manufacturing, and Real Estate.
aside: false
---

<script setup>
const industries = ${JSON.stringify(summaries, null, 2)}
</script>

<IndustryBrowser :industries="industries" />
`
}

function generateIndustryPage(industry: IndustryData): string {
  return `---
title: "${industry.name} Automation"
description: "${industry.tagline}"
aside: false
---

<script setup>
const industry = ${JSON.stringify(industry, null, 2)}
</script>

<IndustryPage :industry="industry" />
`
}

function generateMarkdownFiles(industries: IndustryData[]): void {
  mkdirSync(docsIndustriesDir, { recursive: true })

  // Index page
  writeFileSync(join(docsIndustriesDir, 'index.md'), generateIndexPage(industries))
  console.log('  📄 docs/industries/index.md')

  // Per-industry pages
  for (const industry of industries) {
    const slug = industry.id
    writeFileSync(join(docsIndustriesDir, `${slug}.md`), generateIndustryPage(industry))
    console.log(`  📄 docs/industries/${slug}.md`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('🏭 Generating industry docs pages...\n')

  const deptMap = scanDepartments()
  const industries = buildIndustries(deptMap)

  const totalHabits = industries.reduce(
    (s, ind) => s + ind.departments.reduce((ss, d) => ss + d.habits.length, 0),
    0
  )
  const totalDepts = industries.reduce((s, ind) => s + ind.departments.length, 0)

  console.log(
    `\n📊 Totals: ${industries.length} industries, ${totalDepts} departments, ${totalHabits} habits`
  )
  console.log('\n📝 Writing markdown files...')

  generateMarkdownFiles(industries)

  console.log('\n✅ Done.')
}

main()
