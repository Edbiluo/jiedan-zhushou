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
// checked[id] = true 表示这页已完成
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
    // 默认：已完成保持已完成；未完成默认勾上（= "按计划完成"）
    const init: Record<number, boolean> = {};
    for (const s of items.value) init[s.id] = true;
    checked.value = init;
    if ((logRes as any)?.notes) notes.value = (logRes as any).notes;
  } finally {
    loading.value = false;
  }
}

watch(() => props.modelValue, (v) => {
  if (v) load();
});

function close() {
  emit('update:modelValue', false);
}

/** 都完成啦：保持全勾，所有 schedule is_done=1，不 recompute */
async function submitAllDone() {
  if (!items.value.length) {
    await api.dayLog.report(today, { notes: notes.value || '(今日休息)' });
    close();
    return;
  }
  submitting.value = true;
  try {
    for (const s of items.value) {
      if (!s.is_done) {
        await api.schedules.progress(s.id, {
          is_done: true,
          actual_hours: s.actual_hours ?? s.planned_hours,
        });
      }
    }
    await api.dayLog.report(today, { notes: notes.value || '(按计划完成)' });
    close();
  } finally {
    submitting.value = false;
  }
}

/** 按勾选状态提交：未勾选的 is_done=0，若存在未勾选则 recomputeAll */
async function submitSelective() {
  submitting.value = true;
  try {
    let hasUnchecked = false;
    for (const s of items.value) {
      const done = !!checked.value[s.id];
      if (!done) hasUnchecked = true;
      // 仅在状态变化时调用，减少请求
      const current = !!s.is_done;
      if (done !== current) {
        await api.schedules.progress(s.id, {
          is_done: done,
          actual_hours: done ? s.actual_hours ?? s.planned_hours : s.actual_hours ?? undefined,
        });
      }
    }
    await api.dayLog.report(today, { notes: notes.value });
    if (hasUnchecked) {
      // 有画页没完成 → 把未完工时推到后续
      await api.schedules.recomputeAll();
    }
    close();
  } finally {
    submitting.value = false;
  }
}

/** 纯休息日（没有排期）— 只关闭 + 写一条备注 */
async function closeRest() {
  submitting.value = true;
  try {
    await api.dayLog.report(today, { notes: notes.value || '(今日休息)' });
    close();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 grid place-items-center">
      <div class="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" @click="close" />
      <div class="relative card max-w-md w-full mx-4 animate-pop flex flex-col max-h-[88vh]">
        <h3 class="text-lg font-hand text-brand-700 mb-1 shrink-0">今天画得怎么样？</h3>
        <p class="text-xs text-ink-500 mb-3 font-hand shrink-0">辛苦啦～核对一下今日进度 ({{ today }})</p>

        <!-- 加载中 -->
        <div v-if="loading" class="text-sm text-ink-500 font-hand py-8 text-center">加载中…</div>

        <!-- 今日无安排 -->
        <template v-else-if="!items.length">
          <div class="bg-cream-200/50 rounded-xl2 p-4 text-sm font-hand text-ink-700 mb-3">
            今天没有排期，是休息了吗？☕
          </div>
          <textarea v-model="notes" rows="2" class="input font-hand text-sm shrink-0"
                    placeholder="想记点什么（可选）" />
          <div class="flex justify-end gap-2 mt-4 shrink-0">
            <button class="btn-primary font-hand" :disabled="submitting" @click="closeRest">
              {{ submitting ? '保存中…' : '收到' }}
            </button>
          </div>
        </template>

        <!-- 有排期：checkbox 列表 -->
        <template v-else>
          <div class="text-xs text-ink-500 font-hand mb-1 px-1 shrink-0">
            勾上 = 已完成；取消勾选 = 还没画完（会重排）
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 -mr-1">
            <label v-for="s in items" :key="s.id"
                   class="flex items-start gap-2 p-2 rounded-lg bg-cream-200/40 hover:bg-cream-200/70
                          transition cursor-pointer">
              <input type="checkbox" class="w-4 h-4 mt-0.5 shrink-0"
                     v-model="checked[s.id]" />
              <div class="flex-1 min-w-0">
                <div class="font-hand text-sm text-ink-700 truncate"
                     :class="checked[s.id] ? '' : 'text-ink-500'">
                  <span v-if="s.is_cover">【封】</span>{{ s.book_title }}
                  <span class="text-ink-400"> · </span>{{ s.page_title || '画页' }}
                </div>
                <div class="text-[11px] text-ink-500 font-hand mt-0.5">
                  计划 {{ s.planned_hours }}h
                  <span v-if="s.is_done" class="ml-1 text-[#35704A]">· 已完成</span>
                </div>
              </div>
            </label>
          </div>

          <textarea v-model="notes" rows="2"
                    class="input font-hand text-sm mt-3 shrink-0"
                    placeholder="今天遇到什么问题？明天想怎么安排？（可选）" />

          <div class="flex flex-wrap justify-end gap-2 mt-3 shrink-0">
            <button class="btn-ghost font-hand text-sm" :disabled="submitting" @click="close">
              明天再说
            </button>
            <button class="btn-ghost font-hand text-sm" :disabled="submitting" @click="submitSelective"
                    title="按勾选状态提交，未完成的画页会被重排到后续">
              {{ submitting ? '提交中…' : '按勾选提交' }}
            </button>
            <button class="btn-primary font-hand text-sm" :disabled="submitting" @click="submitAllDone"
                    title="所有画页标为完成，不触发重排">
              {{ submitting ? '提交中…' : '都完成啦 ✓' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
