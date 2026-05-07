<script setup lang="ts">
import { ref, watch } from 'vue';
import { api } from '@/api';
import dayjs from 'dayjs';
import type { Schedule } from '@/types';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();

const today = dayjs().format('YYYY-MM-DD');

const notes = ref('');
const loading = ref(false);
const submitting = ref(false);
const items = ref<Schedule[]>([]);
const checked = ref<Record<number, boolean>>({});

async function load() {
  loading.value = true;
  notes.value = '';
  items.value = [];
  checked.value = {};
  try {
    const [list, logRes] = await Promise.all([
      api.schedules.byDate(today).catch(() => [] as Schedule[]),
      api.dayLog.get(today).catch(() => null),
    ]);
    items.value = list || [];
    const init: Record<number, boolean> = {};
    for (const s of items.value) init[s.id] = !!s.is_done;
    checked.value = init;
    if ((logRes as any)?.notes) notes.value = (logRes as any).notes;
  } finally {
    loading.value = false;
  }
}

watch(() => props.modelValue, (v) => { if (v) load(); });

function close() { emit('update:modelValue', false); }

async function submit() {
  submitting.value = true;
  try {
    for (const item of items.value) {
      const done = !!checked.value[item.id];
      if (done) {
        await api.schedules.progress(item.id, { is_done: true });
        if (item.book_id) {
          await api.books.complete(item.book_id);
        }
      } else {
        await api.schedules.progress(item.id, { is_done: false });
      }
    }
    await api.dayLog.report(today, { notes: notes.value });
    close();
  } finally {
    submitting.value = false;
  }
}

async function closeRest() {
  submitting.value = true;
  try {
    await api.dayLog.report(today, { notes: notes.value || '(今日休息)' });
    close();
  } finally {
    submitting.value = false;
  }
}

function labelFor(s: Schedule) {
  if (s.segment_kind === 'video') return `${s.book_title} · 录制视频`;
  return s.book_title || '本';
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 grid place-items-center">
      <div class="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" @click="close" />
      <div class="relative card max-w-md w-full mx-4 animate-pop flex flex-col max-h-[88vh]">
        <h3 class="text-lg text-brand-700 mb-1 shrink-0">今天画得怎么样？</h3>
        <p class="text-xs text-ink-500 mb-3 shrink-0">辛苦啦～核对一下今日进度 ({{ today }})</p>

        <div v-if="loading" class="text-sm text-ink-500 py-8 text-center">加载中…</div>

        <template v-else-if="!items.length">
          <div class="bg-cream-200/50 rounded-xl2 p-4 text-sm text-ink-700 mb-3">
            今天没有排期，是休息了吗？☕
          </div>
          <textarea v-model="notes" rows="2" class="input text-sm shrink-0"
                    placeholder="想记点什么（可选）" />
          <div class="flex justify-end gap-2 mt-4 shrink-0">
            <button class="btn-primary" :disabled="submitting" @click="closeRest">
              {{ submitting ? '保存中…' : '收到' }}
            </button>
          </div>
        </template>

        <template v-else>
          <div class="text-xs text-ink-500 mb-1 px-1 shrink-0">勾上 = 已完成</div>
          <div class="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 -mr-1">
            <label v-for="s in items" :key="s.id"
                   class="flex items-start gap-2 p-2 rounded-lg bg-cream-200/40 hover:bg-cream-200/70
                          transition cursor-pointer">
              <input type="checkbox" class="w-4 h-4 mt-0.5 shrink-0" v-model="checked[s.id]" />
              <div class="flex-1 min-w-0">
                <div class="text-sm text-ink-700 truncate" :class="checked[s.id] ? '' : 'text-ink-500'">
                  {{ labelFor(s) }}
                </div>
                <div v-if="s.is_done" class="text-[11px] text-[#35704A] mt-0.5">已完成</div>
              </div>
            </label>
          </div>

          <textarea v-model="notes" rows="2" class="input text-sm mt-3 shrink-0"
                    placeholder="今天遇到什么问题？明天想怎么安排？（可选）" />

          <div class="flex flex-wrap justify-end gap-2 mt-3 shrink-0">
            <button class="btn-ghost text-sm" :disabled="submitting" @click="close">明天再说</button>
            <button class="btn-primary text-sm" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中…' : '提交' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
