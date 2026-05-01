---
title: "Resume Analyzer"
description: "AI-powered resume analysis tool that evaluates ATS compatibility, provides job match scores, generates improved summaries, and prepares interview questions."
aside: false
---

<script setup>
import { Brain, Layout, Database, Eye } from 'lucide-vue-next'

const images = [
    { img: '/showcase/resume-analyzer/1.webp', caption: 'Resume Analyzer' },
    { img: '/showcase/resume-analyzer/2.webp', caption: 'Resume Analyzer' },
    { img: '/showcase/resume-analyzer/3.webp', caption: 'Resume Analyzer' },
    { img: '/showcase/resume-analyzer/4.webp', caption: 'Resume Analyzer' }
]

const habitTabs = [
    { label: 'analyze-resume', url: '/showcase/resume-analyzer/analyze-resume.yaml' },
    { label: 'generate-cover-letter', url: '/showcase/resume-analyzer/generate-cover-letter.yaml' },
    { label: 'list-analyses', url: '/showcase/resume-analyzer/list-analyses.yaml' },
    { label: 'get-analysis', url: '/showcase/resume-analyzer/get-analysis.yaml' }
]
</script>

# Resume Analyzer

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-intermediate">
        <span class="difficulty-dot"></span>
        Intermediate
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-ai"><component :is="Brain" :size="12" /> ai</span> <span class="showcase-tag tag-frontend"><component :is="Layout" :size="12" /> frontend</span> <span class="showcase-tag tag-database"><component :is="Database" :size="12" /> database</span> <span class="showcase-tag tag-vision"><component :is="Eye" :size="12" /> vision</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="resume-analyzer" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<p class="showcase-description">AI-powered resume analysis tool that evaluates ATS compatibility, provides job match scores, generates improved summaries, and prepares interview questions.</p>

Transform your job application process with an AI-powered resume analyzer that goes beyond
basic keyword matching. This full-stack application demonstrates building a complete mobile-ready
app using Habits, from AI workflows to a polished frontend UI.

## What It Does

- **ATS Scoring**: Evaluates your resume against Applicant Tracking System standards
- **Job Match Analysis**: Compares your skills and experience to target job requirements
- **Improved Summary**: AI-generates a better professional summary based on your experience
- **Interview Prep**: Generates likely interview questions based on your resume and target role
- **Cover Letter Generation**: Creates customized cover letters for specific job applications
- **History Tracking**: Stores all analyses locally for future reference

## Why This Example

This showcase demonstrates:
- **Multi-habit workflows**, Multiple habits working together (analyze, generate cover letter, list, get)
- **Vision AI integration**, Uses OpenAI Vision to extract text from resume images
- **Local database**, SQLite for storing analyses without external dependencies
- **Mobile-first UI**, Responsive design ready for packaging as mobile/desktop app
- **Complete app packaging**, Can be exported as standalone binary, desktop app, or mobile app



<hr style="clear:both;">

## Run Your .habit File

<Checklist name="dot-habit/mobile" title="Run on Mobile" icon="smartphone">

<!--@include: ../getting-started/checklists/dot-habit/mobile.md{3,}-->

</Checklist>

<Checklist name="dot-habit/desktop" title="Run on Desktop" icon="monitor">

<!--@include: ../getting-started/checklists/dot-habit/desktop.md{3,}-->

</Checklist>

<Checklist name="dot-habit/server" title="Run on Server" icon="server">

<!--@include: ../getting-started/checklists/dot-habit/server.md{3,}-->

</Checklist>

<Checklist name="dot-habit/serverless" title="Run Serverless" icon="cloud">

<!--@include: ../getting-started/checklists/dot-habit/serverless.md{3,}-->

</Checklist>

## Workflow Visualization

<HabitViewerTabs :tabs="habitTabs" :height="450" />

## Requirements

- OpenAI API key (for GPT-4o and Vision API)

## Key Files

::: code-group
<<< @/../showcase/resume-analyzer/stack.yaml [stack.yaml]

<<< @/../showcase/resume-analyzer/.env.example [.env.example]

<<< @/../showcase/resume-analyzer/habits/analyze-resume.yaml [analyze-resume.yaml]

<<< @/../showcase/resume-analyzer/habits/generate-cover-letter.yaml [generate-cover-letter.yaml]

<<< @/../showcase/resume-analyzer/habits/get-analysis.yaml [get-analysis.yaml]
:::

## Quick Start

<ExampleRunner examplePath="resume-analyzer" />

<DownloadExample examplePath="resume-analyzer" />
<style>
.showcase-header {
  margin: 20px 0 28px;
}

.showcase-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-right {
  flex-shrink: 0;
}

.meta-divider {
  width: 1px;
  height: 20px;
  background: var(--vp-c-divider);
}

.difficulty-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 500;
  letter-spacing: 0.01em;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
}

.difficulty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.difficulty-beginner .difficulty-dot {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.difficulty-intermediate .difficulty-dot {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.difficulty-advanced .difficulty-dot {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.showcase-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 0.75em;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  transition: all 0.15s ease;
}

.showcase-tag:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.showcase-tag svg {
  opacity: 0.7;
}

.showcase-description {
  font-size: 1.1em;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0 0 24px;
}

.gallery-container {
  float: right;
  width: 400px;
  margin-left: 24px;
  margin-bottom: 16px;
}

.vp-doc h2 {
  border-top-width: 0;
}

@media (max-width: 768px) {
  .showcase-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .meta-divider {
    display: none;
  }
  
  .gallery-container {
    float: none;
    width: 100%;
    margin: 0 0 20px;
  }
}
</style>
