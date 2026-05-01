<script setup>
import StageBase from './StageBase.vue'
import StageYaml from './StageYaml.vue'
import StageDesktopApp from './StageDesktopApp.vue'
import StageMobileApp from './StageMobileApp.vue'
import StageDocker from './StageDocker.vue'
import StageServer from './StageServer.vue'
import StageMonitoring from './StageMonitoring.vue'
import StageAdminSingle from './StageAdminSingle.vue'
import StageAdminList from './StageAdminList.vue'

defineProps({ kind: { type: String, required: true } })
</script>

<template>
  <div class="visual" :data-kind="kind">
    <!-- 1. CREATE, Habits Base (visual builder) -->
    <StageBase v-if="kind === 'base'" />

    <!-- 2. CODE, YAML -->
    <StageYaml v-else-if="kind === 'yaml'" />

    <!-- 3. PC/Mac app -->
    <StageDesktopApp v-else-if="kind === 'desktop-app'" />

    <!-- 4. Mobile app -->
    <StageMobileApp v-else-if="kind === 'mobile-app'" />

    <!-- 5. Docker -->
    <StageDocker v-else-if="kind === 'docker'" />

    <!-- 6. Server -->
    <StageServer v-else-if="kind === 'server'" />

    <!-- 7. Monitor -->
    <StageMonitoring v-else-if="kind === 'monitoring'" />

    <!-- 8. Admin single page (subdomain link) -->
    <StageAdminSingle v-else-if="kind === 'admin-single'" />

    <!-- 9. Admin list page -->
    <StageAdminList v-else-if="kind === 'admin-list'" />
  </div>
</template>

<style scoped>
.visual { width: 100%; height: 100%; position: relative; }
</style>
