/**
 * @ha-bits/bit-markdown-to-html
 * 
 * Convert Markdown to HTML.
 * 
 * ⚠️ SECURITY NOTE: This bit does NOT sanitize output HTML. 
 * If converting user-generated content, ensure proper HTML sanitization 
 * is applied before rendering in a browser to prevent XSS attacks.
 */

import { marked } from 'marked';

interface MarkdownContext {
  propsValue: Record<string, any>;
}

const markdownToHtmlBit = {
  displayName: 'Markdown to HTML',
  description: 'Convert Markdown to HTML. WARNING: Does not sanitize output - use with caution for user-generated content.',
  logoUrl: 'lucide:FileCode',
  
  actions: {
    /**
     * Convert markdown text to HTML
     */
    convert: {
      name: 'convert',
      displayName: 'Convert Markdown to HTML',
      description: 'Convert markdown text to HTML. Note: Output is not sanitized - use with caution.',
      props: {
        markdown: {
          type: 'LONG_TEXT',
          displayName: 'Markdown',
          description: 'Markdown text to convert to HTML',
          required: true,
        },
        gfm: {
          type: 'CHECKBOX',
          displayName: 'GitHub Flavored Markdown',
          description: 'Enable GitHub Flavored Markdown (tables, strikethrough, etc.)',
          required: false,
          defaultValue: true,
        },
        breaks: {
          type: 'CHECKBOX',
          displayName: 'Line Breaks',
          description: 'Convert single line breaks to <br> tags',
          required: false,
          defaultValue: false,
        },
        headerIds: {
          type: 'CHECKBOX',
          displayName: 'Header IDs',
          description: 'Add id attributes to heading tags',
          required: false,
          defaultValue: true,
        },
        mangle: {
          type: 'CHECKBOX',
          displayName: 'Mangle Emails',
          description: 'Mangle email addresses for protection against bots',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: MarkdownContext) {
        const { 
          markdown, 
          gfm = true, 
          breaks = false, 
          headerIds = true,
          mangle = false 
        } = context.propsValue;
        
        if (!markdown) {
          return {
            html: '',
            markdown: '',
          };
        }
        
        const markdownStr = String(markdown);
        
        // Configure marked options
        marked.setOptions({
          gfm,
          breaks,
          headerIds,
          mangle,
        } as any);
        
        const html = marked.parse(markdownStr) as string;
        
        console.log(`📄 Markdown to HTML: ${markdownStr.length} chars → ${html.length} chars`);
        
        return {
          html,
          markdown: markdownStr,
        };
      },
    },
    
    /**
     * Convert markdown text to HTML (simple - just returns HTML string)
     */
    toHtml: {
      name: 'toHtml',
      displayName: 'To HTML',
      description: 'Convert markdown to HTML (returns HTML string directly). Note: Output is not sanitized.',
      props: {
        markdown: {
          type: 'LONG_TEXT',
          displayName: 'Markdown',
          description: 'Markdown text to convert to HTML',
          required: true,
        },
      },
      async run(context: MarkdownContext) {
        const { markdown } = context.propsValue;
        
        if (!markdown) {
          return '';
        }
        
        const markdownStr = String(markdown);
        
        // Use GFM by default
        marked.setOptions({
          gfm: true,
          breaks: false,
          headerIds: true,
        } as any);
        
        const html = marked.parse(markdownStr) as string;
        
        console.log(`📄 Markdown to HTML: ${markdownStr.length} chars → ${html.length} chars`);
        
        return html;
      },
    },
    
    /**
     * Strip markdown formatting to plain text
     */
    stripMarkdown: {
      name: 'stripMarkdown',
      displayName: 'Strip Markdown',
      description: 'Remove markdown formatting and return plain text',
      props: {
        markdown: {
          type: 'LONG_TEXT',
          displayName: 'Markdown',
          description: 'Markdown text to strip',
          required: true,
        },
      },
      async run(context: MarkdownContext) {
        const { markdown } = context.propsValue;
        
        if (!markdown) {
          return '';
        }
        
        let text = String(markdown);
        
        // Remove code blocks
        text = text.replace(/```[\s\S]*?```/g, '');
        text = text.replace(/`[^`]+`/g, '');
        
        // Remove headers
        text = text.replace(/^#{1,6}\s*/gm, '');
        
        // Remove bold/italic
        text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
        text = text.replace(/\*([^*]+)\*/g, '$1');
        text = text.replace(/__([^_]+)__/g, '$1');
        text = text.replace(/_([^_]+)_/g, '$1');
        
        // Remove links but keep text
        text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        
        // Remove images
        text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
        
        // Remove blockquotes
        text = text.replace(/^>\s*/gm, '');
        
        // Remove horizontal rules
        text = text.replace(/^[-*_]{3,}\s*$/gm, '');
        
        // Remove list markers
        text = text.replace(/^[\s]*[-*+]\s+/gm, '');
        text = text.replace(/^[\s]*\d+\.\s+/gm, '');
        
        // Collapse multiple newlines
        text = text.replace(/\n{3,}/g, '\n\n');
        
        text = text.trim();
        
        console.log(`📄 Strip Markdown: ${markdown.length} chars → ${text.length} chars`);
        
        return text;
      },
    },
  },

  // Empty triggers
  triggers: {},
};

export const markdownToHtml = markdownToHtmlBit;
export default markdownToHtmlBit;
