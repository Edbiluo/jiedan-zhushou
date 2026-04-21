<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageCard from '@/components/PageCard.vue';
import PageEditModal from '@/components/PageEditModal.vue';
import { usePagesStore } from '@/stores/pages';
import { useSettingsStore } from '@/stores/settings';
import type { Page } from '@/types';

const pages = usePagesStore();
const settings = useSettingsStore();

const showModal = ref(false);
const editTarget = ref<Page | null>(null);

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

onMounted(async () => {
  if (!settings.loaded) await settings.load();
  await pages.reload();
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
      <PageCard v-for="p in pages.list" :key="p.id" :page="p" @edit="openEdit" @remove="remove" />
    </div>

    <PageEditModal v-model:open="showModal" :target="editTarget" />
  </div>
</template>
