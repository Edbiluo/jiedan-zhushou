<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

type UpdaterState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'none' }
  | { status: 'available'; version?: string }
  | { status: 'downloading'; percent?: number }
  | { status: 'downloaded'; version?: string }
  | { status: 'error'; message?: string };

const state = ref<UpdaterState>({ status: 'idle' });
const currentVersion = ref<string>('');
let unsub: (() => void) | null = null;

onMounted(async () => {
  const api = (window as any).electronAPI;
  if (!api?.onUpdaterState) return;
  unsub = api.onUpdaterState((s: UpdaterState) => { state.value = s; });
  try { currentVersion.value = await api.getVersion(); } catch {}
});
onBeforeUnmount(() => { if (unsub) unsub(); });

async function installNow() {
  const api = (window as any).electronAPI;
  if (api?.quitAndInstall) await api.quitAndInstall();
}

async function checkNow() {
  const api = (window as any).electronAPI;
  if (api?.checkUpdateNow) await api.checkUpdateNow();
}
</script>

<template>
  <div class="flex items-center gap-2 text-xs">
    <!-- 下载完成：可重启安装 -->
    <button v-if="state.status === 'downloaded'"
            class="bg-brand-400 hover:bg-brand-500 text-white rounded-full px-3 py-1 shadow-soft transition"
            @click="installNow"
            :title="`v${state.version} 已就绪，点击重启安装`">
      ✨ 新版 v{{ state.version }}
    </button>

    <!-- 下载中 -->
    <span v-else-if="state.status === 'downloading'" class="text-ink-500">
      下载新版中… {{ Math.round(state.percent || 0) }}%
    </span>

    <!-- 发现新版（autoDownload=true 时会立刻切 downloading，这个状态一般一闪而过）-->
    <span v-else-if="state.status === 'available'" class="text-brand-600">
      发现新版 v{{ state.version }}…
    </span>

    <!-- 错误：点击手动重试 -->
    <button v-else-if="state.status === 'error'"
            class="text-[#8A3640] hover:underline"
            :title="state.message || '更新检查失败'"
            @click="checkNow">
      更新检查失败，点此重试
    </button>

    <!-- 版本号常驻显示 -->
    <span v-if="currentVersion" class="text-ink-400">v{{ currentVersion }}</span>
  </div>
</template>
