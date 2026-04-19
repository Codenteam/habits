---
title: "Showcase"
description: "Explore ready-to-use Habits examples with beautiful UIs and powerful AI integrations"
aside: false
---

<script setup>
const examples = [{"slug":"ai-cookbook","name":"AI Cookbook","description":"Generate personalized recipes from your available ingredients with AI-powered recipe creation and beautiful food photography.","tags":["ai","creative","frontend","health"],"difficulty":"intermediate","featured":true,"thumbnail":"/showcase/ai-cookbook/1.png","imageCount":2},{"slug":"ai-journal","name":"AI Journal","description":"Your personal AI-powered journaling companion that analyzes entries, tracks mood patterns, and provides compassionate weekly insights.","tags":["ai","health","productivity","frontend"],"difficulty":"beginner","featured":true,"thumbnail":"/showcase/ai-journal/1.png","imageCount":2},{"slug":"email-demo","name":"Email Send & Receive Demo","description":"Complete email workflow demonstration with IMAP polling and SMTP sending capabilities.","tags":["email","imap","smtp","automation","communication"],"difficulty":"beginner","featured":true,"thumbnail":"/showcase/email-demo/1.webp","imageCount":1},{"slug":"hello-world","name":"Hello World Habit","description":"Simple Habit to showcase the possible methods and ways to consume bits and read from both env and input.","tags":["frontend","backend","creative"],"difficulty":"beginner","featured":true,"thumbnail":"/showcase/hello-world/1.webp","imageCount":1},{"slug":"marketing-campaign","name":"Marketing Campaign Generator","description":"AI-powered marketing campaign generator that creates expanded prompts, images, posters, and landing pages in parallel using the Intersect AI gateway.","tags":["ai","creative","frontend","automation"],"difficulty":"intermediate","featured":true,"thumbnail":"/showcase/marketing-campaign/1.webp","imageCount":1},{"slug":"qr-database","name":"QR Code Manager","description":"Full-stack QR code application with generation, scanning, and persistent database storage. Includes a futuristic mobile-friendly frontend for managing your QR code library.","tags":["database","frontend","utility","full-stack"],"difficulty":"beginner","featured":true,"thumbnail":"/showcase/qr-database/1.webp","imageCount":2},{"slug":"resume-analyzer","name":"Resume Analyzer","description":"AI-powered resume analysis tool that evaluates ATS compatibility, provides job match scores, generates improved summaries, and prepares interview questions.","tags":["ai","frontend","database","vision"],"difficulty":"intermediate","featured":true,"thumbnail":"/showcase/resume-analyzer/1.webp","imageCount":4},{"slug":"agent-mcp-demo","name":"Agent MCP Demo","description":"An intelligent AI agent with MCP integration enabling multi-source search across Google Drive, Slack, and filesystem.","tags":["ai","integration","developer"],"difficulty":"advanced","featured":false,"thumbnail":"/showcase/agent-mcp-demo/agent-default.svg","imageCount":1}]
</script>

<div class="showcase-index-header">
  <h1>Showcase</h1>
  <p class="showcase-subtitle">Ready-to-use examples showcasing what you can build with Habits</p>
  <p class="showcase-note">Each example includes source code, demo images, and one-click deployment.</p>
</div>

<ShowcaseGrid :showcases="examples" />

<style>
.showcase-index-header {
  text-align: center;
  padding: 32px 0 40px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.showcase-index-header h1 {
  font-size: 2.5em;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
}

.showcase-subtitle {
  font-size: 1.2em;
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
  font-weight: 400;
}

.showcase-note {
  font-size: 0.9em;
  color: var(--vp-c-text-3);
  margin: 0;
}

.vp-doc > h1:first-of-type {
  display: none;
}
</style>
