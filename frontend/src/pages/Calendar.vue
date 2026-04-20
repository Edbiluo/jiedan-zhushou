<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { useScheduleStore } from '@/stores/schedule';
import { useSettingsStore } from '@/stores/settings';
import { usePagesStore } from '@/stores/pages';
import { api } from '@/api';
import type { Page, Schedule } from '@/types';
import PageEditModal from '@/components/PageEditModal.vue';

const schedule = useScheduleStore();
const settings = useSettingsStore();
const pages = usePagesStore();

const cursor = ref(dayjs());
const selectedDate = ref<string | null>(null);

const monthStart = computed(() => cursor.value.startOf('month'));
const gridStart = computed(() => monthStart.value.startOf('week').add(1, 'day')); // 周一开始
const gridEnd = computed(() => cursor.value.endOf('month').endOf('week').add(1, 'day'));

const todayStr = dayjs().format('YYYY-MM-DD');

const days = computed(() => {
  const out: { date: string; inMonth: boolean; leave: boolean; items: Schedule[]; todayTotal: number }[] = [];
  let d = gridStart.value;
  while (d.isBefore(gridEnd.value)) {
    const key = d.format('YYYY-MM-DD');
    const items = schedule.byDate[key] || [];
    out.push({
      date: key,
      inMonth: d.month() === cursor.value.month(),
      leave: schedule.isLeave(key),
      items,
      todayTotal: items.reduce((s, i) => s + (i.planned_hours || 0), 0),
    });
    d = d.add(1, 'day');
  }
  return out;
});

const detailItems = computed<Schedule[]>(() => {
  if (!selectedDate.value) return [];
  return schedule.byDate[selectedDate.value] || [];
});

const detailTotal = computed(() => detailItems.value.reduce((s, i) => s + (i.planned_hours || 0), 0));
const detailIsLeave = computed(() => !!selectedDate.value && schedule.isLeave(selectedDate.value));
const detailIsToday = computed(() => selectedDate.value === todayStr);

async function refresh() {
  const start = gridStart.value.format('YYYY-MM-DD');
  const end = gridEnd.value.subtract(1, 'day').format('YYYY-MM-DD');
  await schedule.loadRange(start, end);
}

function prev() { cursor.value = cursor.value.subtract(1, 'month'); selectedDate.value = null; }
function next() { cursor.value = cursor.value.add(1, 'month'); selectedDate.value = null; }
async function jumpToday() {
  cursor.value = dayjs();
  await nextTick();
  await selectDay(todayStr);
}

watch(cursor, refresh);
onMounted(async () => {
  if (!settings.loaded) await settings.load();
  await refresh();
  // 画页编辑需要 pages.list 里有目标，预加载一次
  if (!pages.list.length) pages.reload().catch(() => {});
});

// ============ 抽屉：选中日期的完整工作流 ============
const dayNote = ref('');
const dayHoursInput = ref<number | null>(null);
const loadingDetail = ref(false);
const dayNoteSaving = ref(false);
const dayHoursSaving = ref(false);

async function selectDay(date: string) {
  selectedDate.value = date;
  loadingDetail.value = true;
  try {
    const [, hoursRes, logRes] = await Promise.all([
      schedule.loadDay(date),
      api.dayLog.getHours(date).catch(() => ({ hours: null })),
      api.dayLog.get(date).catch(() => null),
    ]);
    dayHoursInput.value = hoursRes?.hours ?? null;
    dayNote.value = (logRes as any)?.notes ?? '';
  } finally {
    loadingDetail.value = false;
  }
}

function closeDrawer() {
  selectedDate.value = null;
}

async function toggleLeaveOnDay() {
  if (!selectedDate.value) return;
  const date = selectedDate.value;
  if (schedule.isLeave(date)) await schedule.cancelLeave(date);
  else await schedule.requestLeave(date, '');
  await refresh();
  await schedule.loadDay(date);
}

async function toggleLeaveForCell(day: { date: string; leave: boolean }) {
  if (day.leave) await schedule.cancelLeave(day.date);
  else await schedule.requestLeave(day.date, '');
  await refresh();
  if (selectedDate.value === day.date) await schedule.loadDay(day.date);
}

