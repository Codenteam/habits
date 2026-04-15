/**
 * @ha-bits/bit-text
 * 
 * Text processing bit for diff, cleanup, extraction, and formatting.
 * Useful for comparing content, cleaning up text, and extracting data.
 */

interface TextContext {
  propsValue: Record<string, any>;
}

/**
 * Simple diff implementation
 */
function computeDiff(oldText: string, newText: string): {
  added: string[];
  removed: string[];
  unchanged: string[];
  changed: boolean;
} {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  
  const added = newLines.filter(line => !oldSet.has(line));
  const removed = oldLines.filter(line => !newSet.has(line));
  const unchanged = oldLines.filter(line => newSet.has(line));
  
  return {
    added,
    removed,
    unchanged,
    changed: added.length > 0 || removed.length > 0,
  };
}

const textBit = {
  displayName: 'Text Processing',
  description: 'Text diff, cleanup, extraction, and formatting utilities',
  logoUrl: 'lucide:Type',
  runtime: 'all',
  
  actions: {
    /**
     * Compare two texts and find differences
     */
    diff: {
      name: 'diff',
      displayName: 'Text Diff',
      description: 'Compare two texts and find differences',
      props: {
        oldText: {
          type: 'LONG_TEXT',
          displayName: 'Old Text',
          description: 'Original/previous text',
          required: true,
        },
        newText: {
          type: 'LONG_TEXT',
          displayName: 'New Text',
          description: 'New/updated text',
          required: true,
        },
        ignoreWhitespace: {
          type: 'CHECKBOX',
          displayName: 'Ignore Whitespace',
          description: 'Ignore whitespace differences',
          required: false,
          defaultValue: false,
        },
        ignoreCase: {
          type: 'CHECKBOX',
          displayName: 'Ignore Case',
          description: 'Ignore case differences',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: TextContext) {
        let { oldText, newText, ignoreWhitespace, ignoreCase } = context.propsValue;
        
        oldText = String(oldText || '');
        newText = String(newText || '');
        
        if (ignoreWhitespace) {
          oldText = oldText.replace(/\s+/g, ' ').trim();
          newText = newText.replace(/\s+/g, ' ').trim();
        }
        
        if (ignoreCase) {
          oldText = oldText.toLowerCase();
          newText = newText.toLowerCase();
        }
        
        const diff = computeDiff(oldText, newText);
        
        console.log(`📝 Text Diff: ${diff.changed ? 'Changes detected' : 'No changes'}`);
        
        return {
          ...diff,
          summary: diff.changed 
            ? `${diff.added.length} additions, ${diff.removed.length} removals`
            : 'No changes',
        };
      },
    },
    
    /**
     * Clean up text (remove extra whitespace, fix formatting)
     */
    cleanup: {
      name: 'cleanup',
      displayName: 'Cleanup Text',
      description: 'Clean up text by removing extra whitespace, fixing formatting',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Text',
          description: 'Text to clean up',
          required: true,
        },
        trimLines: {
          type: 'CHECKBOX',
          displayName: 'Trim Lines',
          description: 'Trim whitespace from each line',
          required: false,
          defaultValue: true,
        },
        removeEmptyLines: {
          type: 'CHECKBOX',
          displayName: 'Remove Empty Lines',
          description: 'Remove blank lines',
          required: false,
          defaultValue: false,
        },
        collapseWhitespace: {
          type: 'CHECKBOX',
          displayName: 'Collapse Whitespace',
          description: 'Replace multiple spaces with single space',
          required: false,
          defaultValue: true,
        },
        removeHtmlTags: {
          type: 'CHECKBOX',
          displayName: 'Remove HTML Tags',
          description: 'Strip HTML tags from text',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: TextContext) {
        const { text, trimLines = true, removeEmptyLines = false, collapseWhitespace = true, removeHtmlTags = false } = context.propsValue;
        
        let result = String(text || '');
        
        if (removeHtmlTags) {
          result = result.replace(/<[^>]+>/g, ' ');
        }
        
        if (collapseWhitespace) {
          result = result.replace(/[ \t]+/g, ' ');
        }
        
        if (trimLines) {
          result = result.split('\n').map(line => line.trim()).join('\n');
        }
        
        if (removeEmptyLines) {
          result = result.split('\n').filter(line => line.trim()).join('\n');
        }
        
        result = result.trim();
        
        console.log(`📝 Text Cleanup: ${text.length} → ${result.length} chars`);
        
        return {
          original: text,
          result,
          originalLength: text.length,
          resultLength: result.length,
        };
      },
    },
    
    /**
     * Extract text using regex or patterns
     */
    extract: {
      name: 'extract',
      displayName: 'Extract Text',
      description: 'Extract text using regex patterns',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Text',
          description: 'Text to extract from',
          required: true,
        },
        pattern: {
          type: 'SHORT_TEXT',
          displayName: 'Pattern',
          description: 'Regex pattern or preset: email, url, phone, number',
          required: true,
        },
        matchAll: {
          type: 'CHECKBOX',
          displayName: 'Match All',
          description: 'Find all matches (not just first)',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: TextContext) {
        const { text, pattern, matchAll = true } = context.propsValue;
        
        // Preset patterns
        const presets: Record<string, string> = {
          email: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
          url: 'https?://[\\w-]+(\\.[\\w-]+)+[\\w.,@?^=%&:/~+#-]*',
          phone: '[+]?[(]?[0-9]{1,3}[)]?[-\\s.]?[0-9]{1,4}[-\\s.]?[0-9]{1,4}[-\\s.]?[0-9]{1,9}',
          number: '-?\\d+\\.?\\d*',
          hashtag: '#[\\w]+',
          mention: '@[\\w]+',
        };
        
        const regexPattern = presets[pattern.toLowerCase()] || pattern;
        const flags = matchAll ? 'gi' : 'i';
        
        try {
          const regex = new RegExp(regexPattern, flags);
          const matches = String(text).match(regex) || [];
          
          console.log(`📝 Text Extract: Found ${matches.length} matches`);
          
          return {
            matches,
            count: matches.length,
            pattern: regexPattern,
            first: matches[0] || null,
          };
        } catch (error: any) {
          throw new Error(`Invalid regex pattern: ${error.message}`);
        }
      },
    },
    
    /**
     * Replace text using patterns
     */
    replace: {
      name: 'replace',
      displayName: 'Replace Text',
      description: 'Replace text using patterns or literals',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Text',
          description: 'Text to modify',
          required: true,
        },
        search: {
          type: 'SHORT_TEXT',
          displayName: 'Search',
          description: 'Text or regex pattern to find',
          required: true,
        },
        replacement: {
          type: 'SHORT_TEXT',
          displayName: 'Replacement',
          description: 'Text to replace with',
          required: true,
        },
        isRegex: {
          type: 'CHECKBOX',
          displayName: 'Use Regex',
          description: 'Treat search as regex pattern',
          required: false,
          defaultValue: false,
        },
        replaceAll: {
          type: 'CHECKBOX',
          displayName: 'Replace All',
          description: 'Replace all occurrences',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: TextContext) {
        const { text, search, replacement, isRegex = false, replaceAll = true } = context.propsValue;
        
        let result: string;
        let count = 0;
        
        if (isRegex) {
          const flags = replaceAll ? 'g' : '';
          const regex = new RegExp(search, flags);
          result = String(text).replace(regex, () => {
            count++;
            return replacement;
          });
        } else {
          if (replaceAll) {
            result = String(text).split(search).join(replacement);
            count = String(text).split(search).length - 1;
          } else {
            result = String(text).replace(search, replacement);
            count = text.includes(search) ? 1 : 0;
          }
        }
        
        console.log(`📝 Text Replace: ${count} replacements made`);
        
        return {
          result,
          replacementCount: count,
          original: text,
        };
      },
    },
    
    /**
     * Format/template text
     */
    format: {
      name: 'format',
      displayName: 'Format Text',
      description: 'Format text using a template with variables',
      props: {
        template: {
          type: 'LONG_TEXT',
          displayName: 'Template',
          description: 'Template with {{variable}} placeholders',
          required: true,
        },
        variables: {
          type: 'JSON',
          displayName: 'Variables',
          description: 'JSON object with variable values',
          required: true,
        },
      },
      async run(context: TextContext) {
        const { template, variables } = context.propsValue;
        
        let vars = variables;
        if (typeof variables === 'string') {
          try {
            vars = JSON.parse(variables);
          } catch {
            vars = {};
          }
        }
        
        let result = String(template);
        for (const [key, value] of Object.entries(vars)) {
          result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        }
        
        // Check for unresolved variables
        const unresolved = result.match(/\{\{[^}]+\}\}/g) || [];
        
        console.log(`📝 Text Format: Applied ${Object.keys(vars).length} variables`);
        
        return {
          result,
          unresolvedVariables: unresolved,
          variablesApplied: Object.keys(vars).length,
        };
      },
    },
    
    /**
     * Truncate text to a maximum length
     */
    truncate: {
      name: 'truncate',
      displayName: 'Truncate Text',
      description: 'Truncate text to a maximum length',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Text',
          description: 'Text to truncate',
          required: true,
        },
        maxLength: {
          type: 'NUMBER',
          displayName: 'Max Length',
          description: 'Maximum character length',
          required: true,
        },
        suffix: {
          type: 'SHORT_TEXT',
          displayName: 'Suffix',
          description: 'Suffix to add when truncated',
          required: false,
          defaultValue: '...',
        },
        preserveWords: {
          type: 'CHECKBOX',
          displayName: 'Preserve Words',
          description: 'Avoid cutting words in the middle',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: TextContext) {
        const { text, maxLength, suffix = '...', preserveWords = true } = context.propsValue;
        
        const str = String(text);
        if (str.length <= maxLength) {
          return {
            result: str,
            truncated: false,
            originalLength: str.length,
          };
        }
        
        let result = str.slice(0, maxLength - suffix.length);
        
        if (preserveWords) {
          const lastSpace = result.lastIndexOf(' ');
          if (lastSpace > maxLength * 0.8) {
            result = result.slice(0, lastSpace);
          }
        }
        
        result = result.trim() + suffix;
        
        console.log(`📝 Text Truncate: ${str.length} → ${result.length} chars`);
        
        return {
          result,
          truncated: true,
          originalLength: str.length,
          resultLength: result.length,
        };
      },
    },
    
    /**
     * Split text into parts
     */
    split: {
      name: 'split',
      displayName: 'Split Text',
      description: 'Split text into an array of parts',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Text',
          description: 'Text to split',
          required: true,
        },
        separator: {
          type: 'SHORT_TEXT',
          displayName: 'Separator',
          description: 'Separator to split by (or "line" for newlines)',
          required: true,
          defaultValue: ',',
        },
        trim: {
          type: 'CHECKBOX',
          displayName: 'Trim Parts',
          description: 'Trim whitespace from each part',
          required: false,
          defaultValue: true,
        },
        removeEmpty: {
          type: 'CHECKBOX',
          displayName: 'Remove Empty',
          description: 'Remove empty parts',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: TextContext) {
        const { text, separator, trim = true, removeEmpty = true } = context.propsValue;
        
        const sep = separator === 'line' ? '\n' : String(separator);
        let parts = String(text).split(sep);
        
        if (trim) {
          parts = parts.map(p => p.trim());
        }
        
        if (removeEmpty) {
          parts = parts.filter(p => p);
        }
        
        console.log(`📝 Text Split: ${parts.length} parts`);
        
        return {
          parts,
          count: parts.length,
          separator: sep,
        };
      },
    },
    
    /**
     * Join array of strings
     */
    join: {
      name: 'join',
      displayName: 'Join Text',
      description: 'Join an array of strings into single text',
      props: {
        parts: {
          type: 'JSON',
          displayName: 'Parts',
          description: 'Array of strings to join',
          required: true,
        },
        separator: {
          type: 'SHORT_TEXT',
          displayName: 'Separator',
          description: 'Separator between parts (or "line" for newlines)',
          required: false,
          defaultValue: ', ',
        },
      },
      async run(context: TextContext) {
        const { parts, separator = ', ' } = context.propsValue;
        
        let arr = parts;
        if (typeof parts === 'string') {
          try {
            arr = JSON.parse(parts);
          } catch {
            arr = [parts];
          }
        }
        
        if (!Array.isArray(arr)) {
          arr = [String(arr)];
        }
        
        const sep = separator === 'line' ? '\n' : String(separator);
        const result = arr.join(sep);
        
        console.log(`📝 Text Join: ${arr.length} parts joined`);
        
        return {
          result,
          partCount: arr.length,
        };
      },
    },
    
    /**
     * Sentiment analysis (simple implementation)
     */
    sentiment: {
      name: 'sentiment',
      displayName: 'Analyze Sentiment',
      description: 'Simple sentiment analysis of text',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Text',
          description: 'Text to analyze',
          required: true,
        },
      },
      async run(context: TextContext) {
        const { text } = context.propsValue;
        
        const str = String(text).toLowerCase();
        
        // Simple word-based sentiment (would use ML in production)
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'best', 'love', 'happy', 'fantastic', 'awesome', 'perfect', 'satisfied', 'pleased'];
        const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'hate', 'angry', 'poor', 'disappointing', 'frustrated', 'horrible', 'useless', 'problem', 'issue'];
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        positiveWords.forEach(word => {
          const matches = str.match(new RegExp(`\\b${word}\\b`, 'g'));
          positiveCount += matches?.length || 0;
        });
        
        negativeWords.forEach(word => {
          const matches = str.match(new RegExp(`\\b${word}\\b`, 'g'));
          negativeCount += matches?.length || 0;
        });
        
        const total = positiveCount + negativeCount || 1;
        const score = (positiveCount - negativeCount) / total;
        
        let sentiment: 'positive' | 'negative' | 'neutral';
        if (score > 0.1) sentiment = 'positive';
        else if (score < -0.1) sentiment = 'negative';
        else sentiment = 'neutral';
        
        console.log(`📝 Sentiment: ${sentiment} (score: ${score.toFixed(2)})`);
        
        return {
          sentiment,
          score: Number(score.toFixed(2)),
          positiveWords: positiveCount,
          negativeWords: negativeCount,
          confidence: Math.abs(score),
        };
      },
    },
  },
  
  triggers: {},
};

export const textProcessing = textBit;
export default textBit;
