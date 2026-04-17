<script setup lang="ts">
import {
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  Palette,
  Wrench,
  Lightbulb,
  Package,
  Rocket,
  ClipboardList,
  Bot,
  BookOpen,
  Puzzle,
  Sparkles,
  Monitor,
  Info,
  CircleCheck,
  CircleX,
  FileText,
  ChevronRight,
  Zap,
  Shield,
  Clock,
  CircleHelp,
  Star,
  Construction,
  Settings,
  Brain,
  Link,
  Heart,
  Gem,
  Cloud,
  Globe,
  GitBranch,
  Code,
  MousePointer,
  Wand2,
  Home,
  Smile,
  Scale,
  FileCode,
  Plug,
  Cpu,
  Database,
  Lock,
  Unlock,
  Trophy,
  Target,
  ArrowRight,
  ChevronDown,
  type LucideIcon,
} from 'lucide-vue-next'

const props = defineProps<{
  /** Icon name */
  name: string
  /** Icon size in pixels (default: 16) */
  size?: number
  /** Icon color (default: currentColor) */
  color?: string
  /** Additional CSS class */
  class?: string
}>()

// Map simple names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  // Status icons
  check: Check,
  'check-circle': CircleCheck,
  x: X,
  'x-circle': CircleX,
  warning: AlertTriangle,
  alert: AlertCircle,
  info: Info,
  help: CircleHelp,
  
  // UI/Action icons
  palette: Palette,
  wrench: Wrench,
  lightbulb: Lightbulb,
  package: Package,
  rocket: Rocket,
  clipboard: ClipboardList,
  bot: Bot,
  book: BookOpen,
  puzzle: Puzzle,
  sparkles: Sparkles,
  monitor: Monitor,
  file: FileText,
  chevron: ChevronRight,
  'chevron-down': ChevronDown,
  zap: Zap,
  shield: Shield,
  clock: Clock,
  star: Star,
  construction: Construction,
  // Extended icons for comparisons
  settings: Settings,
  brain: Brain,
  link: Link,
  heart: Heart,
  gem: Gem,
  cloud: Cloud,
  globe: Globe,
  'git-branch': GitBranch,
  code: Code,
  'mouse-pointer': MousePointer,
  wand: Wand2,
  home: Home,
  smile: Smile,
  scale: Scale,
  'file-code': FileCode,
  plug: Plug,
  cpu: Cpu,
  database: Database,
  lock: Lock,
  unlock: Unlock,
  trophy: Trophy,
  target: Target,
  'arrow-right': ArrowRight,
}

const IconComponent = iconMap[props.name] || Info
const iconSize = props.size ?? 16
const iconColor = props.color ?? 'currentColor'
</script>

<template>
  <component 
    :is="IconComponent" 
    :size="iconSize" 
    :color="iconColor"
    :class="props.class"
    style="display: inline-block; vertical-align: middle;"
  />
</template>

<style scoped>
/* Ensure icon displays inline with text */
</style>