async function toggleDone(it: Schedule) {
  const wasDone = !!it.is_done;
  const nextDone = !wasDone;
  await api.schedules.progress(it.id, {
    is_done: nextDone,
    actual_hours: it.actual_hours ?? it.planned_hours,
  });
  // 从"已完成"翻悔为"未完成"，且该画页日期已到（今天或过去）→ 需要重排把这部分工时挪走
  const needsRecompute = wasDone && !nextDone && it.date <= todayStr;
  if (needsRecompute) {
    await schedule.recomputeAll();
  }
  await refresh();
  if (selectedDate.value) await schedule.loadDay(selectedDate.value);
}

// 抽屉内『一键标今日完成』
const markingAllDone = ref(false);
const canMarkAllDone = computed(() => {
  if (!selectedDate.value) return false;
  // 只允许今天或过去
  if (selectedDate.value > todayStr) return false;
  // 休息日不显示
  if (detailIsLeave.value) return false;
  // 有未完成 schedule 才显示
  return detailItems.value.some((s) => !s.is_done);
});

async function markAllDoneForSelected() {
  if (!selectedDate.value) return;
  markingAllDone.value = true;
  try {
    await schedule.markAllDoneForDate(selectedDate.value);
    // 顺手写一条当日笔记（若没填就放个默认）
    await api.dayLog.report(selectedDate.value, {
      notes: dayNote.value || '(按计划完成)',
    });
    // 不触发 recompute：已完成的画页不需要重排
    await refresh();
  } finally {
    markingAllDone.value = false;
  }
}

async function saveActualHours(it: Schedule, val: number) {
  if (Number.isNaN(val) || val < 0) return;
  await api.schedules.progress(it.id, { actual_hours: val });
  if (selectedDate.value) await schedule.loadDay(selectedDate.value);
}

async function moveItem(it: Schedule, delta: number) {
  const newDate = dayjs(it.date).add(delta, 'day').format('YYYY-MM-DD');
  await api.schedules.move(it.id, newDate);
  await refresh();
  if (selectedDate.value) await schedule.loadDay(selectedDate.value);
}

async function moveItemTo(it: Schedule, newDate: string) {
  if (!newDate || newDate === it.date) return;
  await api.schedules.move(it.id, newDate);
  await refresh();
  if (selectedDate.value) await schedule.loadDay(selectedDate.value);
}

async function saveDayHours() {
  if (!selectedDate.value) return;
  const v = dayHoursInput.value;
  if (v == null || Number.isNaN(v) || v < 0) return;
  dayHoursSaving.value = true;
  try {
    await api.dayLog.setHours(selectedDate.value, v);
    await refresh();
    if (selectedDate.value) await schedule.loadDay(selectedDate.value);
  } finally { dayHoursSaving.value = false; }
}

async function saveDayNote() {
  if (!selectedDate.value) return;
  dayNoteSaving.value = true;
  try {
    await api.dayLog.report(selectedDate.value, { notes: dayNote.value });
  } finally { dayNoteSaving.value = false; }
}

// ============ 画页编辑弹窗 ============
const pageModalOpen = ref(false);
const pageEditTarget = ref<Page | null>(null);

async function openPageEdit(it: Schedule) {
  // Schedule 只带 page_id，需要从 pages store 拿完整数据
  let target = pages.list.find((p) => p.id === it.page_id) || null;
  if (!target) {
    try {
      target = await api.pages.get(it.page_id);
    } catch {
      target = null;
    }
  }
  if (!target) return;
  pageEditTarget.value = target;
  pageModalOpen.value = true;
}

async function onPageSaved() {
  // 画页信息变了（比如 estimated_hours / 款式），刷新当前日排期展示
  if (selectedDate.value) await schedule.loadDay(selectedDate.value);
  await refresh();
}

// ============ 色块：按 book_status 着色 ============
function chipClass(it: Schedule) {
  if (it.is_done) return 'bg-[#D9ECDE] text-[#35704A] line-through';
  switch (it.book_status) {
    case 'overdue': return 'bg-[#F5CED1] text-[#8A3640]';
    case 'near_deadline': return 'bg-[#FAE6C7] text-[#8A5E26]';
    case 'completed': return 'bg-[#D9ECDE] text-[#35704A]';
    default: return 'bg-brand-100 text-brand-700';
  }
}

