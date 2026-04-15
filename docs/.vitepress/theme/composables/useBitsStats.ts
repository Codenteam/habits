import { ref, computed, onMounted, type Ref, type ComputedRef } from 'vue'
import { useData } from 'vitepress'

interface BitStats {
  downloads: number
  downloadsFormatted: string
}

interface StatsData {
  stats: Record<string, BitStats>
  lastUpdated: string
}

interface BitInfo {
  packageName: string
  downloads: number
  downloadsFormatted: string
  [key: string]: any
}

interface UseBitsStatsReturn<T extends BitInfo> {
  mergedBits: ComputedRef<T[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  lastUpdated: Ref<string | null>
}

/**
 * Composable to fetch and merge bits download stats at runtime.
 * Overlays fresh download counts from bits-stats.json onto static bit data.
 *
 * @param staticBits - Array of bit objects with packageName, downloads, downloadsFormatted
 * @returns Object with mergedBits (computed), loading state, error, and lastUpdated timestamp
 */
export function useBitsStats<T extends BitInfo>(staticBits: T[] | Ref<T[]>): UseBitsStatsReturn<T> {
  const stats = ref<Record<string, BitStats>>({})
  const loading = ref(true)
  const error = ref<string | null>(null)
  const lastUpdated = ref<string | null>(null)

  onMounted(async () => {
    try {
      const { site } = useData()
      const base = site.value.base || '/'
      const response = await fetch(`${base}bits-stats.json`)

      if (response.ok) {
        const data: StatsData = await response.json()
        stats.value = data.stats
        lastUpdated.value = data.lastUpdated
      } else {
        // Stats file may not exist yet - not an error, just use static values
        console.debug('bits-stats.json not found, using static download values')
      }
    } catch (e) {
      // Network error or parse error - log but don't fail
      console.debug('Failed to fetch bits-stats.json:', e)
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  })

  const mergedBits = computed(() => {
    const bits = 'value' in staticBits ? staticBits.value : staticBits

    return bits.map((bit) => ({
      ...bit,
      downloads: stats.value[bit.packageName]?.downloads ?? bit.downloads,
      downloadsFormatted: stats.value[bit.packageName]?.downloadsFormatted ?? bit.downloadsFormatted,
    }))
  })

  return { mergedBits, loading, error, lastUpdated }
}
