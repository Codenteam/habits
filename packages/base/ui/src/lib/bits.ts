import {
  Bot, Brain, Cookie, Database, FolderOpen, Github, GitBranch, Globe,
  Hand, Key, Mail, MessageCircle, MessageSquare, Package, Play, Repeat,
  Send, Server, Shield, Sparkles, Terminal, Type, Users,
  LucideIcon,
} from 'lucide-react';
import catalogData from './bits-catalog.json';

export interface BitDefinition {
  name: string;
  displayName: string;
  description: string;
  icon: LucideIcon;
  category: string;
  level: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Bot, Brain, Cookie, Database, FolderOpen, Github, GitBranch, Globe,
  Hand, Key, Mail, MessageCircle, MessageSquare, Package, Play, Repeat,
  Send, Server, Shield, Sparkles, Terminal, Type, Users,
};

export const BITS: BitDefinition[] = catalogData
  .filter(entry => entry.level !== 'l0')
  .map(entry => ({
    name: entry.packageName,
    displayName: entry.displayName,
    description: entry.description,
    icon: ICON_MAP[entry.icon] ?? Package,
    category: entry.categories[0] ?? 'Other',
    level: entry.level,
  }));

