# Build Your First Full App with Habits

This guide walks you through building a complete AI-powered application — the **Resume Analyzer** — from understanding the workflows to packaging for distribution across all platforms: Android, iOS, macOS, Windows, and Linux.

::: tip <Icon name="package" /> Complete Example
This tutorial uses the [Resume Analyzer](/showcase/resume-analyzer) showcase, a production-ready app with multiple AI workflows, a mobile-first frontend, and local database storage.
:::

<script setup>
const habitTabs = [
    { label: 'analyze-resume', url: '/showcase/resume-analyzer/analyze-resume.yaml' },
    { label: 'generate-cover-letter', url: '/showcase/resume-analyzer/generate-cover-letter.yaml' },
]

const fullAppCommands = [
    {
        label: 'macOS (.dmg)',
        description: 'Creates a standalone macOS app. Doesn\'t require a backend.',
        cmd: 'npx habits pack --config ./stack.yaml --format desktop-full --desktop-platform dmg --output ./ResumeAnalyzer.dmg'
    },
    {
        label: 'Windows (.exe)',
        description: 'Creates a standalone Windows app. Doesn\'t require a backend.',
        cmd: 'npx habits pack --config ./stack.yaml --format desktop-full --desktop-platform exe --output ./ResumeAnalyzer-Setup.exe'
    },
    {
        label: 'Linux (AppImage)',
        description: 'Creates a standalone Linux app. Doesn\'t require a backend.',
        cmd: 'npx habits pack --config ./stack.yaml --format desktop-full --desktop-platform appimage --output ./ResumeAnalyzer.AppImage'
    },
    {
        label: 'Android',
        description: 'Creates a standalone Android APK. Doesn\'t require a backend.',
        cmd: 'npx habits pack --config ./stack.yaml --format mobile-full --mobile-target android --output ./resume-analyzer.apk'
    },
    {
        label: 'iOS',
        description: 'Creates a standalone iOS IPA. Doesn\'t require a backend. Requires macOS with Xcode.',
        cmd: 'npx habits pack --config ./stack.yaml --format mobile-full --mobile-target ios --output ./ResumeAnalyzer.ipa'
    }
]

const clientAppCommands = [
    {
        label: 'macOS (.dmg)',
        description: 'Creates a macOS app that connects to your deployed backend.',
        cmd: 'npx habits pack --config ./stack.yaml --format desktop --backend-url https://your-api.example.com --desktop-platform dmg --output ./ResumeAnalyzer.dmg'
    },
    {
        label: 'Windows (.exe)',
        description: 'Creates a Windows app that connects to your deployed backend.',
        cmd: 'npx habits pack --config ./stack.yaml --format desktop --backend-url https://your-api.example.com --desktop-platform exe --output ./ResumeAnalyzer-Setup.exe'
    },
    {
        label: 'Linux (AppImage)',
        description: 'Creates a Linux app that connects to your deployed backend.',
        cmd: 'npx habits pack --config ./stack.yaml --format desktop --backend-url https://your-api.example.com --desktop-platform appimage --output ./ResumeAnalyzer.AppImage'
    },
    {
        label: 'Android',
        description: 'Creates an Android APK that connects to your deployed backend.',
        cmd: 'npx habits pack --config ./stack.yaml --format mobile --backend-url https://your-api.example.com --mobile-target android --output ./resume-analyzer.apk'
    },
    {
        label: 'iOS',
        description: 'Creates an iOS IPA that connects to your deployed backend. Requires macOS with Xcode.',
        cmd: 'npx habits pack --config ./stack.yaml --format mobile --backend-url https://your-api.example.com --mobile-target ios --output ./ResumeAnalyzer.ipa'
    }
]
</script>

<Checklist name="environment-setup" title="Environment Setup Checklist" icon="wrench">

<!--@include: ./checklists/environment-setup.md{3,}-->

</Checklist>

## What You'll Build

The Resume Analyzer demonstrates building a **multi-habit application** with:

- **4 AI-powered workflows** — Analyze resumes, generate cover letters, list history, retrieve saved analyses
- **OpenAI Vision integration** — Extract text from resume images
- **Local database storage** — PouchDB for storing analyses without external dependencies
- **Mobile-first frontend** — Responsive UI ready for packaging as native app

## Workflow Visualization

Explore the 4 habits that power the Resume Analyzer:

<HabitViewerTabs :tabs="habitTabs" :height="500" />

## Source Files

