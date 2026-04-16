---
title: ".habit File Format Specification for Automaitons and MicroApps"
description: "Open specification for portable, self-contained automation packages that run on any device"
aside: false
layout: page
---

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Package, Shield, Smartphone, Server, Cloud, Monitor, FileArchive, CheckCircle, Key, Globe, Cpu, Container, Zap, Eye, Play, Terminal, Folder, FileText, Settings, RefreshCw, Lock, Mail, Store, Check, X, Info, BookOpen, Layers, Code, AlertTriangle } from 'lucide-vue-next'
import { withBase } from 'vitepress'

// Lightbox state
const lightboxVisible = ref(false)
const lightboxImg = ref('')
const lightboxAlt = ref('')

const openLightbox = (src, alt) => {
  lightboxImg.value = withBase(src)
  lightboxAlt.value = alt || ''
  lightboxVisible.value = true
  document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  lightboxVisible.value = false
  document.body.style.overflow = ''
}

const handleKeydown = (e) => {
  if (e.key === 'Escape') closeLightbox()
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<div class="spec-page">

<!-- Hero Section -->
<div class="spec-hero">
  <div class="spec-hero-content">
    <div class="spec-badge">
      <component :is="BookOpen" :size="16" />
      Open Specification v1.0
    </div>
    <h1 class="spec-title">.habit</h1>
    <p class="spec-subtitle">File Format Specification for Automaitons and MicroApps</p>
    <p class="spec-tagline">
      A universal, open format for distributing automations and full-stack microapps built around the automations. Runtimes can run on <strong>mobile devices</strong>, <strong>desktops</strong>, <strong>servers</strong>, and <strong>containers</strong>.
    </p>

  </div>
  <div class="spec-hero-visual">
    <div class="file-icon-large">
      <div class="file-icon-body">
        <span class="file-ext">.habit</span>
      </div>
      <div class="file-icon-fold"></div>
    </div>
  </div>
</div>

<!-- Journey Navigation - Creative TOC -->
<div class="journey-nav">
  <div class="journey-title">
    <span class="journey-icon">🗺️</span>
    <h2>Explore the Specification</h2>
  </div>
  <div class="journey-path">
    <a href="#conformance" class="journey-stop">
      <div class="stop-marker"><component :is="CheckCircle" :size="20" /></div>
      <div class="stop-content">
        <span class="stop-label">Start Here</span>
        <span class="stop-title">Conformance</span>
      </div>
    </a>
    <div class="journey-connector"></div>
    <a href="#file-structure" class="journey-stop">
      <div class="stop-marker"><component :is="FileArchive" :size="20" /></div>
      <div class="stop-content">
        <span class="stop-label">Structure</span>
        <span class="stop-title">Archive Layout</span>
      </div>
    </a>
    <div class="journey-connector"></div>
    <a href="#stack-schema" class="journey-stop">
      <div class="stop-marker"><component :is="Settings" :size="20" /></div>
      <div class="stop-content">
        <span class="stop-label">Config</span>
        <span class="stop-title">stack.yaml</span>
      </div>
    </a>
    <div class="journey-connector"></div>
    <a href="#workflow-schema" class="journey-stop">
      <div class="stop-marker"><component :is="RefreshCw" :size="20" /></div>
      <div class="stop-content">
        <span class="stop-label">Logic</span>
        <span class="stop-title">Workflows</span>
      </div>
    </a>
    <div class="journey-connector"></div>
    <a href="#security" class="journey-stop">
      <div class="stop-marker"><component :is="Shield" :size="20" /></div>
      <div class="stop-content">
        <span class="stop-label">Trust</span>
        <span class="stop-title">Signing</span>
      </div>
    </a>
    <div class="journey-connector"></div>
    <a href="#secrets" class="journey-stop">
      <div class="stop-marker"><component :is="Key" :size="20" /></div>
      <div class="stop-content">
        <span class="stop-label">Secrets</span>
        <span class="stop-title">Resolution</span>
      </div>
    </a>
    <div class="journey-connector"></div>
    <a href="#portability" class="journey-stop">
      <div class="stop-marker"><component :is="Globe" :size="20" /></div>
      <div class="stop-content">
        <span class="stop-label">Deploy</span>
        <span class="stop-title">Profiles</span>
      </div>
    </a>
  </div>
  <div class="journey-appendix">
    <span class="appendix-label">Appendices</span>
    <div class="appendix-links">
      <a href="#running" class="appendix-chip"><component :is="Play" :size="14" /> Running</a>
      <a href="#viewing" class="appendix-chip"><component :is="Eye" :size="14" /> Viewing</a>
      <a href="#governance" class="appendix-chip"><component :is="BookOpen" :size="14" /> Governance</a>
    </div>
  </div>
</div>

<!-- Capability Banner -->
<p class="capability-statement">
  The <code>.habit</code> format delivers <strong>portability</strong>, <strong>cross-platform support</strong>, <strong>multi-use case flexibility</strong>, and <strong>auditability</strong>, while runtimes provide <strong>durability</strong>, <strong>scalability</strong>, <strong>consistency</strong>, and <strong>isolation</strong>.
</p>

<div class="capability-section">
  <h3 class="capability-section-title"><component :is="FileArchive" :size="20" /> Format Capabilities</h3>
  <div class="capability-grid format-grid">
    <div class="capability-card format">
      <div class="card-icon">
        <component :is="Package" :size="32" />
      </div>
      <div class="card-content">
        <h3>Portable</h3>
        <p>Move the same <code>.habit</code> file between environments without rewriting it.</p>
      </div>
    </div>
    <div class="capability-card format">
      <div class="card-icon">
        <component :is="Globe" :size="32" />
      </div>
      <div class="card-content">
        <h3>Cross-Platform</h3>
        <p>Run the same package across mobile, desktop, server, and container runtimes.</p>
      </div>
    </div>
    <div class="capability-card format">
      <div class="card-icon">
        <component :is="Layers" :size="32" />
      </div>
      <div class="card-content">
        <h3>Multi-Use Case</h3>
        <p>Deploy as automation, backend API, full-stack SaaS, or standalone microapp: same format.</p>
      </div>
    </div>
    <div class="capability-card format">
      <div class="card-icon">
        <component :is="Eye" :size="32" />
      </div>
      <div class="card-content">
        <h3>Auditable</h3>
        <p>Standard ZIP with human-readable YAML. Inspect, audit, or modify with any text editor.</p>
      </div>
    </div>
  </div>
</div>

<div class="capability-section">
  <h3 class="capability-section-title"><component :is="Cpu" :size="20" /> Runtime Capabilities</h3>
  <div class="capability-grid runtime-grid">
    <div class="capability-card runtime">
      <div class="card-icon">
        <component :is="RefreshCw" :size="32" />
      </div>
      <div class="card-content">
        <h3>Durable</h3>
        <p>Recover after crashes and continue from the last safe point instead of starting over.</p>
      </div>
    </div>
    <div class="capability-card runtime">
      <div class="card-icon">
        <component :is="Zap" :size="32" />
      </div>
      <div class="card-content">
        <h3>Scalable</h3>
        <p>Run many executions safely and efficiently as demand grows.</p>
      </div>
    </div>
    <div class="capability-card runtime">
      <div class="card-icon">
        <component :is="CheckCircle" :size="32" />
      </div>
      <div class="card-content">
        <h3>Consistent</h3>
        <p>Same inputs produce identical outputs regardless of which runtime or platform executes it.</p>
      </div>
    </div>
    <div class="capability-card runtime">
      <div class="card-icon">
        <component :is="Shield" :size="32" />
      </div>
      <div class="card-content">
        <h3>Isolated</h3>
        <p>Each execution runs in its own context. No state leaks between runs or between habits.</p>
      </div>
    </div>
  </div>
</div>

<!-- Spec Disclaimer -->
<div class="spec-disclaimer">
  <component :is="Info" :size="20" />
  <div>
    <strong>About This Document</strong>
    <p>This document contains both the <strong>normative .habit format specification and .habit runtime rules</strong> and <strong>non-normative implementation notes</strong> for the Cortex reference implementation. Sections are labeled accordingly. The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", and "MAY" are to be interpreted as described in <a href="https://www.rfc-editor.org/rfc/rfc2119" target="_blank">RFC 2119</a>.</p>
  </div>
</div>

<!-- Application Types Section -->
<div class="app-types-box">
  <h4><component :is="Layers" :size="18" /> From Automation to MicroApp</h4>
  <p>The <code>.habit</code> format enables different application types depending on what you include:</p>
  <ul class="app-types-list">
    <li><strong>Automation</strong>: Logic without UI: pure workflow execution</li>
    <li><strong>Backend</strong>: Logic without UI but with auto-generated OpenAPI: instant API</li>
    <li><strong>SaaS</strong>: Backend with a frontend: full-stack web application</li>
    <li><strong>MicroApp</strong>: Backend and frontend bundled to binary: portable, self-contained apps</li>
  </ul>
</div>

<!-- Why Open Section -->
<div class="why-open-box">
  <h4><component :is="Globe" :size="18" /> Why an Open Format?</h4>
  <p>The .habit format is intentionally open because the ecosystem depends on it:</p>
  <ul class="why-open-list">
    <li><strong>Community builds the nodes/bits</strong>: The modules and integrations that power automations are created by the community. An open format ensures anyone can distribute their nodes/bits without vendor lock-in, as long as it can work in a runtime that implements the specs.</li>
    <li><strong>Community shares automations</strong>: When users build automations, they should be free to share, sell, or gift them, not trapped in a single platform.</li>
    <li><strong>Freedom to build</strong>: Developers should be able to create their own runtimes, visual editors, marketplaces, or enterprise tools. No permission needed.</li>
    <li><strong>Runtime portability</strong>: Moving from one runtime to another should be seamless. Your .habit files should work whether the runtime is built in Node.js, Rust, a WebView, or any other technology. No rewrite needed.</li>
  </ul>
  <p class="why-open-footer">The format belongs to the community, not a company. Build on it, extend it, monetize it. it's yours.</p>
</div>

<div class="reference-impl-box">
  <h4><component :is="Code" :size="18" /> Reference Implementation</h4>
  <p>The Cortex runtime is the reference implementation for this specification. Open source under <strong>Apache 2.0</strong> license on GitHub:</p>
  <div class="impl-links">
    <a href="https://github.com/Codenteam/habits/tree/main/packages/cortex/server" target="_blank" class="impl-link">
      <component :is="Server" :size="18" />
      <span><strong>Cortex Server</strong>: Server, Docker, Serverless</span>
    </a>
    <a href="https://github.com/Codenteam/habits/tree/main/habits-cortex/" target="_blank" class="impl-link">
      <component :is="Monitor" :size="18" />
      <span><strong>Habits Cortex App</strong>: Desktop &amp; Mobile (Tauri)</span>
    </a>
  </div>
</div>
<!-- Conformance Section -->
<div class="spec-section conformance-section" id="conformance">
  <h2><component :is="CheckCircle" :size="24" /> Conformance <span class="section-badge normative">Normative</span></h2>
  
  <p class="section-intro">
    A conforming <code>.habit</code> package and its reader implementation MUST satisfy the following requirements.
  </p>

  <div class="conformance-block">
    <h3>Archive Requirements</h3>
    <ul class="conformance-list">
      <li><span class="rfc-keyword must">MUST</span> be a valid ZIP archive (PKZIP format)</li>
      <li><span class="rfc-keyword must">MUST</span> contain a <code>stack.yaml</code> file at the archive root</li>
      <li><span class="rfc-keyword must">MUST</span> contain workflow definition files (YAML) referenced by <code>stack.yaml</code></li>
      <li><span class="rfc-keyword may">MAY</span> contain a bundle file to help running the automation, like <code>cortex-bundle.js</code> file for JavaScript-based runtimes</li>
      <li><span class="rfc-keyword should">SHOULD</span> contain a <code>frontend/</code> directory with pre-built UI assets</li>
      <li><span class="rfc-keyword may">MAY</span> contain a <code>frontend-src/</code> directory with original source files</li>
      <li><span class="rfc-keyword may">MAY</span> contain a <code>habits/</code> directory with workflow YAML files</li>
      <li><span class="rfc-keyword may">MAY</span> contain a <code>.env</code> file for embedded secrets (not recommended for distribution)</li>
      <li><span class="rfc-keyword may">MAY</span> contain a <code>SIGNATURE</code> file for cryptographic signing</li>
      <li><span class="rfc-keyword may">MAY</span> contain a <code>MANIFEST.json</code> file with metadata and checksums</li>
    </ul>
  </div>

  <div class="conformance-block">
    <h3>Reader Requirements</h3>
    <ul class="conformance-list">
      <li><span class="rfc-keyword must">MUST</span> be able to extract and parse the ZIP archive</li>
      <li><span class="rfc-keyword must">MUST</span> validate the presence of required files before execution</li>
      <li><span class="rfc-keyword must">MUST</span> support UTF-8 encoding for all text files</li>
      <li><span class="rfc-keyword should">SHOULD</span> ignore unknown files at the archive root</li>
      <li><span class="rfc-keyword should">SHOULD</span> verify signatures when <code>SIGNATURE</code> file is present</li>
      <li><span class="rfc-keyword may">MAY</span> support additional secret resolution mechanisms beyond the specified profiles</li>
    </ul>
  </div>

  <div class="conformance-block">
    <h3>Portability Requirements</h3>
    <ul class="conformance-list">
      <li><span class="rfc-keyword must">MUST</span> produce the same workflow output given identical inputs and secrets, regardless of runtime implementation</li>
      <li><span class="rfc-keyword must">MUST</span> be able to parse <code>stack.yaml</code> and execute workflows without requiring external downloads after initial runtime setup</li>
      <li><span class="rfc-keyword should">SHOULD</span> degrade gracefully when optional features are unavailable</li>
    </ul>
    <p class="conformance-note"><strong>Note:</strong> Individual workflow nodes may require network access (e.g., API calls, webhooks). This requirement applies to the runtime's ability to load and execute the package itself.</p>
  </div>
</div>

<!-- Core Principles -->
<div class="spec-section principles-section">
  <h2><component :is="Zap" :size="24" /> Design Principles <span class="section-badge informative">Informative</span></h2>
  <div class="principles-grid">
    <div class="principle-card">
      <div class="principle-icon">
        <component :is="Package" :size="32" />
      </div>
      <div class="principle-content">
        <h3>Self-Contained</h3>
        <p>Everything needed to run is bundled inside: frontend, backend logic, workflows, and configuration. No external dependencies required at runtime.</p>
      </div>
    </div>
    <div class="principle-card">
      <div class="principle-icon">
        <component :is="Globe" :size="32" />
      </div>
      <div class="principle-content">
        <h3>Universal Portability</h3>
        <p>Run on phones, tablets, laptops, servers, or serverless platforms. One file works everywhere, from a Raspberry Pi to a Kubernetes cluster.</p>
      </div>
    </div>
    <div class="principle-card">
      <div class="principle-icon">
        <component :is="Shield" :size="32" />
      </div>
      <div class="principle-content">
        <h3>Signing Support</h3>
        <p>Signing is an optional format feature. Any compliant implementation MAY support signature verification for publisher identity and file integrity.</p>
      </div>
    </div>
    <div class="principle-card">
      <div class="principle-icon">
        <component :is="Eye" :size="32" />
      </div>
      <div class="principle-content">
        <h3>Human-Readable</h3>
        <p>Standard ZIP archive containing YAML/JSON configurations. Inspect, audit, or modify the contents with any text editor, no proprietary tools needed.</p>
      </div>
    </div>
  </div>
</div>

<!-- File Structure Section -->
<div class="spec-section" id="file-structure">
  <h2><component :is="FileArchive" :size="24" /> Archive Structure <span class="section-badge normative">Normative</span></h2>
  
  <p class="section-intro">
    A <code>.habit</code> file is a standard <strong>ZIP archive</strong> (PKZIP format) with a specific structure. Implementations MUST be able to extract and parse this archive.
  </p>

  <div class="file-tree-container">
    <div class="file-tree">
      <div class="file-tree-header">
        <component :is="FileArchive" :size="16" />
        <span>my-app.habit</span>
        <span class="file-size">~500 KB</span>
      </div>
      <div class="file-tree-content">
        <div class="tree-item folder">
          <span class="tree-icon"><component :is="Folder" :size="16" /></span>
          <span class="tree-name">frontend/</span>
          <span class="tree-desc">Processed UI (offline-ready, assets inlined)</span>
        </div>
        <div class="tree-item file indent-1">
          <span class="tree-icon"><component :is="FileText" :size="16" /></span>
          <span class="tree-name">index.html</span>
          <span class="tree-desc">Main entry point with inlined CSS/JS</span>
        </div>
        <div class="tree-item folder">
          <span class="tree-icon"><component :is="Folder" :size="16" /></span>
          <span class="tree-name">frontend-src/</span>
          <span class="tree-desc">Original source files (for server mode and to open in Habits Base)</span>
        </div>
        <div class="tree-item file optional">
          <span class="tree-icon"><component :is="Package" :size="16" /></span>
          <span class="tree-name">cortex-bundle.js</span>
          <span class="tree-desc">Bundled runtime (JS-based runtimes only, optional)</span>
        </div>
        <div class="tree-item file">
          <span class="tree-icon"><component :is="Settings" :size="16" /></span>
          <span class="tree-name">stack.yaml</span>
          <span class="tree-desc">App configuration &amp; workflow registry</span>
        </div>
        <div class="tree-item folder">
          <span class="tree-icon"><component :is="Folder" :size="16" /></span>
          <span class="tree-name">habits/</span>
          <span class="tree-desc">Workflow definitions (optional subdirectory)</span>
        </div>
        <div class="tree-item file indent-1">
          <span class="tree-icon"><component :is="RefreshCw" :size="16" /></span>
          <span class="tree-name">*.yaml</span>
          <span class="tree-desc">Individual workflow files</span>
        </div>
        <div class="tree-item file optional">
          <span class="tree-icon"><component :is="Key" :size="16" /></span>
          <span class="tree-name">.env</span>
          <span class="tree-desc">Environment secrets (optional, not for distribution)</span>
        </div>
        <div class="tree-item file future">
          <span class="tree-icon"><component :is="Lock" :size="16" /></span>
          <span class="tree-name">SIGNATURE</span>
          <span class="tree-desc">Digital signature (Optional)</span>
        </div>
        <div class="tree-item file future">
          <span class="tree-icon"><component :is="FileText" :size="16" /></span>
          <span class="tree-name">MANIFEST.json</span>
          <span class="tree-desc">Metadata &amp; checksums (Optional)</span>
        </div>
      </div>
    </div>
        <div class="file-tree-legend">
      <div class="legend-item">
        <span class="legend-dot current"></span>
        <span>Current</span>
      </div>
      <div class="legend-item cautious">
        <span class="legend-dot optional"></span>
        <span>Cautious</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot future"></span>
        <span>Optional</span>
      </div>
    </div>
    

  </div>

  <h3>Key Components</h3>

  <div class="components-grid">
    <div class="component-card">
      <h4><component :is="Package" :size="20" /> cortex-bundle.js <span class="optional-badge">JS Runtimes</span></h4>
      <p>Required only for JavaScript-based runtimes (Node.js, WebView). Contains:</p>
      <ul>
        <li>Workflow execution engine</li>
        <li>All required bits (modules)</li>
        <li>API intercept layer for offline-first operation</li>
      </ul>
      <p class="runtime-note"><strong>Note:</strong> Native runtimes (Rust, Go, etc.) MAY implement the execution engine in their own language and embed all dependencies somehow into the .habit files.</p>
    </div>
    <div class="component-card">
      <h4><component :is="Settings" :size="20" /> stack.yaml</h4>
      <p>The app's configuration manifest defining:</p>
      <ul>
        <li>App name and version</li>
        <li>Registered workflows</li>
        <li>Server configuration</li>
        <li>Logging preferences</li>
      </ul>
    </div>
    <div class="component-card">
      <h4><component :is="Folder" :size="20" /> frontend/</h4>
      <p>Optimized for offline execution:</p>
      <ul>
        <li>All CSS/JS inlined into HTML</li>
        <li>Images converted to base64</li>
        <li>Tailwind CSS pre-generated</li>
        <li>Zero external dependencies</li>
      </ul>
    </div>
  </div>
</div>

<!-- Archive Semantics Section -->
<div class="spec-section" id="archive-semantics">
  <h2><component :is="Layers" :size="24" /> Archive Semantics <span class="section-badge normative">Normative</span></h2>
  
  <p class="section-intro">
    This section defines the precise semantics of the ZIP archive structure.
  </p>

  <div class="semantics-grid">
    <div class="semantics-item">
      <div class="card-icon">
        <component :is="Folder" :size="32" />
      </div>
      <div class="card-content">
        <h4>Path Separator</h4>
        <p>All paths within the archive MUST use forward slash (<code>/</code>) as the directory separator, regardless of the host operating system.</p>
      </div>
    </div>
    <div class="semantics-item">
      <div class="card-icon">
        <component :is="FileText" :size="32" />
      </div>
      <div class="card-content">
        <h4>Case Sensitivity</h4>
        <p>File and directory names MUST be treated as case-sensitive. <code>stack.yaml</code> and <code>Stack.yaml</code> are distinct files. Packagers SHOULD use lowercase for all required files (<code>stack.yaml</code>, <code>cortex-bundle.js</code>) to ensure cross-platform compatibility.</p>
      </div>
    </div>
    <div class="semantics-item">
      <div class="card-icon">
        <component :is="Globe" :size="32" />
      </div>
      <div class="card-content">
        <h4>Character Encoding</h4>
        <p>All text files within the archive MUST be encoded in UTF-8. The archive itself SHOULD use UTF-8 for filenames.</p>
      </div>
    </div>
    <div class="semantics-item">
      <div class="card-icon">
        <component :is="AlertTriangle" :size="32" />
      </div>
      <div class="card-content">
        <h4>Duplicate Handling</h4>
        <p>Archives MUST NOT contain duplicate file paths. If duplicates are encountered, the reader SHOULD reject the archive.</p>
      </div>
    </div>
    <div class="semantics-item">
      <div class="card-icon">
        <component :is="Eye" :size="32" />
      </div>
      <div class="card-content">
        <h4>Unknown Files</h4>
        <p>Readers SHOULD ignore files and directories not defined in this specification. This allows forward compatibility with future extensions.</p>
      </div>
    </div>
    <div class="semantics-item">
      <div class="card-icon">
        <component :is="Package" :size="32" />
      </div>
      <div class="card-content">
        <h4>Compression</h4>
        <p>Files within the archive MAY use DEFLATE compression. Readers MUST support both compressed and stored (uncompressed) entries.</p>
      </div>
    </div>
  </div>
</div>

<!-- stack.yaml Schema Section -->
<div class="spec-section" id="stack-schema">
  <h2><component :is="Settings" :size="24" /> stack.yaml Schema <span class="section-badge normative">Normative</span></h2>
  
  <p class="section-intro">
    The <code>stack.yaml</code> file is the primary configuration manifest. It MUST be present at the archive root.
  </p>

  <div class="schema-table-container">
    <table class="schema-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-label="Field"><code>formatVersion</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Format/schema version (e.g., "1.0"). Used by runtimes for compatibility checking.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>version</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword should">SHOULD</span></td>
          <td data-label="Description">Package version (e.g., "2.1.0"). For tracking releases of this specific habit.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>name</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Human-readable name of the habit package.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>workflows</code></td>
          <td data-label="Type">array</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Array of workflow definitions. Each entry MUST have <code>id</code> and <code>path</code>.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>workflows[].id</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Unique identifier for the workflow within this package.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>workflows[].path</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Relative path to the workflow YAML file.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>server</code></td>
          <td data-label="Type">object</td>
          <td data-label="Required"><span class="rfc-keyword should">SHOULD</span></td>
          <td data-label="Description">Server configuration options.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>server.frontend</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword should">SHOULD</span></td>
          <td data-label="Description">Path to frontend directory (defaults to <code>./frontend</code>).</td>
        </tr>
        <tr>
          <td data-label="Field"><code>server.port</code></td>
          <td data-label="Type">integer</td>
          <td data-label="Required"><span class="rfc-keyword may">MAY</span></td>
          <td data-label="Description">Default port for the server (defaults to 3000).</td>
        </tr>
        <tr>
          <td data-label="Field"><code>description</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword may">MAY</span></td>
          <td data-label="Description">Human-readable description of the package purpose.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>author</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword may">MAY</span></td>
          <td data-label="Description">Package author name or organization.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>logging</code></td>
          <td data-label="Type">object</td>
          <td data-label="Required"><span class="rfc-keyword may">MAY</span></td>
          <td data-label="Description">Logging configuration options.</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Workflow File Schema Section -->
<div class="spec-section" id="workflow-schema">
  <h2><component :is="RefreshCw" :size="24" /> Workflow File Schema <span class="section-badge normative">Normative</span></h2>
  
  <p class="section-intro">
    Workflow files define the automation logic. They are YAML files referenced by <code>stack.yaml</code> and typically stored in a <code>habits/</code> directory.
  </p>

  <div class="schema-table-container">
    <table class="schema-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-label="Field"><code>id</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Unique identifier for the workflow. Used in API routes and references.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>name</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword should">SHOULD</span></td>
          <td data-label="Description">Human-readable name displayed in UIs.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>description</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword may">MAY</span></td>
          <td data-label="Description">Description of what this workflow does.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>input</code></td>
          <td data-label="Type">array</td>
          <td data-label="Required"><span class="rfc-keyword may">MAY</span></td>
          <td data-label="Description">Input parameters the workflow accepts. Each entry has <code>id</code>, <code>type</code>, <code>required</code>, and <code>description</code>.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>nodes</code></td>
          <td data-label="Type">array</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Array of node definitions. Each node represents a step in the workflow.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>edges</code></td>
          <td data-label="Type">array</td>
          <td data-label="Required"><span class="rfc-keyword may">MAY</span></td>
          <td data-label="Description">Connections between nodes. If omitted, nodes execute sequentially.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>output</code></td>
          <td data-label="Type">object</td>
          <td data-label="Required"><span class="rfc-keyword should">SHOULD</span></td>
          <td data-label="Description">Maps workflow outputs to node results using template syntax.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3>Node Structure</h3>
  <p>Each node in the <code>nodes</code> array defines a workflow step:</p>

  <div class="schema-table-container">
    <table class="schema-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-label="Field"><code>id</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Unique identifier within the workflow. Referenced in templates and edges.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>type</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Node type: <code>bits</code>, <code>script</code>, <code>trigger</code>, <code>action</code>, etc.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>data</code></td>
          <td data-label="Type">object</td>
          <td data-label="Required"><span class="rfc-keyword must">MUST</span></td>
          <td data-label="Description">Node configuration including module, operation, params, and credentials.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>data.framework</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword should">SHOULD</span></td>
          <td data-label="Description">Framework: <code>bits</code> or <code>script</code>.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>data.module</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword should">SHOULD</span></td>
          <td data-label="Description">Module/package name (e.g., <code>@ha-bits/bit-http</code>).</td>
        </tr>
        <tr>
          <td data-label="Field"><code>data.source</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword should">SHOULD</span></td>
          <td data-label="Description">Where to load the module: <code>npm</code>, <code>local</code>, <code>github</code>, or <code>link</code>.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>data.operation</code></td>
          <td data-label="Type">string</td>
          <td data-label="Required"><span class="rfc-keyword should">SHOULD</span></td>
          <td data-label="Description">The operation to perform (module-specific).</td>
        </tr>
        <tr>
          <td data-label="Field"><code>data.params</code></td>
          <td data-label="Type">object</td>
          <td data-label="Required"><span class="rfc-keyword may">MAY</span></td>
          <td data-label="Description">Parameters passed to the operation. Supports template syntax.</td>
        </tr>
        <tr>
          <td data-label="Field"><code>data.credentials</code></td>
          <td data-label="Type">object</td>
          <td data-label="Required"><span class="rfc-keyword may">MAY</span></td>
          <td data-label="Description">Credential references using environment variables or secrets.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3>Example Workflow File</h3>
  <div class="example-workflow" v-pre>

```yaml
# habits/get-posts.yaml
id: get-posts
name: Get Recent Posts
description: Retrieve all published posts from the database

input:
  - id: limit
    type: number
    required: false
    description: Maximum number of posts to return

nodes:
  - id: query-posts
    type: bits
    data:
      framework: bits
      source: npm
      module: "@ha-bits/bit-database"
      operation: query
      params:
        collection: "posts"
        filter: '{"status": "published"}'
        limit: "{{habits.input.limit}}"

edges: []

output:
  posts: "{{query-posts.results}}"
  count: "{{query-posts.count}}"
```

  </div>

  <h3>Template Syntax</h3>
  <p>Workflows use double-brace templates to reference values:</p>
  <ul class="template-list">
    <li><code v-pre>{{habits.input.paramName}}</code>: Reference workflow input parameters</li>
    <li><code v-pre>{{habits.env.ENV_VAR}}</code>: Reference environment variables or secrets</li>
    <li><code v-pre>{{nodeId.fieldName}}</code>: Reference output from a previous node</li>
  </ul>

  <h3>Node Types</h3>
  <p>Workflows support multiple node types for different use cases:</p>

  <h4>Bits Node (Recommended)</h4>
  <p>The primary node type for integrations. Uses the <code>bits</code> framework with modular packages:</p>
  <div class="example-workflow" v-pre>

```yaml
- id: generate-content
  type: bits
  data:
    framework: bits
    source: npm
    module: "@ha-bits/bit-openai"
    operation: ask_chatgpt
    credentials:
      openai:
        apiKey: "{{habits.env.OPENAI_API_KEY}}"
    params:
      model: gpt-4o
      temperature: 0.7
      maxTokens: 1000
      prompt: "Write a summary about: {{habits.input.topic}}"
```

  </div>

  <h4>Script Node</h4>
  <p>Execute custom code in multiple languages (TypeScript/Deno, Python, Bash, Go):</p>
  <div class="example-workflow" v-pre>

```yaml
- id: process-data
  type: script
  data:
    framework: script
    source: inline
    params:
      input: "{{previous-node.output}}"
      language: deno
      script: |
        export async function main(input: string) {
          const processed = input.toUpperCase();
          return { result: processed, length: processed.length };
        }
```

  </div>

  <div class="deprecation-notice">
    <component :is="AlertTriangle" :size="18" />
    <div>
      <strong>Deprecation Notice</strong>
      <p>Support for <code>activepieces</code> and <code>n8n</code> node types is deprecated. Please migrate to <code>bits</code> nodes. The examples below are provided for legacy compatibility only.</p>
    </div>
  </div>

  <h4>Activepieces Node <span class="deprecated-badge">Deprecated</span></h4>
  <p>Legacy support for Activepieces modules:</p>
  <div class="example-workflow deprecated" v-pre>

```yaml
- id: generate-text
  type: activepieces
  data:
    framework: activepieces
    source: npm
    module: "@activepieces/piece-openai"
    operation: ask_chatgpt
    credentials:
      apiKey: "{{habits.env.OPENAI_API_KEY}}"
    params:
      prompt: "Write a motivational quote about: {{habits.input.prompt}}"
      model: gpt-4o-mini
```

  </div>

  <h4>n8n Node <span class="deprecated-badge">Deprecated</span></h4>
  <p>Legacy support for n8n modules:</p>
  <div class="example-workflow deprecated" v-pre>

```yaml
- id: text-to-speech
  type: n8n
  data:
    framework: n8n
    source: npm
    module: n8n-nodes-elevenlabs
    operation: text-to-speech
    credentials:
      elevenLabsApi:
        xiApiKey: "{{habits.env.ELEVENLABS_API_KEY}}"
    params:
      resource: speech
      text: "{{generate-text}}"
      voice_id: 21m00Tcm4TlvDq8ikWAM
```

  </div>
</div>

<!-- Compatibility and Versioning Section -->
<div class="spec-section" id="versioning">
  <h2><component :is="Code" :size="24" /> Compatibility and Versioning <span class="section-badge normative">Normative</span></h2>
  
  <p class="section-intro">
    This section defines how version numbers are interpreted and how readers should handle version mismatches.
  </p>

  <div class="versioning-rules">
    <div class="version-rule">
      <div class="card-icon">
        <component :is="FileText" :size="32" />
      </div>
      <div class="card-content">
        <h4>Version Format</h4>
        <p>The <code>version</code> field in <code>stack.yaml</code> MUST follow semantic versioning format: <code>MAJOR.MINOR</code> (e.g., "1.0", "2.1").</p>
      </div>
    </div>
    <div class="version-rule">
      <div class="card-icon">
        <component :is="AlertTriangle" :size="32" />
      </div>
      <div class="card-content">
        <h4>Major Version</h4>
        <p>A change in the major version indicates breaking changes. Readers MUST NOT attempt to execute packages with a higher major version than they support.</p>
      </div>
    </div>
    <div class="version-rule">
      <div class="card-icon">
        <component :is="RefreshCw" :size="32" />
      </div>
      <div class="card-content">
        <h4>Minor Version</h4>
        <p>A change in the minor version indicates backwards-compatible additions. Readers SHOULD support packages with the same major version but any minor version.</p>
      </div>
    </div>
    <div class="version-rule">
      <div class="card-icon">
        <component :is="Eye" :size="32" />
      </div>
      <div class="card-content">
        <h4>Unknown Fields</h4>
        <p>Readers SHOULD ignore unknown fields in <code>stack.yaml</code> to maintain forward compatibility with newer minor versions.</p>
      </div>
    </div>
  </div>
</div>

<!-- Security Section -->
<div class="spec-section security-section" id="security">
  <h2><component :is="Shield" :size="24" /> Signing and Verification <span class="section-badge normative">Normative</span></h2>
  
  <p class="section-intro">
    Signing is an optional format feature. Compliant implementations MAY support signature verification for publisher identity and file integrity.
  </p>
  
  <div class="impl-note">
    <component :is="Info" :size="18" />
    <span><strong>Cortex Reference Implementation:</strong> Signature verification requires certificates, and selection of algorithm, we will leave this part for each implementor. The Cortex OSS edition does not currently verify signatures.</span>
  </div>

  <div class="security-flow">
    <div class="security-step">
      <div class="step-number">1</div>
      <div class="step-content">
        <div class="step-icon">
          <component :is="Key" :size="28" />
        </div>
        <h4>Publisher Signs</h4>
        <p>Publisher creates a digital signature using their <strong>private key</strong>. This cryptographically binds their identity to the file contents.</p>
      </div>
    </div>
    <div class="security-arrow">→</div>
    <div class="security-step">
      <div class="step-number">2</div>
      <div class="step-content">
        <div class="step-icon">
          <component :is="Package" :size="28" />
        </div>
        <h4>File Distributed</h4>
        <p>The .habit file includes the signature and publisher's <strong>public key</strong> (or key ID in case of using an enterprise vault) for verification.</p>
      </div>
    </div>
    <div class="security-arrow">→</div>
    <div class="security-step">
      <div class="step-number">3</div>
      <div class="step-content">
        <div class="step-icon">
          <component :is="CheckCircle" :size="28" />
        </div>
        <h4>User Verifies</h4>
        <p>Runtime validates signature against publisher's public key. Tampering is detected, untrusted sources are flagged.</p>
      </div>
    </div>
  </div>

  <div class="security-details">
   
</div>

</div>

<!-- Secrets Resolution Section -->
<div class="spec-section secrets-section" id="secrets">
  <h2><component :is="Key" :size="24" /> Runtime Secret Resolution <span class="section-badge normative">Normative</span></h2>
  
  <p class="section-intro">
    Compliant implementations MUST support at least one of the following secret resolution profiles. Secrets MAY be required by workflows for API keys, passwords, or other sensitive data.
  </p>

  <div class="secrets-grid">
    <div class="secret-card warning">
      <div class="secret-header">
        <div class="secret-icon"><component :is="FileText" :size="24" /></div>
        <h3>.env Inside the .habit File</h3>
        <span class="secret-badge not-recommended">Not Recommended for Distribution</span>
      </div>
      <div class="secret-body">
        <p>Embed a <code>.env</code> file directly inside the .habit archive. Secrets are bundled with the package.</p>
        <div class="secret-use-cases">
          <span class="use-case ok">Server</span>
          <span class="use-case ok">Docker</span>
          <span class="use-case ok">Serverless</span>
          <span class="use-case bad">Distribution</span>
          <span class="use-case bad">Mobile Apps</span>
          <span class="use-case bad">Desktop Apps</span>
        </div>
        <div class="secret-warning">
          <strong>Warning:</strong> Never distribute .habit files with embedded secrets. The .env file can be extracted by anyone with access to the file.
        </div>
      </div>
    </div>

<div class="secret-card recommended">
      <div class="secret-header">
        <div class="secret-icon"><component :is="Folder" :size="24" /></div>
        <h3>.env Beside the .habit File</h3>
        <span class="secret-badge recommended">Recommended for Servers</span>
      </div>
      <div class="secret-body">
        <p>Place a <code>.env</code> file in the same directory as the .habit file. The runtime automatically loads it.</p>
        <div class="secret-use-cases">
          <span class="use-case ok">Server</span>
          <span class="use-case ok">Docker</span>
          <span class="use-case ok">Serverless</span>
          <span class="use-case ok">Distribution</span>
          <span class="use-case bad">Mobile Apps</span>
          <span class="use-case bad">Desktop Apps</span>
        </div>
        <div class="secret-example">
          <code>
            /opt/habits/<br/>
            ├── my-app.habit<br/>
            └── .env  ← Secrets loaded from here
          </code>
        </div>
      </div>
    </div>

<div class="secret-card recommended">
      <div class="secret-header">
        <div class="secret-icon"><component :is="Lock" :size="24" /></div>
        <h3>OS Keyring</h3>
        <span class="secret-badge recommended">Recommended for Apps</span>
      </div>
      <div class="secret-body">
        <p>Secrets are stored in the operating system's secure keychain. Users enter credentials once, and they're securely persisted.</p>
        <div class="secret-use-cases">
          <span class="use-case ok">Mobile (Android/iOS)</span>
          <span class="use-case ok">Desktop (Mac/Win/Linux)</span>
          <span class="use-case ok">Distribution</span>
          <span class="use-case bad">Server</span>
          <span class="use-case bad">Docker</span>
        </div>
        <div class="secret-platforms">
          <div class="keyring-platform">
            <strong>macOS:</strong> Keychain Access
          </div>
          <div class="keyring-platform">
            <strong>Windows:</strong> Credential Manager
          </div>
          <div class="keyring-platform">
            <strong>Linux:</strong> GNOME Keyring / KWallet
          </div>
          <div class="keyring-platform">
            <strong>iOS:</strong> Keychain Services
          </div>
          <div class="keyring-platform">
            <strong>Android:</strong> Keystore System
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="secrets-summary">
    <h4>Quick Reference</h4>
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Server / CLI</th>
          <th>Docker</th>
          <th>Serverless</th>
          <th>Mobile</th>
          <th>Desktop</th>
          <th>Distributable</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>.env</code> inside .habit</td>
          <td data-label="Server / CLI"><component :is="Check" :size="18" class="icon-check" /></td>
          <td data-label="Docker"><component :is="Check" :size="18" class="icon-check" /></td>
          <td data-label="Serverless"><component :is="Check" :size="18" class="icon-check" /></td>
          <td data-label="Mobile"><component :is="X" :size="18" class="icon-x" /></td>
          <td data-label="Desktop"><component :is="X" :size="18" class="icon-x" /></td>
          <td data-label="Distributable"><component :is="X" :size="18" class="icon-x" /></td>
        </tr>
        <tr>
          <td><code>.env</code> beside .habit</td>
          <td data-label="Server / CLI"><component :is="Check" :size="18" class="icon-check" /></td>
          <td data-label="Docker"><component :is="Check" :size="18" class="icon-check" /></td>
          <td data-label="Serverless"><component :is="Check" :size="18" class="icon-check" /></td>
          <td data-label="Mobile"><component :is="X" :size="18" class="icon-x" /></td>
          <td data-label="Desktop"><component :is="X" :size="18" class="icon-x" /></td>
          <td data-label="Distributable"><component :is="Check" :size="18" class="icon-check" /></td>
        </tr>
        <tr>
          <td>OS Keyring</td>
          <td data-label="Server / CLI"><component :is="X" :size="18" class="icon-x" /></td>
          <td data-label="Docker"><component :is="X" :size="18" class="icon-x" /></td>
          <td data-label="Serverless"><component :is="X" :size="18" class="icon-x" /></td>
          <td data-label="Mobile"><component :is="Check" :size="18" class="icon-check" /></td>
          <td data-label="Desktop"><component :is="Check" :size="18" class="icon-check" /></td>
          <td data-label="Distributable"><component :is="Check" :size="18" class="icon-check" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Portability Section -->
<div class="spec-section portability-section" id="portability">
  <h2><component :is="Globe" :size="24" /> Execution Profiles <span class="section-badge informative">Informative</span></h2>
  
  <p class="section-intro">
    This section describes common deployment targets for .habit packages. Runtime implementations may support any subset of these profiles.
  </p>
  
  <div class="impl-note">
    <component :is="Info" :size="18" />
    <span><strong>Cortex Reference Implementation:</strong> Supports all six execution profiles below. Third-party implementations may support a subset.</span>
  </div>

  <div class="portability-grid">
    <div class="portability-card mobile">
      <div class="platform-header">
        <component :is="Smartphone" :size="32" />
        <h3>Mobile Devices</h3>
      </div>
      <div class="platform-details">
        <div class="requirement-badge zero">Zero Installation</div>
        <ul>
          <li>Offline-first architecture</li>
          <li>Open directly in Cortex App</li>
          <li>Secrets secured with system Keyring</li>
        </ul>
        <div class="supported-platforms">
          <span class="platform-tag">Android 8+</span>
          <span class="platform-tag">iOS 14+</span>
        </div>
      </div>
    </div>

<div class="portability-card desktop">
      <div class="platform-header">
        <component :is="Monitor" :size="32" />
        <h3>Desktop</h3>
      </div>
      <div class="platform-details">
        <div class="requirement-badge zero">Zero Installation</div>
        <ul>
          <li>Offline-first architecture</li>
          <li>Native file system access</li>
          <li>Secrets secured with system Keyring</li>
        </ul>
        <div class="supported-platforms">
          <span class="platform-tag">Windows 10+</span>
          <span class="platform-tag">macOS 11+</span>
          <span class="platform-tag">Linux</span>
        </div>
      </div>
    </div>

<div class="portability-card embedded">
      <div class="platform-header">
        <component :is="Cpu" :size="32" />
        <h3>Embedded / IoT</h3>
      </div>
      <div class="platform-details">
        <div class="requirement-badge first">First-Run Setup</div>
        <ul>
          <li>Minimal resource footprint</li>
          <li>ARM architecture support</li>
          <li>Headless operation</li>
          <li>MQTT triggers (planned)</li>
        </ul>
        <div class="supported-platforms">
          <span class="platform-tag">Raspberry Pi</span>
          <span class="platform-tag">ARM64</span>
          <span class="platform-tag">x86</span>
        </div>
      </div>
    </div>    

<div class="portability-card server">
      <div class="platform-header">
        <component :is="Server" :size="32" />
        <h3>Server / CLI</h3>
      </div>
      <div class="platform-details">
        <div class="requirement-badge first">First-Run Setup</div>
        <ul>
          <li>Single command: <code>npx @ha-bits/cortex</code></li>
          <li>HTTP API auto-exposed</li>
          <li>WebSocket support</li>
          <li>Multi-workflow routing</li>
        </ul>
        <div class="supported-platforms">
          <span class="platform-tag">Node.js 24+</span>
        </div>
      </div>
    </div>

<div class="portability-card serverless">
      <div class="platform-header">
        <component :is="Cloud" :size="32" />
        <h3>Serverless</h3>
      </div>
      <div class="platform-details">
        <div class="requirement-badge first">First-Run Setup</div>
        <ul>
          <li>Extract and deploy bundle</li>
          <li>Stateless by design</li>
          <li>Cold start optimized</li>
          <li>Edge runtime compatible</li>
        </ul>
        <div class="supported-platforms">
          <span class="platform-tag">Vercel</span>
          <span class="platform-tag">AWS Lambda</span>
          <span class="platform-tag">Cloudflare Workers</span>
        </div>
      </div>
    </div>

<div class="portability-card docker">
      <div class="platform-header">
        <component :is="Container" :size="32" />
        <h3>Containers</h3>
      </div>
      <div class="platform-details">
        <div class="requirement-badge first">First-Run Setup</div>
        <ul>
          <li>Base image provided</li>
          <li>Mount .habit at runtime</li>
          <li>Health checks included</li>
          <li>K8s manifests available</li>
        </ul>
        <div class="supported-platforms">
          <span class="platform-tag">Docker</span>
          <span class="platform-tag">Podman</span>
          <span class="platform-tag">Kubernetes</span>
        </div>
      </div>
    </div>


  </div>

  <div class="first-run-note">
    <h4>What is "First-Run Setup"?</h4>
    <p>Platforms marked with <span class="requirement-badge first inline">First-Run Setup</span> require a one-time installation of the Cortex runtime. You can either let it do the installations on the first request/run. After the initial setup, the habit will run everytime without any installations.</p>
    <p><strong>In case you want to do the installation manually instead of the first run:</strong></p>
    <div class="install-command">
      <code>npx @ha-bits/cortex install --config ./my-app.habit</code>
    </div>
    <p class="note-hint">This command installs the bits needed and their dependencies, this is recommended for containers and serverless functions.</p>
  </div>
</div>

<!-- Open Governance Section -->
<div class="spec-section governance-section" id="governance">
  <h2><component :is="BookOpen" :size="24" /> Open Governance <span class="section-badge normative">Normative</span></h2>
  
  <p class="section-intro">
    The .habit format is an open specification governed by the following policies.
  </p>

  <div class="governance-grid">
    <div class="governance-item">
      <div class="card-icon">
        <component :is="BookOpen" :size="32" />
      </div>
      <div class="card-content">
        <h4>Specification License</h4>
        <p>This specification is released under the <strong>Apache 2.0 License</strong>. Anyone may implement .habit readers/writers without royalty or restriction.</p>
      </div>
    </div>
    <div class="governance-item">
      <div class="card-icon">
        <component :is="Code" :size="32" />
      </div>
      <div class="card-content">
        <h4>Extension Namespace</h4>
        <p>Custom fields in <code>stack.yaml</code> MUST use a vendor prefix (e.g., <code>x-mycompany-*</code>). Unprefixed fields are reserved for future specification use.</p>
      </div>
    </div>
    <div class="governance-item">
      <div class="card-icon">
        <component :is="FileText" :size="32" />
      </div>
      <div class="card-content">
        <h4>Reserved File Names</h4>
        <p>The following file names at the archive root are reserved: <code>stack.yaml</code>, <code>cortex-bundle.js</code>, <code>SIGNATURE</code>, <code>MANIFEST.json</code>, <code>LICENSE</code>, <code>README.md</code>.</p>
      </div>
    </div>
  </div>
</div>

<hr class="appendix-divider" />

<h2 class="appendix-header">Appendices</h2>
<p class="appendix-intro">The following sections are non-normative and describe the Cortex reference implementation.</p>

<div class="appendix-source-links">
  <h4>Source Code (Apache 2.0 · GitHub)</h4>
  <ul>
    <li><a href="https://github.com/Codenteam/habits/tree/main/packages/cortex/server" target="_blank">packages/cortex/server</a>: Node.js runtime for server, Docker, and serverless deployments</li>
    <li><a href="https://github.com/Codenteam/habits/tree/main/habits-cortex/" target="_blank">habits-cortex/</a>: Tauri application for desktop (macOS, Windows, Linux) and mobile (iOS, Android)</li>
  </ul>
</div>

<!-- Running Screenshots Section -->
<div class="spec-section screenshots-section appendix" id="running">
  <h2><component :is="Play" :size="24" /> Appendix A: Running .habit Files <span class="section-badge cortex">Cortex</span></h2>

  <p class="section-intro">
    This appendix describes how the Cortex reference implementation runs .habit files. Other runtimes may implement different approaches.
  </p>

  <div class="running-modes-comparison">
    <div class="mode-card app-mode">
      <div class="mode-header">
        <component :is="Smartphone" :size="24" />
        <h4>Interactive App Profile</h4>
      </div>
      <div class="mode-requirements">
        <span class="requirement-badge zero">Zero Installation for End Users</span>
      </div>
      <ul class="mode-details">
        <li>Runtime bundled as native application</li>
        <li>Supports offline package loading</li>
        <li>Uses OS Keyring for secret storage</li>
        <li>Provides GUI for workflow management</li>
        <li>Target: Desktop, Mobile, Personal automation</li>
      </ul>
    </div>
    <div class="mode-card server-mode">
      <div class="mode-header">
        <component :is="Server" :size="24" />
        <h4>Daemon/Server Profile</h4>
      </div>
      <div class="mode-requirements">
        <span class="requirement-badge first">Requires Runtime Environment</span>
      </div>
      <ul class="mode-details">
        <li>Runtime invoked via CLI or process manager</li>
        <li>Exposes HTTP API for workflow execution</li>
        <li>Supports <code>.env</code> file for secrets</li>
        <li>Supports both polling and webhook triggers</li>
        <li>Target: Servers, Containers, CI/CD, Integrations</li>
      </ul>
    </div>
  </div>

  <h3 class="impl-header"><component :is="Code" :size="20" /> Cortex Reference Implementation</h3>

  <div class="screenshots-tabs">
    <div class="tab-group">
      <h3><component :is="Monitor" :size="20" /> In the Cortex App <span class="requirement-badge zero inline">Interactive App</span></h3>
      <p class="tab-requirement">Run by downloading the app: no Node.js, npm, or terminal needed.</p>
      <div class="screenshot-trio">
        <div class="screenshot-item">
          <img :src="withBase('/images/cortex-app/home.webp')" alt="Cortex App Home Screen" @click="openLightbox('/images/cortex-app/home.webp', 'Cortex App Home Screen')" />
          <span class="screenshot-label">Home Screen</span>
        </div>
        <div class="screenshot-item">
          <img :src="withBase('/images/cortex-app/add.webp')" alt="Cortex App Add New Habit" @click="openLightbox('/images/cortex-app/add.webp', 'Cortex App Add New Habit')" />
          <span class="screenshot-label">Add New Habit</span>
        </div>
        <div class="screenshot-item">
          <img :src="withBase('/images/cortex-app/secrets.webp')" alt="Set Secrets (If needed)" @click="openLightbox('/images/cortex-app/secrets.webp', 'Set Secrets')" />
          <span class="screenshot-label">Set Secrets</span>
        </div>
      </div>
      <div class="screenshot-steps">
        <div class="step">
          <span class="step-num">1</span>
          <span>Click "Open Habit" or drag file into window</span>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <span>Select Source</span>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <span>Add Secrets (if any)</span>
        </div>
        <div class="step">
          <span class="step-num">4</span>
          <span>Click to run</span>
        </div>
      </div>
    </div>

<div class="tab-group">
      <h3><component :is="Terminal" :size="20" /> Via Terminal (npx) <span class="requirement-badge first inline">Daemon/Server</span></h3>
      <p class="tab-requirement">Requires Node.js 24+. Runs as a background server exposing HTTP API.</p>
      <div class="terminal-trio">
        <div class="terminal-trio-item command">
          <div class="terminal-box">
            <div class="terminal-header-mini">
              <span class="terminal-dot red"></span>
              <span class="terminal-dot yellow"></span>
              <span class="terminal-dot green"></span>
            </div>
            <div class="terminal-content">
              <div class="terminal-line"><span class="prompt">$</span> npx @ha-bits/cortex --config ./my-app.habit</div>
              <div class="terminal-line"></div>
              <div class="terminal-line output">Cortex server starting...</div>
              <div class="terminal-line output">Loading: my-app.habit</div>
              <div class="terminal-line output">Workflows registered:</div>
              <div class="terminal-line output">   - generate-recipe</div>
              <div class="terminal-line output">   - list-recipes</div>
              <div class="terminal-line"><span class="output">Server running at </span><span class="url">http://localhost:3000</span></div>
              <div class="terminal-line"><span class="output">API available at </span><span class="url">http://localhost:3000/api</span></div>
            </div>
          </div>
          <span class="screenshot-label">Run Command</span>
        </div>
        <div class="terminal-trio-item">
          <img :src="withBase('/images/frontend-small.webp')" alt="Cortex Server Running at localhost:3000" @click="openLightbox('/images/frontend-small.webp', 'Automation Frontend')" />
          <span class="screenshot-label">Automation Frontend (If provided)</span>
          <img :src="withBase('/images/cortex.webp')" alt="Cortex Server Running at localhost:3000" @click="openLightbox('/images/cortex.webp', 'Automation Monitoring')" />
          <span class="screenshot-label">Automation Monitoring</span>
        </div>
        <div class="terminal-trio-item">
          <img :src="withBase('/images/swagger.webp')" alt="Swagger API Documentation" @click="openLightbox('/images/swagger.webp', 'API Documentation')" />
          <span class="screenshot-label">API Documentation</span>
        </div>
      </div>
    </div>
  </div>
</div>


<!-- Viewing Screenshots Section -->
<div class="spec-section screenshots-section appendix" id="viewing">
  <h2><component :is="Eye" :size="24" /> Appendix B: Viewing Contents <span class="section-badge cortex">Cortex</span></h2>

  <p class="section-intro">Compliant viewers SHOULD be able to display each workflow in the package independently.</p>

  <div class="screenshots-tabs">
    <div class="tab-group">
      <h3><component :is="Monitor" :size="20" /> In the Cortex App</h3>
      <div class="screenshot-trio">
        <div class="screenshot-item">
          <img :src="withBase('/images/cortex-app/home.webp')" alt="Cortex App Home Screen" @click="openLightbox('/images/cortex-app/home.webp', 'Cortex App Home Screen')" />
          <span class="screenshot-label">Home Screen</span>
        </div>
        <div class="screenshot-item">
          <img :src="withBase('/images/cortex-app/options.webp')" alt="Cortex App Workflow Options" @click="openLightbox('/images/cortex-app/options.webp', 'Workflow Options')" />
          <span class="screenshot-label">Workflow Options</span>
        </div>
        <div class="screenshot-item">
          <img :src="withBase('/images/cortex-app/view-out.webp')" alt="Cortex App View Output" @click="openLightbox('/images/cortex-app/view-out.webp', 'View Output')" />
          <span class="screenshot-label">View Output</span>
        </div>
      </div>
    </div>

<div class="tab-group">
      <h3><component :is="Globe" :size="20" /> In the Base UI</h3>
      <div class="screenshot-placeholder">
        <div class="placeholder-content">
          <component :is="Globe" :size="48" />
          <p>Screenshot: Browsing and inspecting habits in the Base web interface</p>          
        </div>
        <img :src="withBase('/images/base.webp')" @click="openLightbox('/images/base.webp', 'Base UI')">
      </div>
    </div>

  </div>
</div>


<!-- Generate Your Own Section -->
<div class="spec-section generate-section appendix">
  <h2><component :is="Package" :size="24" /> Appendix C: Authoring and Packaging <span class="section-badge cortex">Cortex</span></h2>
</div>

First, create a regular stack using one of these methods:

<div class="creation-methods">
  <a :href="withBase('/getting-started/first-habit')" class="method-card">
    <component :is="Monitor" :size="28" />
    <div class="method-info">
      <h4>Base UI</h4>
      <p>Visual editor with drag-and-drop workflow builder</p>
    </div>
  </a>
  <a :href="withBase('/getting-started/first-habit-using-ai')" class="method-card">
    <component :is="Zap" :size="28" />
    <div class="method-info">
      <h4>AI Generation</h4>
      <p>Describe what you want and let AI create the habit</p>
    </div>
  </a>
  <a :href="withBase('/getting-started/first-habit-mixed')" class="method-card">
    <component :is="FileText" :size="28" />
    <div class="method-info">
      <h4>Habit-as-Code</h4>
      <p>Write YAML/JSON directly in your favorite editor</p>
    </div>
  </a>
</div>

### **Step 1: Define Your Stack**

You can use Habits Base or just write the stack.yaml, the habit files in yaml and frontends.

```yaml
# stack.yaml
version: "1.0"
name: "my-automation"

workflows:
  - id: main
    path: ./habits/main.yaml

server:
  frontend: ./frontend
  port: 3000
```

### **Step 2: Pack It**

```bash
$ npx habits pack --format habit --config ./stack.yaml
```

### **Step 3: Distribute**
<br />

<div class="distribute-box">
  <ul class="distribute-list">
    <li><component :is="Mail" :size="18" /> Share via email, chat, or file transfer</li>
    <li><component :is="Globe" :size="18" /> Host on any web server or CDN</li>
    <li><component :is="Package" :size="18" /> Publish to habits registry (If you want)</li>
    <li><component :is="Store" :size="18" /> Submit to your company Habits marketplace (Enterprise)</li>
  </ul>
</div>
<p></p>
<br />

<!-- Related Links -->
<div class="spec-section related-section">
  <h2>Related Documentation</h2>
  <div class="related-links">
    <a :href="withBase('/downloads')" class="related-card">
      <component :is="Monitor" :size="24" />
      <div>
        <h4>Download Cortex App</h4>
        <p>Get the desktop app to run .habit files</p>
      </div>
    </a>
    <a :href="withBase('/deep-dive/pack-distribute')" class="related-card">
      <component :is="Package" :size="24" />
      <div>
        <h4>Packing Guide</h4>
        <p>Learn all distribution formats</p>
      </div>
    </a>
    <a :href="withBase('/getting-started/first-habit')" class="related-card">
      <component :is="Zap" :size="24" />
      <div>
        <h4>Build Your First Habit</h4>
        <p>Get started in 5 minutes</p>
      </div>
    </a>
  </div>
</div>

</div>

<!-- Lightbox Modal -->
<Teleport to="body">
  <div v-if="lightboxVisible" class="lightbox-overlay" @click="closeLightbox">
    <span class="lightbox-close" @click="closeLightbox">&times;</span>
    <img :src="lightboxImg" :alt="lightboxAlt" class="lightbox-image" @click.stop />
    <div v-if="lightboxAlt" class="lightbox-caption" @click.stop>{{ lightboxAlt }}</div>
  </div>
</Teleport>

<style>

  h3 {
    font-size: 150%;
    line-height: 150%;
    font-weight: bold;
    margin-top: 10px;
  }
/* Spec Disclaimer */
.spec-disclaimer {
  display: flex;
  gap: 16px;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 48px;
}

.spec-disclaimer svg {
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
  margin-top: 2px;
}

.spec-disclaimer strong {
  display: inline-block;
  color: var(--vp-c-text-1);
}

.spec-disclaimer p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.6;
}

