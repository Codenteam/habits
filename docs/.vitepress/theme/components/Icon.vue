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
  zap: Zap,
  shield: Shield,
  clock: Clock,
  star: Star,
  construction: Construction,
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
