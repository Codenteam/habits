import { defineConfig } from 'vitepress'
import { configureDiagramsPlugin } from 'vitepress-plugin-diagrams'
import d2 from 'vitepress-plugin-d2'
import { Layout, Theme } from 'vitepress-plugin-d2/dist/config'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

export default defineConfig({
  title: 'Habits',
  description: 'Create Agents, Automations, Full-Stacks, SaaS and Micro-Apps (AGPL-3.0).',
  base: '/intersect/habits/',
  cleanUrls: true,

  // Serve static assets from .vitepress/public
  vite: {
    publicDir: 'public'
  },

  // Ignore dead links for localhost URLs
  ignoreDeadLinks: [
    /^http:\/\/localhost/
  ],

  // Match browser/system preference
  appearance: true,

  // Configure markdown to escape Vue template syntax in code
  markdown: {
    config: (md) => {
      // Add v-pre to code element to prevent Vue interpolation (without wrapping in div)
      const fence = md.renderer.rules.fence!
      md.renderer.rules.fence = (...args) => {
        const result = fence(...args)
        // Inject v-pre into the code tag instead of wrapping with div
        return result.replace(/<code/, '<code v-pre')
      }

      // Also prevent Vue interpolation in inline code spans
      const code_inline = md.renderer.rules.code_inline!
      md.renderer.rules.code_inline = (...args) => {
        const result = code_inline(...args)
        return result.replace(/<code/, '<code v-pre')
      }
            configureDiagramsPlugin(md, {
        diagramsDir: "public/diagrams/", // Optional: custom directory for SVG files
        publicPath: "/intersect/habits/diagrams", // Optional: custom public path for images
      });
      
      // D2 diagram plugin
      md.use(d2, {
        layout: Layout.DAGRE,
        theme: Theme.DARK_MUAVE,
        darkTheme: Theme.DARK_MUAVE,
        padding: 50,
        sketch: false,
        center: true,
      });

      md.use(tabsMarkdownPlugin);
    }, 
    toc: {
      level: [2]
    },
    // theme: 'houston'
    
  },

  head: [
    ['link', { rel: 'icon', href: '/intersect/habits/logo.png' }],
  ],

  themeConfig: {
    logo: '/logo.png',
    outline: [2,3],
    
    sidebar: [
      {
        text: 'About',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction' },
          { text: 'Motivation', link: '/getting-started/motivation' },
          { text: 'Downloads', link: '/downloads' },          
          { text: 'When to Use Habits', link: '/getting-started/when-to-use' },
          { text: 'Concepts', link: '/getting-started/concepts' },
          { text: '.habit File Format Specification', link: '/dot-habit' },
          { text: 'Privacy Policy', link: '/misc/privacy-policy' },
        ]
      },  
      {
        text: 'Getting Started',
        items: [
          { text: 'Build Habit using UI (Base)', link: '/getting-started/first-habit' },
          { text: 'Build Habit using AI', link: '/getting-started/first-habit-using-ai' },
          { text: 'Build Full AI Powered App', link: '/getting-started/first-app-using-habits' },
          { text: 'Build Standalone App (No APIs)', link: '/getting-started/standalone-app' },
        ]
      },      
      {
        text: 'Tools',
        items: [
          { text: 'Overview', link: '/tools/' },
          { text: 'Base (Visual Builder)', link: '/tools/base' },
          { text: 'Cortex Server', link: '/tools/cortex-server' },
          { text: 'Desktop App', link: '/tools/desktop-app' },
          { text: 'Mobile App', link: '/tools/mobile-app' },
          { text: 'Admin', link: '/tools/admin' },
          { text: 'Mirror', link: '/tools/mirror' },
        ]
      },
      {
        text: 'Recipes',
        items: [
          { text: 'Overview', link: '/recipes/' },
          { text: 'Company Automations Hub', link: '/recipes/company-hub' },
          { text: 'No-Code Automation Builder', link: '/recipes/no-code-automation' },
          { text: 'Native Apps (Mobile & Desktop)', link: '/recipes/native-apps' },
          { text: 'Build for Customers', link: '/recipes/build-for-customers' },
        ]
      },
      {
        text: 'Create, Run, Pack',
        items: [
          { text: 'Creating Habits (Base)', link: '/deep-dive/creating' },
          { text: 'Running Habits (Cortex)', link: '/deep-dive/running' },
          { text: 'Packing and Distributing Habits', link: '/deep-dive/pack-distribute' },


        ]
      },
      // Showcase (Examples)
      {
        text: 'Showcase',
        items: [
          { text: 'Browse All', link: '/showcase/' },

          { text: 'Hello World', link: '/showcase/hello-world' },
          { text: 'AI Cookbook', link: '/showcase/ai-cookbook' },
          { text: 'AI Journal', link: '/showcase/ai-journal' },
          { text: 'QR Code Manager', link: '/showcase/qr-database' },
          { text: 'Resume Analyzer', link: '/showcase/resume-analyzer' },

          { text: 'Agent MCP Demo', link: '/showcase/agent-mcp-demo' },
          { text: 'Email Classification', link: '/showcase/email-classification' },
          { text: 'Mixed Frameworks', link: '/showcase/mixed' },
          { text: 'Minimal Blog', link: '/showcase/minimal-blog' },
          { text: 'Marketing Campaign', link: '/showcase/marketing-campaign' },
        ]
      },
      // Bits Catalog
      {
        text: 'Bits',
        items: [
          { text: 'Browse All', link: '/bits/' },
          { text: 'Intersect AI', link: '/bits/bit-intersect' },
          { text: 'OpenAI', link: '/bits/bit-openai' },
          { text: 'Database', link: '/bits/bit-database' },
          { text: 'AI Agent', link: '/bits/bit-agent' },
          { text: 'Conditional (If)', link: '/bits/bit-if' },
        ]
      },
      // Extra reading
      {
        text: 'Extra Reading',
        items: [
                    { text: 'Logging Configuration', link: '/deep-dive/logging' },
          { text: 'Habit Viewer', link: '/misc/habit-viewer' },
                    { text: 'Licensing & Compatibility', link: '/extra-reading/licensing' },
          { text: 'Psychological Background', link: '/extra-reading/neuroscience' },
          { text: 'Evaluating Variables', link: '/extra-reading/variables' },

        ]
      },

      // Roadmap
      {
        text: 'Roadmap',
        items: [
          { text: 'Stability', link: '/stability' },
                    { text: 'Self-Improving (WIP)', link: '/roadmap/self-improving' },
                    { text: "Bits (WIP)", link: '/roadmap/bits'},

        ]
      },
      // Development
      {
        text: 'Development',
        items: [
          { text: 'Testing Bits', link: '/development/testing-bits' },
          { text: 'Versioning', link: '/development/versioning' },
          { text: 'Simulate npx', link: '/development/simulate-npx' },
        ]
      },

      
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/codenteam/habits' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the AGPL-3.0 License.',
      copyright: 'Copyright © 2024-present Habits Team'
    },

    editLink: {
      pattern: 'https://github.com/codenteam/habits/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
  },
  sitemap: {
    hostname: 'https://codenteam.com/intersect/habits'
  }
})