.spec-disclaimer a {
  color: var(--vp-c-brand-1);
}

/* Reference Implementation Box */
.reference-impl-box {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 48px;
}

.reference-impl-box h4 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.reference-impl-box h4 svg {
  color: var(--vp-c-brand-1);
}

.reference-impl-box > p {
  margin: 0 0 16px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.impl-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.impl-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.impl-link:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.impl-link svg {
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

.impl-link strong {
  color: var(--vp-c-text-1);
}

/* Why Open Box */
.why-open-box {
  background: linear-gradient(135deg, #10b98110 0%, #3b82f610 100%);
  border: 1px solid #10b98140;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 48px;
}

.why-open-box h4 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.why-open-box h4 svg {
  color: #10b981;
}

.why-open-box > p {
  margin: 0 0 14px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.why-open-list {
  margin: 0 0 14px;
  padding: 0 0 0 20px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.why-open-list li {
  margin-bottom: 8px;
}

.why-open-list li:last-child {
  margin-bottom: 0;
}

.why-open-list strong {
  color: var(--vp-c-text-1);
}

.why-open-footer {
  margin: 0;
  padding-top: 12px;
  border-top: 1px dashed #10b98140;
  font-size: 0.85rem;
  font-style: italic;
  color: #10b981;
}

/* App Types Box */
.app-types-box {
  background: linear-gradient(135deg, #8b5cf610 0%, #6366f110 100%);
  border: 1px solid #8b5cf640;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 32px;
}

.app-types-box h4 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.app-types-box h4 svg {
  color: #8b5cf6;
}

.app-types-box > p {
  margin: 0 0 14px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.app-types-list {
  margin: 0;
  padding: 0 0 0 20px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.8;
}

.app-types-list li {
  margin-bottom: 6px;
}

.app-types-list li:last-child {
  margin-bottom: 0;
}

.app-types-list strong {
  color: var(--vp-c-text-1);
}

/* Capability Banner */
.capability-statement {
  text-align: center;
  font-size: 1rem;
  color: var(--vp-c-text-2);
  margin: 48px auto 24px;
  max-width: 700px;
  line-height: 1.6;
}

.capability-statement code {
  background: linear-gradient(135deg, #8b5cf620 0%, #06b6d420 100%);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}

/* Shared Card Styles */
.card-icon {
  width: 48px;
  height: 48px;
  min-width: 48px;
  background: var(--vp-c-brand-soft);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-brand-1);
}

.card-content {
  flex: 1;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.capability-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  transition: all 0.2s ease;
}

.capability-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.capability-card.format {
  border-left: 3px solid #3b82f6;
}

.capability-card.format .card-icon {
  background: #3b82f620;
  color: #3b82f6;
}

.capability-card.runtime {
  border-left: 3px solid #10b981;
}

.capability-card.runtime .card-icon {
  background: #10b98120;
  color: #10b981;
}

.capability-card h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 600;
}

.capability-card p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.capability-section {
  margin-bottom: 32px;
}

.capability-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--vp-c-divider);
}

.capability-section-title svg {
  color: var(--vp-c-brand-1);
}

/* Journey Navigation - Creative TOC */
.journey-nav {
  background: linear-gradient(135deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg-alt) 100%);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 28px 32px;
  margin-bottom: 48px;
}

.journey-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.journey-title h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  border: none;
  padding: 0;
}

.journey-icon {
  font-size: 1.4rem;
}

.journey-path {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  overflow-x: auto;
  padding: 8px 0;
  margin-bottom: 20px;
}

.journey-stop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
  min-width: 90px;
}

.journey-stop:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
}

.stop-marker {
  width: 36px;
  height: 36px;
  background: var(--vp-c-brand-soft);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-brand-1);
}

