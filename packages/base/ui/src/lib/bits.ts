import { 
  GitBranch, GitMerge, Brain, Sparkles, FileText, Type, Cookie, Globe,
  Mail, Hash, Send, MessageCircle, Database, Users, CheckSquare,
  FolderOpen, Terminal, Github, Key, Server, Play, LucideIcon
} from 'lucide-react';

export interface BitDefinition {
  name: string;
  displayName: string;
  description: string;
  icon: LucideIcon;
  category: string;
}

// All available bits
// Names must match the repository field in modules.json (full scoped package names)
export const BITS: BitDefinition[] = [
  // Logic bits
  {
    name: '@ha-bits/bit-if',
    displayName: 'If / Conditional',
    description: 'Branch workflows based on conditions',
    icon: GitBranch,
    category: 'Logic',
  },
  // {
  //   name: '@ha-bits/bit-loop',
  //   displayName: 'Loop / Split',
  //   description: 'Iterate over arrays and split data',
  //   icon: Repeat,
  //   category: 'Logic',
  // },
  {
    name: '@ha-bits/bit-any-of',
    displayName: 'Any Of',
    description: 'Race gate - continues when first input arrives',
    icon: GitMerge,
    category: 'Logic',
  },
  // AI bits
  {
    name: '@ha-bits/bit-openai',
    displayName: 'OpenAI',
    description: 'Chat completions, images, embeddings',
    icon: Brain,
    category: 'AI',
  },
  {
    name: '@ha-bits/bit-intersect',
    displayName: 'Intersect AI',
    description: 'ChatGPT, image generation, canvas features',
    icon: Sparkles,
    category: 'AI',
  },
  // Transform bits
  {
    name: '@ha-bits/bit-string',
    displayName: 'String Utils',
    description: 'Text manipulation utilities',
    icon: FileText,
    category: 'Transform',
  },
  {
    name: '@ha-bits/bit-text',
    displayName: 'Text Processing',
    description: 'Diff, cleanup, extraction, formatting',
    icon: Type,
    category: 'Transform',
  },
  {
    name: '@ha-bits/bit-cookie',
    displayName: 'Cookie',
    description: 'Parse and manage HTTP cookies',
    icon: Cookie,
    category: 'Transform',
  },
  // Network bits
  {
    name: '@ha-bits/bit-http',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests to any API endpoint',
    icon: Globe,
    category: 'Network',
  },
  {
    name: '@ha-bits/bit-httpbin',
    displayName: 'HTTPBin',
    description: 'HTTP request testing',
    icon: Globe,
    category: 'Network',
  },
  // Messaging bits
  {
    name: '@ha-bits/bit-email',
    displayName: 'Email',
    description: 'IMAP fetching and SMTP sending',
    icon: Mail,
    category: 'Messaging',
  },
  {
    name: '@ha-bits/bit-slack',
    displayName: 'Slack',
    description: 'Send messages and notifications to Slack',
    icon: Hash,
    category: 'Messaging',
  },
  {
    name: '@ha-bits/bit-telegram',
    displayName: 'Telegram',
    description: 'Send messages via Telegram Bot API',
    icon: Send,
    category: 'Messaging',
  },
  {
    name: '@ha-bits/bit-whatsapp',
    displayName: 'WhatsApp',
    description: 'WhatsApp Business API messaging',
    icon: MessageCircle,
    category: 'Messaging',
  },
  {
    name: '@ha-bits/bit-discord',
    displayName: 'Discord',
    description: 'Discord bot messaging and webhooks',
    icon: MessageCircle,
    category: 'Messaging',
  },
  // Data bits
  {
    name: '@ha-bits/bit-database',
    displayName: 'Database',
    description: 'Store and retrieve data in workflows',
    icon: Database,
    category: 'Data',
  },
  {
    name: '@ha-bits/bit-database-mongodb',
    displayName: 'MongoDB',
    description: 'MongoDB database operations',
    icon: Database,
    category: 'Data',
  },
  {
    name: '@ha-bits/bit-database-sql',
    displayName: 'SQL',
    description: 'SQL database operations',
    icon: Database,
    category: 'Data',
  },
  {
    name: '@ha-bits/bit-crm',
    displayName: 'CRM',
    description: 'Lead and contact management',
    icon: Users,
    category: 'Data',
  },
  {
    name: '@ha-bits/bit-tasks',
    displayName: 'Tasks',
    description: 'Jira, Asana, and ticket management',
    icon: CheckSquare,
    category: 'Data',
  },
  // System bits
  {
    name: '@ha-bits/bit-filesystem',
    displayName: 'Filesystem',
    description: 'Read, write, and manage files',
    icon: FolderOpen,
    category: 'System',
  },
  {
    name: '@ha-bits/bit-shell',
    displayName: 'Shell',
    description: 'Execute shell commands',
    icon: Terminal,
    category: 'System',
  },
  // Integration bits
  {
    name: '@ha-bits/bit-github',
    displayName: 'GitHub',
    description: 'GitHub API operations',
    icon: Github,
    category: 'Integration',
  },
  {
    name: '@ha-bits/bit-auth',
    displayName: 'Auth',
    description: 'Authentication and authorization',
    icon: Key,
    category: 'Security',
  },
  // Test bits
  {
    name: '@ha-bits/bit-jsonplaceholder',
    displayName: 'JSONPlaceholder',
    description: 'Fake REST API for testing',
    icon: Server,
    category: 'Test',
  },
  {
    name: '@ha-bits/bit-hello-world',
    displayName: 'Hello World',
    description: 'Simple demonstration bit',
    icon: Play,
    category: 'Test',
  },
];