<!-- v-pre prevents Vue from parsing {{...}} in YAML files -->
::: code-group

<<< @/../showcase/resume-analyzer/stack.yaml [stack.yaml]

<<< @/../showcase/resume-analyzer/habits/analyze-resume.yaml [habits/analyze-resume.yaml]

<<< @/../showcase/resume-analyzer/habits/generate-cover-letter.yaml [habits/generate-cover-letter.yaml]

<<< @/../showcase/resume-analyzer/habits/list-analyses.yaml [habits/list-analyses.yaml]

<<< @/../showcase/resume-analyzer/habits/get-analysis.yaml [habits/get-analysis.yaml]

<<< @/../showcase/resume-analyzer/frontend/index.html [frontend/index.html]

<<< @/../showcase/resume-analyzer/.env.example [.env.example]

:::

## Running Locally

<ExampleRunner examplePath="resume-analyzer" />

<DownloadExample examplePath="resume-analyzer" />

## Understanding the Architecture

For detailed explanations of how habits work, see:

- **[Creating Habits](/deep-dive/creating)** — Learn Habit-as-Code (HaC), visual editing with Base, and importing workflows
- **[Your First Habit (Code-First)](/getting-started/first-habit)** — Step-by-step guide to writing habits in YAML
- **[Your First Habit (GUI-First)](/getting-started/first-habit-using-base)** — Build habits visually with the Base UI
- **[Variables & Expressions](/deep-dive/variables)** — Pass data between nodes using template expressions

---

## Packaging Your App

Once your app is working locally, you can package it for distribution. See the [Binary Export](/deep-dive/pack-distribute) guide for full details.

### Full App vs Client App

Before packaging, decide your deployment architecture:

| Approach | Best For | Pros | Cons |
|----------|----------|------|------|
| **Full App (Standalone)** | Internal tools, demos, kiosk apps | Doesn't require a backend, single package | API keys bundled in app |
| **Client App (Remote Backend)** | Production apps, public distribution | Secure key storage, scalable, updatable | Requires deployed API |

::: danger <Icon name="alert-triangle" /> Security Warning: Full App Builds
When you package with `--execution-mode full`, your `.env` file (including API keys) is **bundled inside the app**. Anyone with the app can extract these keys.

**For distributable apps with sensitive keys:**
1. **Use a remote backend** — Deploy your habits server and have the app connect via API
2. **Use `@codenteam/intersect` security solutions** — Enterprise vault and secrets management for standalone deployments

Only use full app builds for:
- Development and testing
- Internal tools with non-sensitive credentials
- Demos where key exposure is acceptable
- Internal/Kiosk Micro-Apps that would be only used internally
:::

### Full App (Standalone)

Package your entire stack as a standalone native app. Doesn't require a separate backend deployment.

<PackRunner :commands="fullAppCommands" />

**After packaging:**
```bash
# The app runs standalone - no server needed
# To override bundled environment variables, place a .env file beside the app
```

### Client App (Remote Backend)

Package the frontend as a native app that connects to your deployed backend. This keeps API keys secure on your server.

<PackRunner :commands="clientAppCommands" />

**Requirements:**
- Node.js 24+
- Backend deployed and accessible at the provided URL
- **Desktop:** For Tauri builds, Rust and Cargo installed
- **Android:** Java, Gradle, Android SDK (`ANDROID_HOME` or `ANDROID_SDK_ROOT` set)
- **iOS:** macOS with Xcode (iOS builds only work on macOS)

### Using Base UI for Export

You can also export from the Base UI:

1. Open Base UI: `npx habits base`
2. Load your stack
3. Go to **Export** tab
4. Select export type (Binary, Desktop, or Mobile)
5. Configure target platform
6. Click **Export** to download

![Binary Export UI](/images/export.webp)

---

<Checklist name="stack-readiness" title="Habits Stack Preparation Checklist" icon="clipboard">

<!--@include: ./checklists/stack-readiness.md{3,}-->

</Checklist>

<Checklist name="exporting" title="Exporting for Production Checklist" icon="package">

<!--@include: ./checklists/exporting.md{3,}-->

</Checklist>

## Next Steps

- **[Resume Analyzer Showcase](/showcase/resume-analyzer)** — Full showcase page with images and details
- **[Binary Export](/deep-dive/pack-distribute)** — Complete export documentation with all options
- **[Security Best Practices](/security/)** — Secure your habits and deployments
- **[Browse All Examples](/showcase/)** — Explore more production-ready showcases
