import DefaultTheme from 'vitepress/theme'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'

import Layout from './Layout.vue'
import HabitViewer from './components/HabitViewer.vue'
import HabitViewerTabs from './components/HabitViewerTabs.vue'
import ExampleRunner from './components/ExampleRunner.vue'
import PackRunner from './components/PackRunner.vue'
import PackCommandsAll from './components/PackCommandsAll.vue'
import DownloadExample from './components/DownloadExample.vue'
import DownloadBuilds from './components/DownloadBuilds.vue'
import ScreenshotGallery from './components/ScreenshotGallery.vue'
import Checklist from './components/Checklist.vue'
import ShowcaseGrid from './components/ShowcaseGrid.vue'
import ShowcaseCard from './components/ShowcaseCard.vue'
import ShowcaseHero from './components/ShowcaseHero.vue'
import BitsGrid from './components/BitsGrid.vue'
import BitsCard from './components/BitsCard.vue'
import Icon from './components/Icon.vue'
import ComparisonLayout from './components/ComparisonLayout.vue'
import './custom.css'
import './home-tokens.css'
import './d2-custom.css'


export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('HabitViewer', HabitViewer)
    app.component('HabitViewerTabs', HabitViewerTabs)
    app.component('ExampleRunner', ExampleRunner)
    app.component('PackRunner', PackRunner)
    app.component('PackCommandsAll', PackCommandsAll)
    app.component('DownloadExample', DownloadExample)
    app.component('DownloadBuilds', DownloadBuilds)
    app.component('ScreenshotGallery', ScreenshotGallery)
    app.component('Checklist', Checklist)
    app.component('ShowcaseGrid', ShowcaseGrid)
    app.component('ShowcaseCard', ShowcaseCard)
    app.component('ShowcaseHero', ShowcaseHero)
    app.component('BitsGrid', BitsGrid)
    app.component('BitsCard', BitsCard)
    app.component('Icon', Icon)
    app.component('ComparisonLayout', ComparisonLayout)
    enhanceAppWithTabs(app)
  }
}
