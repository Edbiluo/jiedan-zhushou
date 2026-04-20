<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const newStyle = ref('');
const newSize = ref('');
const message = ref('');

onMounted(async () => {
  if (!settings.loaded) await settings.load();
});

async function updateDefaultHours(v: string) {
  await settings.update({ default_daily_hours: v });
  toast('默认工时已保存');
}
async function updateReminder(v: string) {
  await settings.update({ reminder_time: v });
  toast('提醒时间已保存');
}
async function updateNearDeadline(v: string) {
  await settings.update({ near_deadline_days: v });
  toast('快到交付阈值已保存');
}
async function updateNotification(v: boolean) {
  await settings.update({ notification_enabled: v ? '1' : '0' });
}

async function addStyle() {
  if (!newStyle.value) return;
  await settings.addStyle(newStyle.value);
  newStyle.value = '';
}
async function addSize() {
  if (!newSize.value) return;
  await settings.addSize(newSize.value);
  newSize.value = '';
}

async function exportBackup() {
  if (!(window as any).electronAPI?.exportBackup) return alert('仅桌面版支持');
  const r = await (window as any).electronAPI.exportBackup();
  if (r?.path) toast(`已导出到 ${r.path}`);
}
async function importBackup() {
  if (!(window as any).electronAPI?.importBackup) return alert('仅桌面版支持');
  if (!confirm('导入会覆盖当前数据，确定？')) return;
  const r = await (window as any).electronAPI.importBackup();
  if (r?.ok) { toast('导入完成，重启应用生效'); await settings.load(); }
}

function toast(m: string) { message.value = m; setTimeout(() => (message.value = ''), 2000); }
</script>

<template>
  <div class="space-y-4 max-w-3xl">
    <div class="card">
      <h3 class="font-hand text-lg text-brand-700 mb-3">工作节奏</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-ink-500 font-hand">默认每日工时 (h)</label>
          <input type="number" min="0.5" step="0.5" :value="settings.settings.default_daily_hours"
                 class="input" @change="updateDefaultHours(($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="text-xs text-ink-500 font-hand">"快到交付"阈值 (天)</label>
          <input type="number" min="1" :value="settings.settings.near_deadline_days"
                 class="input" @change="updateNearDeadline(($event.target as HTMLInputElement).value)" />
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="font-hand text-lg text-brand-700 mb-3">提醒</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-ink-500 font-hand">每日提醒时间</label>
          <input type="time" :value="settings.settings.reminder_time"
                 class="input" @change="updateReminder(($event.target as HTMLInputElement).value)" />
        </div>
        <div class="flex items-end">
          <label class="text-sm font-hand flex items-center gap-2">
            <input type="checkbox" :checked="settings.settings.notification_enabled === '1'"
                   @change="updateNotification(($event.target as HTMLInputElement).checked)" />
            启用桌面通知
          </label>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="font-hand text-lg text-brand-700 mb-3">款式管理</h3>
      <div class="flex flex-wrap gap-2 mb-3">
        <span v-for="s in settings.styles" :key="s.id" class="chip-brand group">
          {{ s.name }}{{ s.is_preset ? '·预置' : '' }}
          <button v-if="!s.is_preset" class="ml-1 opacity-50 hover:opacity-100" @click="settings.removeStyle(s.id)">✕</button>
        </span>
      </div>
      <div class="flex gap-2">
        <input v-model="newStyle" class="input flex-1" placeholder="新款式名称" @keyup.enter="addStyle" />
        <button class="btn-primary font-hand" @click="addStyle">添加</button>
      </div>
    </div>

    <div class="card">
      <h3 class="font-hand text-lg text-brand-700 mb-3">尺寸管理</h3>
      <div class="flex flex-wrap gap-2 mb-3">
        <span v-for="s in settings.sizes" :key="s.id" class="chip-brand group">
          {{ s.name }}{{ s.is_preset ? '·预置' : '' }}
          <button v-if="!s.is_preset" class="ml-1 opacity-50 hover:opacity-100" @click="settings.removeSize(s.id)">✕</button>
        </span>
      </div>
      <div class="flex gap-2">
        <input v-model="newSize" class="input flex-1" placeholder="新尺寸名称" @keyup.enter="addSize" />
        <button class="btn-primary font-hand" @click="addSize">添加</button>
      </div>
    </div>

    <div class="card">
      <h3 class="font-hand text-lg text-brand-700 mb-3">备份 & 恢复</h3>
      <div class="flex gap-2">
        <button class="btn-ghost font-hand" @click="exportBackup">📦 导出备份 (.zip)</button>
        <button class="btn-ghost font-hand" @click="importBackup">📥 从备份恢复</button>
      </div>
      <p class="text-xs text-ink-500 mt-2 font-hand">备份包含画页图片 + 数据库。恢复会覆盖现有数据。</p>
    </div>

    <Teleport to="body">
      <div v-if="message" class="fixed bottom-6 right-6 card !py-2 !px-4 animate-pop z-50">
        <span class="font-hand text-sm text-brand-700">{{ message }}</span>
      </div>
    </Teleport>
  </div>
</template>
