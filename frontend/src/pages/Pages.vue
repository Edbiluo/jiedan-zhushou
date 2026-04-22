<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageEditModal from '@/components/PageEditModal.vue';
import { usePagesStore } from '@/stores/pages';
import { useSettingsStore } from '@/stores/settings';
import type { Page } from '@/types';

const pages = usePagesStore();
const settings = useSettingsStore();

const showModal = ref(false);
const editTarget = ref<Page | null>(null);
const previewPage = ref<Page | null>(null);
const previewZoom = ref(1);

function openUpload() {
  editTarget.value = null;
  showModal.value = true;
}

function openEdit(p: Page) {
  editTarget.value = p;
  showModal.value = true;
}

async function remove(p: Page) {
  if (!confirm(`删除画页「${p.title}」？`)) return;
  await pages.remove(p.id);
}

function openPreview(p: Page) {
  previewPage.value = p;
  previewZoom.value = 1;
}

function handlePreviewWheel(e: WheelEvent) {
  if (!previewPage.value) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.1 : -0.1;
  previewZoom.value = Math.max(0.5, Math.min(3, previewZoom.value - delta));
}

function resetPreviewZoom() {
  previewZoom.value = 1;
}

onMounted(async () => {
  if (!settings.loaded) await settings.load();
  await pages.reload();
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && previewPage.value) {
      previewPage.value = null;
    }
  };
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
});

const coverFilter = computed({
  get: () => pages.filter.is_cover,
  set: (v) => { pages.filter.is_cover = v; pages.reload(); },
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <select v-model="pages.filter.style_id" class="input !w-auto" @change="pages.reload()">
        <option :value="undefined">全部款式</option>
        <option v-for="s in settings.styles" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <select v-model="pages.filter.size_id" class="input !w-auto" @change="pages.reload()">
        <option :value="undefined">全部尺寸</option>
        <option v-for="s in settings.sizes" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <label class="text-sm flex items-center gap-1">
        <input type="checkbox" :checked="coverFilter === true" @change="($event.target as HTMLInputElement).checked ? coverFilter = true : coverFilter = undefined" />
        只看封页
      </label>
      <input v-model="pages.filter.keyword" placeholder="搜索标题..." class="input !w-48" @keyup.enter="pages.reload()" />
      <button class="btn-primary ml-auto" @click="openUpload">
        ＋ 上传画页
      </button>
    </div>

    <div v-if="pages.loading" class="text-center py-10 text-ink-500">加载中...</div>
    <div v-else-if="!pages.list.length" class="text-center py-20 text-ink-500">
      还没有画页，点上面按钮上传一张试试吧 ✿
    </div>
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div v-for="p in pages.list" :key="p.id"
           class="card p-3 cursor-pointer transition hover:-translate-y-1 hover:shadow-pop relative group"
           @click="openPreview(p)">
        <div class="aspect-square w-full bg-cream-200 rounded-xl2 overflow-hidden mb-2 grid place-items-center">
          <img v-if="p.thumb_path" :src="`http://localhost:3899/images/${p.thumb_path}`" class="w-full h-full object-cover" @error="($event.target as HTMLImageElement).style.display='none'" />
          <span v-else class="text-4xl opacity-40">🎨</span>
        </div>
        <div class="text-sm text-ink-900 truncate">{{ p.title }}</div>
        <div class="flex flex-wrap gap-1 mt-1 text-xs">
          <span v-if="p.is_cover" class="chip-warn">封页</span>
          <template v-else>
            <span v-if="settings.styles.find((s) => s.id === p.style_id)" class="chip-brand">{{ settings.styles.find((s) => s.id === p.style_id)?.name }}</span>
            <span v-if="settings.sizes.find((s) => s.id === p.size_id)" class="chip">{{ settings.sizes.find((s) => s.id === p.size_id)?.name }}</span>
          </template>
        </div>
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button class="bg-white/90 hover:bg-brand-400 hover:text-white text-ink-700 shadow-soft rounded-full w-7 h-7 grid place-items-center text-xs transition" title="编辑" @click.stop="openEdit(p)">✎</button>
          <button class="bg-white/90 hover:bg-[#D98B92] hover:text-white text-ink-700 shadow-soft rounded-full w-7 h-7 grid place-items-center text-xs transition" title="删除" @click.stop="remove(p)">✕</button>
        </div>
      </div>
    </div>

    <PageEditModal v-model:open="showModal" :target="editTarget" />

    <!-- 大图预览 -->
    <Teleport to="body">
      <div v-if="previewPage" class="fixed inset-0 z-[60] grid place-items-center"
           @click="previewPage = null"
           @wheel="handlePreviewWheel">
        <div class="absolute inset-0 bg-ink-900/80" @click.stop="previewPage = null" />
        <div class="relative flex flex-col items-center gap-2">
          <div class="flex gap-2 mb-2">
            <button class="text-xs bg-white/90 text-ink-700 px-2 py-1 rounded hover:bg-white transition"
                    @click.stop="resetPreviewZoom">
              重置缩放
            </button>
            <span class="text-xs text-white">{{ Math.round(previewZoom * 100) }}%</span>
            <button class="text-xs bg-white/90 text-ink-700 px-2 py-1 rounded hover:bg-white transition"
                    title="关闭"
                    @click.stop="previewPage = null">
              × 关闭
            </button>
          </div>
          <div class="relative w-[92vw] h-[92vh] flex items-center justify-center overflow-hidden rounded-xl"
               @click.stop>
            <img v-if="previewPage.image_path"
                 :src="`http://localhost:3899/images/${previewPage.image_path}`"
                 class="object-contain transition-transform duration-100"
                 :style="{
                   transform: `scale(${previewZoom})`,
                   maxHeight: '100%',
                   maxWidth: '100%',
                 }"
                 @keydown.esc="previewPage = null" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
img:focus {
  outline: none;
}
</style>
