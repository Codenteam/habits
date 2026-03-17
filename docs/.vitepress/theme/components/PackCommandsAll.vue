<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { codeToHtml } from 'shiki'

interface PackCommand {
  label: string
  description: string
  cmd: string
}

type Target = 'dmg' | 'exe' | 'appimage' | 'deb' | 'rpm' | 'msi' | 'android' | 'ios' | 'node'
type Mode = 'full' | 'client'

const props = withDefaults(defineProps<{
  appName?: string
  configPath?: string
  targets?: string  // Comma-separated: "dmg,exe,android" or "all"
  modes?: string    // Comma-separated: "full,client" or "full" or "client"
  backendUrl?: string
}>(), {
  appName: 'MyApp',
  configPath: './stack.yaml',
  targets: 'all',
  modes: 'full',
  backendUrl: 'https://your-api.example.com'
})

// All available targets with their metadata
const TARGET_CONFIG: Record<Target, { label: string; format: string; flag: string }> = {
  node: { label: 'Node Binary', format: 'single-executable', flag: '' },
  dmg: { label: 'macOS (.dmg)', format: 'desktop', flag: '--desktop-platform dmg' },
  exe: { label: 'Windows (.exe)', format: 'desktop', flag: '--desktop-platform exe' },
  appimage: { label: 'Linux (AppImage)', format: 'desktop', flag: '--desktop-platform appimage' },
  deb: { label: 'Linux (.deb)', format: 'desktop', flag: '--desktop-platform deb' },
  rpm: { label: 'Linux (.rpm)', format: 'desktop', flag: '--desktop-platform rpm' },
  msi: { label: 'Windows (.msi)', format: 'desktop', flag: '--desktop-platform msi' },
  android: { label: 'Android (.apk)', format: 'mobile', flag: '--mobile-target android' },
  ios: { label: 'iOS (.ipa)', format: 'mobile', flag: '--mobile-target ios' },
}

// Default targets when "all" is specified
const DEFAULT_TARGETS: Target[] = ['dmg', 'exe', 'appimage', 'android', 'ios']

// Generate kebab-case version for APK filename
const kebabName = computed(() => 
  props.appName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
)

// Parse targets from prop
const activeTargets = computed<Target[]>(() => {
  if (props.targets === 'all') return DEFAULT_TARGETS
  return props.targets.split(',').map(t => t.trim() as Target).filter(t => t in TARGET_CONFIG)
})

// Parse modes from prop
const activeModes = computed<Mode[]>(() => {
  return props.modes.split(',').map(m => m.trim() as Mode).filter(m => m === 'full' || m === 'client')
})

// Get file extension for output
function getOutputName(target: Target): string {
  const name = props.appName
  const kebab = kebabName.value
  
  switch (target) {
    case 'node': return name
    case 'dmg': return `${name}.dmg`
    case 'exe': return `${name}-Setup.exe`
    case 'msi': return `${name}.msi`
    case 'appimage': return `${name}.AppImage`
    case 'deb': return `${kebab}.deb`
    case 'rpm': return `${kebab}.rpm`
    case 'android': return `${kebab}.apk`
    case 'ios': return `${name}.ipa`
    default: return name
  }
}

// Generate commands based on targets and modes
const commands = computed<PackCommand[]>(() => {
  const result: PackCommand[] = []
  
  for (const mode of activeModes.value) {
    for (const target of activeTargets.value) {
      const config = TARGET_CONFIG[target]
      const isFull = mode === 'full'
      
      // Node binary is always "full" (embedded backend)
      if (target === 'node' && mode === 'client') continue
      
      // Determine format based on mode
      let format = config.format
      if (target !== 'node') {
        format = isFull ? `${config.format}-full` : config.format
      }
      
      // Build command parts
      const parts = [
        'npx habits pack',
        `--config ${props.configPath}`,
        `--format ${format}`,
      ]
      
      // Add backend URL for client mode
      if (!isFull && target !== 'node') {
        parts.push(`--backend-url ${props.backendUrl}`)
      }
      
      // Add platform-specific flag
      if (config.flag) {
        parts.push(config.flag)
      }
      
      // Add output
      parts.push(`--output ./${getOutputName(target)}`)
      
      // Build description
      let description = ''
      if (target === 'node') {
        description = 'Standalone server binary with embedded backend. No Node.js required to run.'
      } else if (isFull) {
        description = `Standalone ${config.label.split(' ')[0]} app with embedded backend. No server required.`
      } else {
        description = `${config.label.split(' ')[0]} app connecting to your deployed backend.`
      }
      
      // Add iOS note
      if (target === 'ios') {
        description += ' Requires macOS with Xcode.'
      }
      
      // Build label (include mode if showing both)
      let label = config.label
      if (activeModes.value.length > 1 && target !== 'node') {
        label = `${config.label} (${isFull ? 'Full' : 'Client'})`
      }
      
      result.push({
        label,
        description,
        cmd: parts.join(' ')
      })
    }
  }
  
  return result
})

// Check if we should show simplified single-command view
const isSingleCommand = computed(() => commands.value.length === 1)

const activeTab = ref(0)
const highlightedCode = ref<Record<number, string>>({})

async function highlightCommands() {
  highlightedCode.value = {}
  for (let i = 0; i < commands.value.length; i++) {
    highlightedCode.value[i] = await codeToHtml(commands.value[i].cmd, {
      lang: 'bash',
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      }
    })
  }
}

onMounted(highlightCommands)

// Re-highlight if commands change
watch(commands, highlightCommands, { deep: true })

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <!-- Single command: simplified view -->
  <div v-if="isSingleCommand" class="pack-commands-single">
    <div class="code-block">
      <button class="copy-btn" @click="copyToClipboard(commands[0].cmd)" title="Copy to clipboard">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <p class="cmd-description">{{ commands[0].description }}</p>
      <div 
        v-if="highlightedCode[0]" 
        class="highlighted-code"
        v-html="highlightedCode[0]"
      ></div>
      <pre v-else><code>{{ commands[0].cmd }}</code></pre>
    </div>
  </div>

  <!-- Multiple commands: tabbed view -->
  <div v-else class="pack-commands">
    <div class="tabs-header">
      <button 
        v-for="(cmd, index) in commands" 
        :key="index"
        :class="['tab-btn', { active: activeTab === index }]"
        @click="activeTab = index"
      >
        {{ cmd.label }}
      </button>
    </div>
    <div class="code-block">
      <button class="copy-btn" @click="copyToClipboard(commands[activeTab].cmd)" title="Copy to clipboard">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <p class="cmd-description">{{ commands[activeTab].description }}</p>
      <div 
        v-if="highlightedCode[activeTab]" 
        class="highlighted-code"
        v-html="highlightedCode[activeTab]"
      ></div>
      <pre v-else><code>{{ commands[activeTab].cmd }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.pack-commands,
.pack-commands-single {
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  overflow-x: auto;
  scrollbar-width: none;
  flex-wrap: wrap;
}

.tabs-header::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--vp-c-text-1);
}

.tab-btn.active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}

.code-block {
  position: relative;
  background: var(--vp-code-block-bg);
  padding: 1rem;
}

.copy-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.375rem;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.2s;
  z-index: 10;
}

.copy-btn:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.cmd-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.highlighted-code :deep(pre) {
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow-x: auto;
}

.highlighted-code :deep(code) {
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  line-height: 1.6;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

pre code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}
</style>
