import DefaultTheme from 'vitepress/theme'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'

import Layout from './Layout.vue'
import HabitViewer from './components/HabitViewer.vue'
import ExampleRunner from './components/ExampleRunner.vue'
import DownloadExample from './components/DownloadExample.vue'
import ScreenshotGallery from './components/ScreenshotGallery.vue'
import './custom.css'
import './d2-custom.css'


export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('HabitViewer', HabitViewer)
    app.component('ExampleRunner', ExampleRunner)
    app.component('DownloadExample', DownloadExample)
    app.component('ScreenshotGallery', ScreenshotGallery)
    enhanceAppWithTabs(app)
  }
}
