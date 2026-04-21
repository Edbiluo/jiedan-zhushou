<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { usePagesStore } from '@/stores/pages';
import type { Page } from '@/types';

/**
 * 复用的画页编辑/上传弹窗
 * - v-model:open 控制显隐
 * - target 传入代表「编辑模式」，不传代表「上传模式」（编辑模式下不能换图）
 * - saved 事件会在保存成功后触发，父组件可借此刷新对应数据
 */
const props = defineProps<{ open: boolean; target?: Page | null }>();
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void;
  (e: 'saved', p: { id?: number; isEdit: boolean }): void;
}>();

const settings = useSettingsStore();
const pages = usePagesStore();

const form = reactive({
  title: '',
  src_path: '',
  style_id: undefined as number | undefined,
  size_id: undefined as number | undefined,
  is_cover: false,
  estimated_hours: 1,
  note: '',
});
const submitting = ref(false);

function resetForm() {
  form.title = '';
  form.src_path = '';
  form.style_id = undefined;
  form.size_id = undefined;
  form.is_cover = false;
  form.estimated_hours = 1;
  form.note = '';
}

function fillFromTarget(p: Page) {
  form.title = p.title;
  form.src_path = p.image_path;
  form.style_id = p.style_id ?? undefined;
  form.size_id = p.size_id ?? undefined;
  form.is_cover = !!p.is_cover;
  form.estimated_hours = p.estimated_hours;
  form.note = p.note;
}

// 打开时根据 target 填充
watch(
  () => props.open,
  (v) => {
    if (!v) return;
    if (props.target) fillFromTarget(props.target);
    else resetForm();
  },
  { immediate: true },
);

async function pickImage() {
  if ((window as any).electronAPI?.pickImage) {
    const p = await (window as any).electronAPI.pickImage();
    if (p) form.src_path = p;
  } else {
    form.src_path = prompt('开发态输入图片绝对路径：') || '';
  }
}

function close() {
  if (submitting.value) return;
  emit('update:open', false);
}

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    if (props.target) {
      await pages.update(props.target.id, {
        title: form.title,
        style_id: form.is_cover ? null : form.style_id ?? null,
        size_id: form.is_cover ? null : form.size_id ?? null,
        is_cover: form.is_cover ? 1 : 0,
        estimated_hours: form.estimated_hours,
        note: form.note,
      });
      emit('saved', { id: props.target.id, isEdit: true });
    } else {
      if (!form.src_path) {
        alert('请先选择图片');
        submitting.value = false;
        return;
      }
      await pages.create({ ...form, is_cover: form.is_cover ? 1 : 0 });
      emit('saved', { isEdit: false });
    }
    emit('update:open', false);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[60] grid place-items-center">
      <div class="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" @click="close" />
      <div class="relative card w-[520px] max-w-[92vw] max-h-[90vh] overflow-auto animate-pop">
        <h3 class="text-lg text-brand-700 mb-4">{{ target ? '编辑画页' : '上传画页' }}</h3>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-ink-500">标题</label>
            <input v-model="form.title" class="input" placeholder="比如：樱花主题小涂鸦" />
          </div>
          <div v-if="!target">
            <label class="text-xs text-ink-500">图片</label>
            <div class="flex gap-2 items-center">
              <button class="btn-ghost" @click="pickImage">选择图片</button>
              <span class="text-xs text-ink-500 truncate">{{ form.src_path || '未选择' }}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm flex items-center gap-2">
              <input type="checkbox" v-model="form.is_cover" /> 这是封页
            </label>
          </div>
          <template v-if="!form.is_cover">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-ink-500">款式</label>
                <select v-model="form.style_id" class="input">
                  <option :value="undefined">不选</option>
                  <option v-for="s in settings.styles" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div>
                <label class="text-xs text-ink-500">尺寸</label>
                <select v-model="form.size_id" class="input">
                  <option :value="undefined">不选</option>
                  <option v-for="s in settings.sizes" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>
          </template>
          <div>
            <label class="text-xs text-ink-500">备注</label>
            <textarea v-model="form.note" class="input" rows="2" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn-ghost" :disabled="submitting" @click="close">取消</button>
          <button class="btn-primary" :disabled="submitting" @click="submit">
            {{ submitting ? '保存中…' : target ? '保存' : '上传' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