function statusLabel(st?: string) {
  switch (st) {
    case 'overdue': return '延期';
    case 'near_deadline': return '快到交付';
    case 'completed': return '已完成';
    default: return '进行中';
  }
}

// 每格子最多展示几条（多余折叠为 "+N 项"）
const MAX_CELL_ITEMS = 2;
</script>

<template>
  <div class="h-full flex flex-col gap-3 min-h-0">
    <!-- 顶部工具条 -->
    <div class="flex items-center gap-3 flex-wrap shrink-0">
      <button class="btn-ghost font-hand" @click="prev">‹ 上月</button>
      <div class="text-xl font-hand text-brand-700">{{ cursor.format('YYYY 年 M 月') }}</div>
      <button class="btn-ghost font-hand" @click="next">下月 ›</button>
      <button class="btn-ghost font-hand" @click="jumpToday">今天</button>
      <div class="ml-auto text-xs text-ink-500 font-hand">默认每日 {{ settings.defaultDailyHours }}h · 点日期打开详情</div>
    </div>

    <!-- 图例 -->
    <div class="flex items-center gap-2 text-[11px] font-hand text-ink-500 flex-wrap shrink-0">
      <span class="chip-brand">进行中</span>
      <span class="chip-warn">快到交付</span>
      <span class="chip-danger">延期</span>
      <span class="chip-done">已完成</span>
      <span class="ml-2 text-ink-300">·</span>
      <span class="text-ink-500">奶油色格=请假日</span>
    </div>

    <!-- 星期表头 -->
    <div class="grid grid-cols-7 gap-2 text-center text-xs text-ink-500 font-hand shrink-0">
      <div v-for="w in ['一','二','三','四','五','六','日']" :key="w">周{{ w }}</div>
    </div>

    <!-- 日历主体：flex-1 撑满，格子 min-h-0 保证不把父容器撑高 -->
    <div class="grid grid-cols-7 grid-rows-6 gap-2 flex-1 min-h-0">
      <div
        v-for="d in days" :key="d.date"
        class="relative rounded-xl2 p-1.5 bg-white shadow-soft cursor-pointer transition hover:-translate-y-0.5 hover:shadow-pop flex flex-col min-h-0 overflow-hidden"
        :class="[
          !d.inMonth ? 'opacity-40' : '',
          d.leave ? 'bg-cream-200' : '',
          d.date === todayStr ? 'ring-2 ring-brand-400' : '',
          selectedDate === d.date ? 'ring-2 ring-brand-600 shadow-pop bg-brand-50 -translate-y-0.5' : '',
        ]"
        @click="selectDay(d.date)"
      >
        <!-- 选中格子右侧的小箭头，暗示抽屉出现 -->
        <span v-if="selectedDate === d.date"
              class="absolute right-1 top-1 text-brand-600 text-xs font-hand leading-none pointer-events-none select-none"
              title="详情在右侧抽屉">→</span>

        <div class="flex items-center justify-between mb-0.5 shrink-0">
          <span class="text-sm font-hand leading-none" :class="[
            d.date === todayStr ? 'text-brand-700 font-bold' : '',
            selectedDate === d.date ? 'text-brand-700 font-bold' : '',
          ]">{{ dayjs(d.date).date() }}</span>
          <button v-if="d.inMonth"
                  class="text-[10px] font-hand leading-none px-1.5 py-0.5 rounded-full transition"
                  :class="d.leave
                    ? 'bg-[#FAE6C7] text-[#8A5E26] hover:bg-[#F5D8A8]'
                    : 'bg-white/60 text-ink-500 hover:bg-brand-100 hover:text-brand-700'"
                  :title="d.leave ? '取消请假' : '标记这天请假'"
                  @click.stop="toggleLeaveForCell(d)">
            {{ d.leave ? '✓休' : '🌙休' }}
          </button>
        </div>

        <div v-if="d.leave" class="text-xs text-ink-500 font-hand">休息日 ☕</div>
        <template v-else>
          <div class="space-y-0.5 flex-1 min-h-0 overflow-hidden">
            <div v-for="it in d.items.slice(0, MAX_CELL_ITEMS)" :key="it.id"
                 class="text-[10px] rounded-md px-1.5 py-0.5 truncate font-hand leading-snug"
                 :class="chipClass(it)"
                 :title="`${it.book_title}${it.is_cover ? ' · 【封】' : ''} · ${it.page_title || '画页'} · ${it.planned_hours}h`">
              <span v-if="it.is_cover">【封】</span>{{ it.book_title }}
              <span v-if="it.page_title" class="opacity-80">· {{ it.page_title }}</span>
              <span class="opacity-70">· {{ it.planned_hours }}h</span>
            </div>
            <div v-if="d.items.length > MAX_CELL_ITEMS"
                 class="text-[10px] font-hand text-ink-500 px-1.5 leading-snug">
              +{{ d.items.length - MAX_CELL_ITEMS }} 项
            </div>
          </div>
          <div v-if="d.items.length && d.todayTotal" class="text-[10px] text-ink-500 shrink-0 font-hand leading-none mt-0.5">
            共 {{ d.todayTotal }}h · {{ d.items.length }} 页
          </div>
        </template>
      </div>
    </div>

    <!-- 右侧抽屉 -->
    <Teleport to="body">
      <!-- 半透明蒙层（点击关闭）-->
      <Transition name="drawer-backdrop">
        <div v-if="selectedDate"
             class="fixed inset-0 bg-ink-900/20 z-30"
             @click="closeDrawer" />
      </Transition>

      <Transition name="drawer-panel">
      <aside v-if="selectedDate"
             class="fixed top-0 right-0 h-full w-[420px] max-w-[92vw] bg-cream-100 shadow-pop z-40 flex flex-col border-l border-cream-300/60 will-change-transform">
        <!-- 抽屉顶栏 -->
        <div class="px-5 py-4 border-b border-cream-300/60 flex items-start gap-3 shrink-0">
          <div class="flex-1 min-w-0">
            <h3 class="font-hand text-xl text-brand-700 truncate">
              {{ dayjs(selectedDate).format('M 月 D 日') }}
              <span class="text-sm text-ink-500 ml-1">{{ dayjs(selectedDate).format('ddd') }}</span>
            </h3>
            <div class="mt-1 flex items-center gap-1.5 flex-wrap">
              <span v-if="detailIsToday" class="chip-brand text-[10px]">今天</span>
              <span v-if="detailIsLeave" class="chip-warn text-[10px]">休息日</span>
              <span class="text-xs text-ink-500 font-hand">已排 {{ detailTotal }}h · {{ detailItems.length }} 页</span>
            </div>
          </div>
          <button class="btn-ghost font-hand !px-2 !py-1 text-lg leading-none shrink-0" title="关闭" @click="closeDrawer">×</button>
        </div>

        <!-- 抽屉主体：可滚 -->
        <div class="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          <!-- 当日工时 -->
          <section class="bg-white rounded-xl2 shadow-soft p-3">
            <div class="text-xs text-ink-500 font-hand mb-2">当日可用工时</div>
            <div class="flex items-center gap-2 flex-wrap">
              <input type="number" min="0" step="0.5" class="input !w-24 !py-1" v-model.number="dayHoursInput"
                     :placeholder="String(settings.defaultDailyHours)" />
              <span class="text-xs text-ink-500 font-hand">h</span>
              <button class="btn-ghost text-xs ml-auto" :disabled="dayHoursSaving" @click="saveDayHours">
                {{ dayHoursSaving ? '保存中…' : '保存' }}
              </button>
            </div>
          </section>

          <!-- 请假 -->
          <section class="bg-white rounded-xl2 shadow-soft p-3 flex items-center gap-2">
            <div class="flex-1">
              <div class="text-xs text-ink-500 font-hand">休息日</div>
              <div class="text-sm font-hand" :class="detailIsLeave ? 'text-brand-700' : 'text-ink-700'">
                {{ detailIsLeave ? '今日已标记为休息' : '今日正常工作' }}
              </div>
            </div>
            <button class="btn-ghost font-hand text-sm" @click="toggleLeaveOnDay">
              {{ detailIsLeave ? '取消请假' : '请假' }}
            </button>
          </section>

          <!-- 排期列表 -->
          <section>
            <div class="flex items-center justify-between mb-2 px-1">
              <div class="text-xs text-ink-500 font-hand">今日排期</div>
              <button v-if="canMarkAllDone"
                      class="chip-done text-[11px] font-hand px-2 py-1 rounded-full flex items-center gap-1
                             hover:brightness-95 active:brightness-90 transition shrink-0
                             disabled:opacity-60 disabled:cursor-not-allowed"
                      :disabled="markingAllDone"
                      :title="'把未完成的画页全部标为已完成，不触发重排'"
                      @click="markAllDoneForSelected">
                <span class="leading-none">✓</span>
                <span class="leading-none">{{ markingAllDone ? '处理中…' : '一键标完成' }}</span>
              </button>
            </div>
            <div v-if="loadingDetail" class="text-sm text-ink-500 font-hand py-6 text-center">加载中…</div>
            <template v-else>
              <div v-if="!detailItems.length"
                   class="bg-white rounded-xl2 shadow-soft p-5 text-center text-sm text-ink-500 font-hand">
                今天没有排期，可以喘口气 ☕
              </div>
              <div v-else class="space-y-2">
                <div v-for="it in detailItems" :key="it.id"
                     class="bg-white rounded-xl2 shadow-soft p-3">
                  <div class="flex items-start gap-2">
                    <input type="checkbox" :checked="!!it.is_done" class="w-4 h-4 mt-1 shrink-0"
                           @change="toggleDone(it)" />
                    <div class="flex-1 min-w-0">
                      <div class="font-hand text-sm" :class="it.is_done ? 'line-through text-ink-500' : ''">
                        <span v-if="it.is_cover">【封】</span>{{ it.book_title }}
                        <span class="text-ink-500"> · </span>{{ it.page_title || '画页' }}
                      </div>
                      <div class="mt-1 flex items-center gap-1 flex-wrap">
                        <span class="chip text-[10px]" :class="chipClass(it)">{{ statusLabel(it.book_status) }}</span>
                        <span v-if="it.is_user_override" class="chip text-[10px]">已调整</span>
                        <span v-if="it.style_name" class="chip text-[10px]">{{ it.style_name }}</span>
                        <span v-if="it.size_name" class="chip text-[10px]">{{ it.size_name }}</span>
                      </div>
                      <div class="text-xs text-ink-500 font-hand mt-1">
                        计划 {{ it.planned_hours }}h
                        <span v-if="it.book_deadline">· 交付 {{ it.book_deadline }}</span>
                      </div>
                    </div>
                    <button class="btn-ghost !px-2 !py-1 text-xs font-hand shrink-0" title="编辑画页"
                            @click="openPageEdit(it)">✎ 画页</button>
                  </div>
                  <div class="flex items-center gap-2 mt-2 text-xs text-ink-500 font-hand flex-wrap">
                    <label class="flex items-center gap-1">
                      实际
                      <input type="number" min="0" step="0.5"
                             class="input !w-20 !py-0.5 !px-2 !text-xs"
                             :value="it.actual_hours ?? ''"
                             :placeholder="String(it.planned_hours)"
                             @change="saveActualHours(it, Number(($event.target as HTMLInputElement).value))" />
                      h
                    </label>
                    <span class="text-ink-300">·</span>
                    <button class="btn-ghost !p-1 text-xs" title="提前一天" @click="moveItem(it, -1)">← 前</button>
                    <button class="btn-ghost !p-1 text-xs" title="推后一天" @click="moveItem(it, 1)">后 →</button>
                    <input type="date" class="input !w-32 !py-0.5 !px-2 !text-xs"
                           :value="it.date"
                           @change="moveItemTo(it, ($event.target as HTMLInputElement).value)" />
                  </div>
                </div>
              </div>
            </template>
          </section>

          <!-- 笔记 -->
          <section class="bg-white rounded-xl2 shadow-soft p-3">
            <div class="text-xs text-ink-500 font-hand mb-1">今天打算做什么 / 笔记</div>
            <textarea v-model="dayNote" rows="3"
                      class="input text-sm font-hand"
                      placeholder="记一句，比如『先把小鹿的封面搞完』" />
            <div class="flex justify-end mt-2">
              <button class="btn-ghost text-xs font-hand" :disabled="dayNoteSaving" @click="saveDayNote">
                {{ dayNoteSaving ? '保存中…' : '保存笔记' }}
              </button>
            </div>
          </section>
        </div>
      </aside>
      </Transition>
    </Teleport>

    <!-- 画页编辑弹窗（复用）-->
    <PageEditModal v-model:open="pageModalOpen" :target="pageEditTarget" @saved="onPageSaved" />
  </div>
</template>
