<script setup lang="ts">
import { computed } from 'vue'

interface DownloadItem {
  filename: string
  platform: 'mac' | 'windows' | 'linux' | 'android' | 'ios' | 'universal'
  size: number
  displaySize: string
}

const props = defineProps<{
  downloads: DownloadItem[]
  basePath: string // e.g., "/showcase/qr-database/downloads"
}>()

const platformInfo: Record<string, { label: string; icon: string }> = {
  mac: { label: 'macOS', icon: 'apple' },
  windows: { label: 'Windows', icon: 'windows' },
  linux: { label: 'Linux', icon: 'linux' },
  android: { label: 'Android', icon: 'android' },
  ios: { label: 'iOS', icon: 'ios' },
  universal: { label: 'Universal', icon: 'download' },
}

function getDownloadUrl(filename: string): string {
  return `/intersect/habits${props.basePath}/${filename}`
}

function getPlatformLabel(platform: string): string {
  return platformInfo[platform]?.label || platform
}
</script>

<template>
  <div class="download-builds">
    <div class="downloads-grid">
      <a 
        v-for="download in downloads" 
        :key="download.filename"
        :href="getDownloadUrl(download.filename)"
        class="download-card"
        :class="`platform-${download.platform}`"
        download
      >
        <div class="platform-icon">
          <!-- macOS / Apple -->
          <svg v-if="download.platform === 'mac'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <!-- Windows -->
          <svg v-else-if="download.platform === 'windows'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
          </svg>
          <!-- Linux -->
          <svg v-else-if="download.platform === 'linux'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.504 0c-.155 0-.311.008-.465.024-.719.082-1.423.31-2.054.62-.63.31-1.19.717-1.655 1.212-.466.495-.834 1.073-1.087 1.712-.253.64-.39 1.327-.39 2.024 0 .304.027.609.08.91.052.3.129.596.229.883.1.287.222.564.366.826s.306.513.488.74c.181.227.382.437.602.627.22.19.456.36.707.507.25.147.515.271.79.368.275.097.56.167.853.208v4.168c-.293.041-.578.111-.853.208-.275.097-.54.221-.79.368-.251.147-.487.317-.707.507-.22.19-.421.4-.602.627-.182.227-.344.478-.488.74-.144.262-.266.539-.366.826-.1.287-.177.583-.229.883-.053.301-.08.606-.08.91 0 .697.137 1.384.39 2.024.253.639.621 1.217 1.087 1.712.465.495 1.025.902 1.655 1.212.631.31 1.335.538 2.054.62.154.016.31.024.465.024.697 0 1.384-.137 2.024-.39.639-.253 1.217-.621 1.712-1.087.495-.465.902-1.025 1.212-1.655.31-.631.538-1.335.62-2.054.016-.154.024-.31.024-.465 0-.304-.027-.609-.08-.91-.052-.3-.129-.596-.229-.883-.1-.287-.222-.564-.366-.826s-.306-.513-.488-.74c-.181-.227-.382-.437-.602-.627-.22-.19-.456-.36-.707-.507-.25-.147-.515-.271-.79-.368-.275-.097-.56-.167-.853-.208v-4.168c.293-.041.578-.111.853-.208.275-.097.54-.221.79-.368.251-.147.487-.317.707-.507.22-.19.421-.4.602-.627.182-.227.344-.478.488-.74.144-.262.266-.539.366-.826.1-.287.177-.583.229-.883.053-.301.08-.606.08-.91 0-.697-.137-1.384-.39-2.024-.253-.639-.621-1.217-1.087-1.712-.465-.495-1.025-.902-1.655-1.212-.631-.31-1.335-.538-2.054-.62-.154-.016-.31-.024-.465-.024zm-.004 1.5c.104 0 .208.005.311.016.484.052.955.207 1.38.415.424.208.8.483 1.112.812.313.329.56.715.726 1.143.166.428.253.892.253 1.363 0 .204-.018.408-.053.608-.036.2-.087.397-.154.588-.067.191-.149.375-.245.549-.096.173-.206.338-.328.491-.123.152-.258.294-.402.422-.145.128-.3.243-.463.343-.163.1-.334.186-.512.253-.178.067-.362.116-.551.144v6.154c.189.028.373.077.551.144.178.067.349.153.512.253.163.1.318.215.463.343.144.128.279.27.402.422.122.153.232.318.328.491.096.174.178.358.245.549.067.191.118.388.154.588.035.2.053.404.053.608 0 .471-.087.935-.253 1.363-.166.428-.413.814-.726 1.143-.312.329-.688.604-1.112.812-.425.208-.896.363-1.38.415-.103.011-.207.016-.311.016-.471 0-.935-.087-1.363-.253-.428-.166-.814-.413-1.143-.726-.329-.312-.604-.688-.812-1.112-.208-.425-.363-.896-.415-1.38-.011-.103-.016-.207-.016-.311 0-.204.018-.408.053-.608.036-.2.087-.397.154-.588.067-.191.149-.375.245-.549.096-.173.206-.338.328-.491.123-.152.258-.294.402-.422.145-.128.3-.243.463-.343.163-.1.334-.186.512-.253.178-.067.362-.116.551-.144v-6.154c-.189-.028-.373-.077-.551-.144-.178-.067-.349-.153-.512-.253-.163-.1-.318-.215-.463-.343-.144-.128-.279-.27-.402-.422-.122-.153-.232-.318-.328-.491-.096-.174-.178-.358-.245-.549-.067-.191-.118-.388-.154-.588-.035-.2-.053-.404-.053-.608 0-.471.087-.935.253-1.363.166-.428.413-.814.726-1.143.329-.329.715-.604 1.143-.812.428-.208.892-.363 1.363-.415.103-.011.207-.016.311-.016z"/>
          </svg>
          <!-- Android -->
          <svg v-else-if="download.platform === 'android'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.523 15.34a.69.69 0 01-.69.69.69.69 0 01-.69-.69.69.69 0 01.69-.69.69.69 0 01.69.69m-10.356 0a.69.69 0 01-.69.69.69.69 0 01-.69-.69.69.69 0 01.69-.69.69.69 0 01.69.69m10.631-4.64l1.893-3.28a.394.394 0 00-.144-.537.394.394 0 00-.537.144L17.102 10.3a9.05 9.05 0 00-5.101-1.51 9.05 9.05 0 00-5.101 1.51L5.002 7.018a.394.394 0 00-.537-.144.394.394 0 00-.144.537l1.893 3.28C3.177 12.5 1 15.84 1 19.65h22c0-3.81-2.177-7.15-5.202-8.95"/>
          </svg>
          <!-- iOS -->
          <svg v-else-if="download.platform === 'ios'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <!-- Universal / Default -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
        <div class="download-info">
          <span class="platform-label">{{ getPlatformLabel(download.platform) }}</span>
          <span class="file-name">{{ download.filename }}</span>
          <span class="file-size">{{ download.displaySize }}</span>
        </div>
        <div class="download-arrow">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.download-builds {
  margin: 1.5rem 0;
}

.downloads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.download-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: all 0.2s ease;
}

.download-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.platform-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.download-card:hover .platform-icon {
  color: var(--vp-c-brand-1);
}

/* Platform-specific colors on hover */
.download-card.platform-mac:hover .platform-icon {
  color: #555;
}

.download-card.platform-windows:hover .platform-icon {
  color: #0078d4;
}

.download-card.platform-linux:hover .platform-icon {
  color: #f5a623;
}

.download-card.platform-android:hover .platform-icon {
  color: #3ddc84;
}

.download-card.platform-ios:hover .platform-icon {
  color: #007aff;
}

.download-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.platform-label {
  font-weight: 600;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.file-name {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  font-weight: 500;
}

.download-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  transition: all 0.2s ease;
}

.download-card:hover .download-arrow {
  color: var(--vp-c-brand-1);
  transform: translateY(2px);
}

/* Dark mode adjustments */
.dark .download-card {
  box-shadow: none;
}

.dark .download-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .platform-icon {
  background: var(--vp-c-bg-elv);
}
</style>