.journey-stop:hover .stop-marker {
  background: var(--vp-c-brand-1);
  color: white;
}

.stop-content {
  text-align: center;
}

.stop-label {
  display: block;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
  margin-bottom: 2px;
}

.stop-title {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.journey-connector {
  width: 24px;
  height: 2px;
  background: linear-gradient(90deg, var(--vp-c-divider), var(--vp-c-brand-soft));
  flex-shrink: 0;
}

.journey-appendix {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--vp-c-divider);
}

.appendix-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vp-c-text-3);
  font-weight: 500;
}

.appendix-links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.appendix-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: all 0.2s ease;
}

.appendix-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.appendix-chip svg {
  width: 14px;
  height: 14px;
}

@media (max-width: 900px) {
  .journey-path {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .journey-connector {
    display: none;
  }
  
  .journey-stop {
    flex: 0 0 calc(33.33% - 8px);
    margin-bottom: 8px;
  }
}

@media (max-width: 600px) {
  .capability-grid {
    grid-template-columns: 1fr;
  }
  
  .journey-stop {
    flex: 0 0 calc(50% - 8px);
  }
  
  .journey-nav {
    padding: 20px;
  }
}

/* Appendix Source Links */
.appendix-source-links {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 32px;
}

.appendix-source-links h4 {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
}

.appendix-source-links ul {
  margin: 0;
  padding: 0 0 0 20px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.appendix-source-links li {
  margin-bottom: 6px;
}

.appendix-source-links li:last-child {
  margin-bottom: 0;
}

.appendix-source-links a {
  color: var(--vp-c-brand-1);
  font-family: 'SF Mono', monospace;
  font-size: 0.8rem;
}

/* Section Badges */
.section-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.65rem;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-left: 12px;
  vertical-align: middle;
}

.section-badge.normative {
  background: #22c55e20;
  color: #22c55e;
  border: 1px solid #22c55e40;
}

.section-badge.informative {
  background: #3b82f620;
  color: #3b82f6;
  border: 1px solid #3b82f640;
}

.section-badge.cortex {
  background: #8b5cf620;
  color: #8b5cf6;
  border: 1px solid #8b5cf640;
}

.section-badge.example {
  background: #f59e0b20;
  color: #f59e0b;
  border: 1px solid #f59e0b40;
}

/* RFC Keywords */
.rfc-keyword {
  font-family: 'SF Mono', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 4px;
}

.rfc-keyword.must {
  background: #ef444420;
  color: #ef4444;
}

.rfc-keyword.should {
  background: #f59e0b20;
  color: #f59e0b;
}

.rfc-keyword.may {
  background: #22c55e20;
  color: #22c55e;
}

/* Conformance Section */
.conformance-block {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.conformance-block h3 {
  margin: 0 0 16px;
  font-size: 1rem;
}

.conformance-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.conformance-list li {
  padding: 8px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.conformance-list li:last-child {
  border-bottom: none;
}

.conformance-note {
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--vp-c-bg-alt);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.conformance-note strong {
  color: var(--vp-c-text-2);
}

/* Archive Semantics */
.semantics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

@media (max-width: 600px) {
  .semantics-grid {
    grid-template-columns: 1fr;
  }
}

.semantics-item {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.semantics-item h4 {
  margin: 0 0 6px;
  font-size: 1.1rem;
}

.semantics-item p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

/* Schema Table */
.schema-table-container {
  overflow: visible;
}

.schema-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.schema-table th,
.schema-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.schema-table th {
  background: var(--vp-c-bg-soft);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.schema-table td {
  color: var(--vp-c-text-2);
}

.schema-table td:first-child {
  color: var(--vp-c-text-1);
}

.schema-table code {
  font-size: 0.8rem;
}

/* Responsive tables - columns to rows on mobile */
@media (max-width: 768px) {
  .schema-table,
  .schema-table thead,
  .schema-table tbody,
  .schema-table th,
  .schema-table td,
  .schema-table tr {
    display: block;
  }

  .schema-table thead {
    display: none;
  }

  .schema-table tr {
    margin-bottom: 16px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    background: var(--vp-c-bg-soft);
    padding: 12px;
  }

  .schema-table td {
    border-bottom: none;
    padding: 8px 0;
    gap: 12px;
  }

  .schema-table td::before {
    content: attr(data-label);
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--vp-c-text-3);
    flex-shrink: 0;
  }

  .schema-table td:not(:last-child) {
    border-bottom: 1px solid var(--vp-c-divider);
    padding-bottom: 12px;
    margin-bottom: 4px;
  }

  .secrets-summary table,
  .secrets-summary thead,
  .secrets-summary tbody,
  .secrets-summary th,
  .secrets-summary td,
  .secrets-summary tr {
    display: block;
  }

  .secrets-summary thead {
    display: none;
  }

  .secrets-summary table {
    min-width: 0 !important;
  }

  .secrets-summary tr {
    margin-bottom: 16px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    background: var(--vp-c-bg-alt);
    padding: 12px;
  }

  .secrets-summary td {
    border-bottom: none;
    padding: 8px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    text-align: right !important;
  }

  .secrets-summary td::before {
    content: attr(data-label);
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--vp-c-text-3);
    text-align: left;
  }

  .secrets-summary td:first-child {
    font-weight: 600;
    background: var(--vp-c-bg-soft);
    margin: -12px -12px 8px -12px;
    padding: 10px 12px;
    border-radius: 8px 8px 0 0;
    text-align: left !important;
  }

  .secrets-summary td:first-child::before {
    display: none;
  }

  .secrets-summary td:not(:last-child):not(:first-child) {
    border-bottom: 1px solid var(--vp-c-divider);
    padding-bottom: 12px;
  }
}

/* Workflow Example */
.example-workflow {
  margin: 16px 0;
}

.template-list {
  margin: 12px 0;
  padding: 0 0 0 20px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.template-list li {
  margin-bottom: 8px;
}

.template-list code {
  background: var(--vp-c-bg-alt);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--vp-c-brand-1);
}

/* Deprecation Notice */
.deprecation-notice {
  display: flex;
  gap: 14px;
  background: #f59e0b15;
  border: 1px solid #f59e0b40;
  border-radius: 10px;
  padding: 16px 20px;
  margin: 24px 0;
}

.deprecation-notice svg {
  color: #f59e0b;
  flex-shrink: 0;
  margin-top: 2px;
}

.deprecation-notice strong {
  display: block;
  margin-bottom: 6px;
  color: #f59e0b;
}

.deprecation-notice p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.deprecated-badge {
  display: inline-block;
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: #ef444420;
  color: #ef4444;
  border: 1px solid #ef444440;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-left: 8px;
  vertical-align: middle;
}

.example-workflow.deprecated {
  opacity: 0.7;
  padding-left: 12px;
}

/* Versioning Rules */
.versioning-rules {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

@media (max-width: 600px) {
  .versioning-rules {
    grid-template-columns: 1fr;
  }
}

.version-rule {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.version-rule h4 {
  margin: 0 0 6px;
  font-size: 1.1rem;
}

.version-rule p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

/* Governance Section */
.governance-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

@media (max-width: 600px) {
  .governance-grid {
    grid-template-columns: 1fr;
  }
}

.governance-item {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.governance-item h4 {
  margin: 0 0 6px;
  font-size: 1.1rem;
}

.governance-item p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

/* Implementation Notes */
.impl-note {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #8b5cf610;
  border: 1px solid #8b5cf630;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 24px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.impl-note svg {
  color: #8b5cf6;
  flex-shrink: 0;
}

.impl-note strong {
  color: #8b5cf6;
}

/* Appendix Styling */
.appendix-divider {
  border: none;
  border-top: 2px dashed var(--vp-c-divider);
  margin: 64px 0 32px;
}

.appendix-header {
  font-size: 1.5rem;
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.appendix-intro {
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
  margin-bottom: 48px;
}

.spec-section.appendix {
  opacity: 0.95;
}

/* Code Block Styling - Make bash and yaml blocks more prominent */
.spec-page div[class*="language-"] {
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin: 24px 0;
}

.spec-page div[class*="language-bash"],
.spec-page div[class*="language-sh"] {
  border: 1px solid #3b82f6;
  position: relative;
}

.spec-page div[class*="language-bash"]::before,
.spec-page div[class*="language-sh"]::before {
  content: "Terminal";
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 0.7rem;
  color: #60a5fa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.spec-page div[class*="language-yaml"],
.spec-page div[class*="language-yml"] {
  border: 1px solid #22c55e;
}

.spec-page div[class*="language-yaml"]::before,
.spec-page div[class*="language-yml"]::before {
  content: "";
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 0.7rem;
  color: #4ade80;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.spec-page div[class*="language-"] pre {
  padding: 20px 24px;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.spec-page div[class*="language-"] code {
  font-family: 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.7;
}

.lang {

        padding: 3px;
    /* margin-top: 10px; */
    border-radius: 7px;
}

/* Spec Page Layout */
.spec-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Hero Section */
.spec-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  padding: 48px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 48px;
}

.spec-hero-content {
  flex: 1;
}

.spec-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.spec-title {
  font-size: 4rem;
  line-height: 4rem;
  font-weight: 800;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  margin: 0 0 8px;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.spec-subtitle {
  font-size: 1.4rem;
  color: var(--vp-c-text-2);
  margin: 0 0 16px;
}

.spec-tagline {
  font-size: 1.1rem;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  margin: 0 0 24px;
  max-width: 600px;
}

.spec-hero-actions {
  display: flex;
  gap: 12px;
}

.spec-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.spec-btn.primary {
  background: var(--vp-c-brand-1);
  color: white;
}

.spec-btn.primary:hover {
  background: var(--vp-c-brand-2);
}

.spec-btn.secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.spec-btn.secondary:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

/* File Icon Visual */
.spec-hero-visual {
  flex-shrink: 0;
}

.file-icon-large {
  position: relative;
  width: 160px;
  height: 200px;
}

.file-icon-body {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 40px rgba(59, 130, 246, 0.3);
}

.file-ext {
  font-family: 'SF Mono', monospace;
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
}

.file-icon-fold {
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
  border-radius: 0 12px 0 12px;
}

/* Sections */
.spec-section {
  margin-bottom: 64px;
}

.spec-section h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.8rem;
  line-height: 1.8rem;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--vp-c-divider);
}

.section-intro {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin-bottom: 32px;
}

/* Principles Grid */
.principles-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

@media (max-width: 600px) {
  .principles-grid {
    grid-template-columns: 1fr;
  }
}

.principle-card {
  background: var(--vp-c-bg-soft);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.principle-icon {
  width: 48px;
  height: 48px;
  min-width: 48px;
  background: var(--vp-c-brand-soft);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-brand-1);
}

.principle-card h3 {
  font-size: 1.1rem;
  margin: 0 0 6px;
}

.principle-card p {
  color: var(--vp-c-text-2);
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* File Tree */
.file-tree-container {
  margin-bottom: 32px;
}

.file-tree {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  font-family: 'SF Mono', monospace;
  font-size: 0.9rem;
}

.file-tree-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  font-weight: 600;
}

.file-size {
  margin-left: auto;
  color: var(--vp-c-text-3);
  font-weight: 400;
}

.file-tree-content {
  padding: 16px;
}

.tree-item {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 8px;
  padding: 6px 0;
  align-items: center;
}

.tree-item.indent-1 {
  padding-left: 24px;
}

.tree-item.future {
  opacity: 0.5;
}

.tree-item.optional {
  opacity: 0.7;
  color: #f59e0b;
}

.tree-item.optional .tree-name,
.tree-item.optional .tree-desc {
  color: #f59e0b;
}

.tree-name {
  font-weight: 500;
}

.tree-desc {
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
}

.file-tree-legend {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  padding-left: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.current {
  background: var(--vp-c-brand-1);
}

.legend-dot.optional {
  background: #f59e0b;
}

.legend-item.cautious {
  color: #f59e0b;
}

.legend-dot.future {
  background: var(--vp-c-text-3);
}

/* Components Grid */
.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 32px;
}

.component-card {
  background: var(--vp-c-bg-soft);
  padding: 20px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
}

.component-card h4 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.component-card p {
  color: var(--vp-c-text-2);
  margin: 0 0 12px;
  font-size: 0.9rem;
}

.component-card ul {
  margin: 0;
  padding-left: 20px;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
}

.component-card li {
  margin-bottom: 4px;
}

.optional-badge {
  display: inline-block;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f59e0b20;
  color: #f59e0b;
  border: 1px solid #f59e0b40;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-left: 8px;
  vertical-align: middle;
}

.runtime-note {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--vp-c-bg-alt);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.runtime-note strong {
  color: var(--vp-c-text-2);
}

/* Security Section */
.security-flow {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
  overflow-x: auto;
  padding: 16px 0;
}

.security-step {
  flex: 1;
  min-width: 200px;
  text-align: center;
}

.step-number {
  width: 28px;
  height: 28px;
  background: var(--vp-c-brand-1);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  margin: 0 auto 12px;
}

.step-content {
  background: var(--vp-c-bg-soft);
  padding: 20px 16px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}

.step-icon {
  width: 48px;
  height: 48px;
  background: var(--vp-c-brand-soft);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-brand-1);
  margin: 0 auto 12px;
}

.step-content h4 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.step-content p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.security-arrow {
  font-size: 1.5rem;
  color: var(--vp-c-text-3);
  align-self: center;
  margin-top: 40px;
}

.security-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.security-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}

.security-card h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 12px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.95rem;
}

/* Terminal intro */
.terminal-intro {
  margin: 16px 0 0;
  font-size: 0.95rem;
}

/* Creation Methods Cards */
.creation-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 24px 0 32px;
}

.method-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.method-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.1);
}

.method-card svg {
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

.method-info h4 {
  margin: 0 0 4px;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.method-info p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

@media (max-width: 768px) {
  .creation-methods {
    grid-template-columns: 1fr;
  }
}

/* Distribute box */
.distribute-box {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px 24px;
}

.distribute-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.distribute-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--vp-c-text-2);
}

.distribute-list li:last-child {
  margin-bottom: 0;
}

.distribute-list li svg {
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

.security-note {
  display: flex;
  gap: 16px;
  background: var(--vp-c-brand-soft);
  padding: 16px 20px;
  border-radius: 8px;
  margin-top: 24px;
}

.note-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.note-content {
  font-size: 0.95rem;
  line-height: 1.6;
}

.note-content a {
  color: var(--vp-c-brand-1);
}

/* Portability Grid */
.portability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.portability-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  transition: border-color 0.2s;
}

.portability-card:hover {
  border-color: var(--vp-c-brand-1);
}

.platform-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: var(--vp-c-brand-1);
}

