<script setup lang="ts">
import type { Page } from '@/types';
import { useSettingsStore } from '@/stores/settings';
import { computed, ref } from 'vue';

const props = defineProps<{ page: Page; selectable?: boolean; selected?: boolean }>();
const emit = defineEmits<{ (e: 'click', p: Page): void; (e: 'edit', p: Page): void; (e: 'remove', p: Page): void; (e: 'preview', p: Page): void }>();

const settings = useSettingsStore();
const styleName = computed(() => settings.styles.find((s) => s.id === props.page.style_id)?.name);
const sizeName = computed(() => settings.sizes.find((s) => s.id === props.page.size_id)?.name);
const isDragging = ref(false);

function handleMouseDown() {
  isDragging.value = true;
}

function handleMouseUp() {
  isDragging.value = false;
}
</script>

<template>
  <div
    class="card p-3 cursor-pointer transition hover:-translate-y-1 hover:shadow-pop relative group"
    :class="{ 'ring-2 ring-brand-400': selected }"
    @click="emit('click', page)"
    @mousedown="selectable ? null : handleMouseDown()"
    @mouseup="handleMouseUp()"
  >
    <div class="aspect-square w-full bg-cream-200 rounded-xl2 overflow-hidden mb-2 grid place-items-center cursor-zoom-in"
         @click.stop="emit('preview', page)">
      <img v-if="page.thumb_path" :src="`http://localhost:3899/images/${page.thumb_path}`" class="w-full h-full object-cover" @error="($event.target as HTMLImageElement).style.display='none'" />
      <span v-else class="text-4xl opacity-40">🎨</span>
    </div>
    <div class="text-sm text-ink-900 truncate">{{ page.title }}</div>
    <div class="flex flex-wrap gap-1 mt-1 text-xs">
      <span v-if="page.is_cover" class="chip-warn">封页</span>
      <template v-else>
        <span v-if="styleName" class="chip-brand">{{ styleName }}</span>
        <span v-if="sizeName" class="chip">{{ sizeName }}</span>
      </template>
    </div>
    <div v-if="!selectable" class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
      <button class="bg-white/90 hover:bg-brand-400 hover:text-white text-ink-700 shadow-soft rounded-full w-7 h-7 grid place-items-center text-xs transition" title="编辑" @click.stop="emit('edit', page)">✎</button>
      <button class="bg-white/90 hover:bg-[#D98B92] hover:text-white text-ink-700 shadow-soft rounded-full w-7 h-7 grid place-items-center text-xs transition" title="删除" @click.stop="emit('remove', page)">✕</button>
    </div>
  </div>
</template>
