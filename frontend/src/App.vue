<script setup lang="ts">
import { onMounted, ref } from 'vue';
import MainLayout from './layouts/MainLayout.vue';
import ReminderModal from './components/ReminderModal.vue';
import { useSettingsStore } from './stores/settings';

const settings = useSettingsStore();
const showReminder = ref(false);

onMounted(async () => {
  await settings.load();
  const unreported = await checkUnreportedToday();
  if (unreported) showReminder.value = true;
});

async function checkUnreportedToday() {
  // Electron 环境里用 IPC，浏览器开发态回退到 fetch
  if ((window as any).electronAPI?.showUnreportedToday) {
    return await (window as any).electronAPI.showUnreportedToday();
  }
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(`/api/day-log/${today}`).then((r) => r.json());
    return !(res?.ok && res.data);
  } catch {
    return false;
  }
}
</script>

<template>
  <MainLayout />
  <ReminderModal v-model="showReminder" />
</template>