.platform-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--vp-c-text-1);
}

.requirement-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.requirement-badge.zero {
  background: #10b98120;
  color: #10b981;
}

.requirement-badge.first {
  background: #f59e0b20;
  color: #f59e0b;
}

.requirement-badge.inline {
  margin-bottom: 0;
  vertical-align: middle;
}

/* Running Modes Comparison */
.running-modes-comparison {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.mode-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
}

.mode-card.app-mode {
}

.mode-card.server-mode {
}

.mode-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.mode-header svg {
  color: var(--vp-c-brand-1);
}

.mode-header h4 {
  margin: 0;
  font-size: 1rem;
}

.mode-requirements {
  margin-bottom: 12px;
}

.mode-details {
  margin: 0;
  padding: 0 0 0 18px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.mode-details li {
  margin-bottom: 6px;
}

.mode-details li:last-child {
  margin-bottom: 0;
}

.mode-details code {
  font-size: 0.8rem;
  background: var(--vp-c-bg-alt);
  padding: 2px 6px;
  border-radius: 4px;
}

.impl-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 32px 0 20px;
  padding-top: 24px;
  border-top: 1px dashed var(--vp-c-divider);
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
}

.impl-header svg {
  color: #8b5cf6;
}

.tab-requirement {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  margin: 8px 0 16px;
  font-style: italic;
}

