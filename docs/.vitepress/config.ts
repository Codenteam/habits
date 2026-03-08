import { defineConfig } from 'vitepress'
import { configureDiagramsPlugin } from 'vitepress-plugin-diagrams'
import d2 from 'vitepress-plugin-d2'
import { Layout, Theme } from 'vitepress-plugin-d2/dist/config'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

export default defineConfig({
  title: 'Habits',
  description: 'Create Agents, Automations, Full-Stacks, SaaS and Micro-Apps (Apache 2.0).',
  base: '/intersect/habits/',

  // Serve static assets from .vitepress/public
  vite: {
    publicDir: 'public'
  },

  // Ignore dead links for localhost URLs
  ignoreDeadLinks: [
    /^http:\/\/localhost/
  ],

  // Default to dark mode
  appearance: 'dark',

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
    }
  },

  head: [
    ['link', { rel: 'icon', href: '/intersect/habits/logo.png' }],
  ],

  themeConfig: {
    logo: '/logo.png',
    outline: [2,3],
    
    sidebar: [
      {
        text: '🚀 Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction' },
          { text: 'Motivation', link: '/getting-started/motivation' },
          { text: 'Build Your First Habit using HaC', link: '/getting-started/first-habit' },
          { text: 'Build Your First Habit using UI (Base)', link: '/getting-started/first-habit-using-base' },
          { text: 'When to Use Habits', link: '/getting-started/when-to-use' },
          { text: 'Concepts', link: '/getting-started/concepts' },
          { text: 'Checklists', link: '/getting-started/checklists' },
        ]
      },
            {
        text: '📚 Deep Dive',
        items: [
          // { text: 'Habits Schema: Understanding Habits', link: '/deep-dive/habit-schema' },
          { text: 'Creating Habits (Base)', link: '/deep-dive/creating' },
          { text: 'Running Habits (Cortex)', link: '/deep-dive/running' },
          { text: 'Packing and Distributing Habits', link: '/deep-dive/pack-distribute' },
          { text: 'Evaluating Variables', link: '/deep-dive/variables.md' },


        ]
      },
      // Examples
      {
        text: '📦 Examples',
        items: [
          { text: 'Overview', link: '/examples/' },
          { text: 'Mixed Frameworks', link: '/examples/mixed' },
          { text: 'Minimal Blog', link: '/examples/minimal-blog' },
          { text: 'Complete Marketing Campaign in Seconds', link: '/examples/marketing-campaign' },
          { text: 'Email Classification', link: '/examples/email-classification' },
          { text: 'Agent MCP Demo', link: '/examples/agent-mcp-demo' },
        ]
      },
      // Extra reading
      {
        text: '📖 Extra Reading',
        items: [
                    { text: 'Logging Configuration', link: '/deep-dive/logging' },
          { text: 'Habit Viewer', link: '/misc/habit-viewer' },
                    { text: 'Licensing & Compatibility', link: '/extra-reading/licensing' },
          { text: 'Psychological Background', link: '/extra-reading/neuroscience' },
          

        ]
      },

      // Roadmap
      {
        text: '🛣️ Roadmap',
        items: [
          { text: 'Stability', link: '/stability' },
                    { text: 'Self-Improving (WIP)', link: '/roadmap/self-improving' },
                    { text: "Bits (WIP)", link: '/roadmap/bits'},

        ]
      },
      // Development
      {
        text: '👨‍💻 Development',
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
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Copyright © 2024-present Habits Team'
    },

    editLink: {
      pattern: 'https://github.com/codenteam/habits/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