/* First-Run Setup Note */
.first-run-note {
  margin-top: 32px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.first-run-note h4 {
  margin: 0 0 12px;
  font-size: 1.1rem;
  color: var(--vp-c-text-1);
}

.first-run-note p {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.first-run-note .install-command {
  background: #1e1e1e;
  padding: 14px 18px;
  border-radius: 8px;
  margin: 12px 0;
  overflow-x: auto;
}

.first-run-note .install-command code {
  color: #4ade80;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.9rem;
}

.first-run-note .note-hint {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0;
}

/* Secrets Section */
.secrets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.secret-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}

.secret-card.warning {
  border-color: #f59e0b40;
}

.secret-card.recommended {
  border-color: #22c55e40;
}

.secret-header {
  padding: 16px 20px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.secret-icon {
  font-size: 1.5rem;
}

.secret-header h3 {
  margin: 0;
  font-size: 1rem;
  flex: 1;
}

.secret-badge {
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.secret-badge.not-recommended {
  background: #f59e0b20;
  color: #f59e0b;
}

.secret-badge.recommended {
  background: #22c55e20;
  color: #22c55e;
}

.secret-body {
  padding: 20px;
}

.secret-body p {
  margin: 0 0 16px;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.secret-use-cases {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.use-case {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 500;
}

.use-case.ok {
  background: #22c55e15;
  color: #22c55e;
}

.use-case.bad {
  background: #ef444415;
  color: #ef4444;
}

.secret-warning {
  background: #f59e0b10;
  border: 1px solid #f59e0b30;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.secret-warning strong {
  color: #f59e0b;
}

.secret-example {
  background: var(--vp-c-bg-alt);
  border-radius: 8px;
  padding: 14px 16px;
}

.secret-example code {
  font-family: 'SF Mono', monospace;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.secret-platforms {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.keyring-platform {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.keyring-platform strong {
  color: var(--vp-c-text-1);
}

.secrets-summary {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
}

.secrets-summary h4 {
  margin: 0 0 16px;
  font-size: 1.1rem;
}

.secrets-summary table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.secrets-summary th,
.secrets-summary td {
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid var(--vp-c-divider);
  vertical-align: middle;
}

.secrets-summary th {
  background: var(--vp-c-bg-alt);
  font-weight: 600;
  font-size: 0.8rem;
}

.secrets-summary td:first-child {
  text-align: left;
}

.secrets-summary td:not(:first-child) {
  text-align: center;
}

.secrets-summary td:not(:first-child) svg {
  display: block;
  margin: 0 auto;
}

.secrets-summary td code {
  font-size: 0.8rem;
}

.secrets-summary .icon-check,
.secrets-summary .icon-x {
  display: inline-block;
  vertical-align: middle;
}

.secrets-summary .icon-check {
  color: #22c55e;
}

.secrets-summary .icon-x {
  color: #ef4444;
}

.platform-details ul {
  margin: 0 0 16px;
  padding-left: 20px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.platform-details li {
  margin-bottom: 4px;
}

.supported-platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.platform-tag {
  background: var(--vp-c-bg-alt);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

/* Screenshots Section */
.screenshots-tabs {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.tab-group {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
}

.tab-group h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 1.1rem;
}

.screenshot-placeholder {
  background: var(--vp-c-bg-alt);
  border: 2px dashed var(--vp-c-divider);
  border-radius: 8px;
  padding: 48px 24px;
  text-align: center;
}

.screenshot-placeholder.small {
  padding: 32px 16px;
}

/* Screenshot Trio Layout */
.screenshot-trio {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.screenshot-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.screenshot-item .screenshot-placeholder {
  width: 100%;
  aspect-ratio: 9/16;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.screenshot-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.screenshot-item .placeholder-note {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

.screenshot-item .placeholder-note code {
  font-size: 0.65rem;
}

@media (max-width: 640px) {
  .screenshot-trio {
    grid-template-columns: 1fr;
  }
  
  .screenshot-item .screenshot-placeholder {
    aspect-ratio: 16/9;
  }
}

/* Terminal Trio Layout */
.terminal-trio {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.terminal-trio-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.terminal-trio-item img {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.terminal-trio-item.command {
  align-items: stretch;
}

.terminal-box {
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.terminal-header-mini {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  background: #2d2d2d;
}

.terminal-content {
  margin: 0;
  padding: 14px 16px;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  color: #e0e0e0;
  overflow-x: auto;
  flex: 1;
}

.terminal-line {
  white-space: pre;
  min-height: 1.2em;
}

.terminal-line.output {
  color: #a0a0a0;
}

.terminal-content .prompt {
  color: #28c840;
}

.terminal-content .output {
  color: #a0a0a0;
}

.terminal-content .url {
  color: #60a5fa;
}

@media (max-width: 768px) {
  .terminal-trio {
    grid-template-columns: 1fr;
  }
}

.placeholder-content {
  color: var(--vp-c-text-3);
  display: flex;
}

.placeholder-content p {
  margin: 16px 0 8px;
  font-size: 1rem;
}

.placeholder-note {
  font-size: 0.85rem;
  font-family: 'SF Mono', monospace;
}

.placeholder-note code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: 4px;
}

.screenshot-steps {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.screenshot-steps .step {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--vp-c-bg-alt);
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.step-num {
  width: 22px;
  height: 22px;
  background: var(--vp-c-brand-1);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Terminal Demo */
.terminal-demo {
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  font-family: 'SF Mono', monospace;
}

.terminal-demo.compact {
  margin-top: 12px;
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #2d2d2d;
}

.terminal-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal-dot.red { background: #ff5f57; }
.terminal-dot.yellow { background: #febc2e; }
.terminal-dot.green { background: #28c840; }

.terminal-title {
  margin-left: 8px;
  color: #808080;
  font-size: 0.85rem;
}

.terminal-body {
  padding: 16px;
  font-size: 0.85rem;
  line-height: 1.6;
  overflow-x: auto;
}

.terminal-body pre {
  margin: 0;
}

.terminal-body .prompt { color: #28c840; }
.terminal-body .command { color: #ffffff; }
.terminal-body .output { color: #a0a0a0; }
.terminal-body .url { color: #60a5fa; }
.terminal-body .comment { color: #6a737d; }
.terminal-body .yaml { color: #79c0ff; }

.terminal-options {
  margin-top: 20px;
}

.terminal-options h4 {
  margin: 0 0 12px;
  font-size: 0.95rem;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.option {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--vp-c-bg-alt);
  padding: 10px 14px;
  border-radius: 6px;
}

.option code {
  font-size: 0.85rem;
  color: var(--vp-c-brand-1);
}

.option span {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

/* Comparison Table */
.comparison-table {
  overflow-x: auto;
  margin-bottom: 32px;
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.comparison-table th {
  background: var(--vp-c-bg-soft);
  font-weight: 600;
}

.comparison-table td {
  color: var(--vp-c-text-2);
}

.comparison-table td:first-child {
  color: var(--vp-c-text-1);
}

/* Future Considerations */
.future-considerations h3 {
  margin: 0 0 20px;
  font-size: 1.2rem;
}

.consideration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.consideration-card {
  background: var(--vp-c-bg-soft);
  padding: 20px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
}

.consideration-card h4 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.consideration-card p {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.consideration-card a {
  color: var(--vp-c-brand-1);
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.planned {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.status-badge.future {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
}

/* Generate Section */
.generate-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.generate-step {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
}

.step-badge {
  width: 28px;
  height: 28px;
  background: var(--vp-c-brand-1);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.step-header h4 {
  margin: 0;
  font-size: 1rem;
}

.generate-step .code-block,
.generate-step .terminal-demo {
  margin: 0;
  border-radius: 0;
}

.distribute-options {
  margin: 0;
  padding: 20px 20px 20px 40px;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
}

.distribute-options li {
  margin-bottom: 8px;
}

/* Related Links */
.related-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.related-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  text-decoration: none;
  color: var(--vp-c-brand-1);
  transition: all 0.2s;
}

.related-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.related-card h4 {
  margin: 0 0 4px;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.related-card p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

/* Responsive */
@media (max-width: 768px) {
  .spec-hero {
    flex-direction: column;
    text-align: center;
  }
  
  .spec-tagline {
    max-width: 100%;
  }
  
  .spec-hero-actions {
    justify-content: center;
  }
  
  .spec-hero-visual {
    order: -1;
  }
  
  .file-icon-large {
    width: 120px;
    height: 150px;
  }
  
  .spec-title {
    font-size: 3rem;
  }
  
  .security-flow {
    flex-direction: column;
  }
  
  .security-arrow {
    transform: rotate(90deg);
    margin: 0;
  }
  
  .security-details {
    grid-template-columns: 1fr;
  }
}

/* Lightbox Styles */
.lightbox-overlay {
  position: fixed;
  z-index: 9999;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  animation: lightboxFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes lightboxFadeIn {
  from { opacity: 0; backdrop-filter: blur(0); }
  to { opacity: 1; backdrop-filter: blur(20px); }
}

.lightbox-close {
  position: absolute;
  top: 24px;
  right: 40px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #fff;
  font-size: 28px;
  font-weight: 300;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.lightbox-close:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(6, 182, 212, 0.4) 100%);
  border-color: rgba(139, 92, 246, 0.6);
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(6, 182, 212, 0.2);
  transform: rotate(90deg);
}

.lightbox-image {
  max-width: 90%;
  max-height: 80vh;
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 100px rgba(139, 92, 246, 0.15);
  object-fit: contain;
  animation: lightboxImageIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes lightboxImageIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.lightbox-caption {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 500;
  margin-top: 24px;
  text-align: center;
  padding: 12px 24px;
  border-radius: 30px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: lightboxCaptionIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
}

@keyframes lightboxCaptionIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Make images clickable */
.screenshot-trio img,
.terminal-trio-item img,
.screenshot-placeholder img {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.screenshot-trio img:hover,
.terminal-trio-item img:hover,
.screenshot-placeholder img:hover {
  transform: scale(1.02);
}
</style>
