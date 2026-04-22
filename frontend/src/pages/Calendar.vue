<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import dayjs, { Dayjs } from 'dayjs';
import { useRouter } from 'vue-router';
import { api } from '@/api';
import { useScheduleStore } from '@/stores/schedule';
import { useSettingsStore } from '@/stores/settings';
import { useDayTasksStore } from '@/stores/dayTasks';
import { useInspirationsStore } from '@/stores/inspirations';
import type { Book, DayTask, DayTaskKind, Inspiration, Schedule } from '@/types';
import { bookGradient, bookSolid, bookInk, TASK_PALETTE } from '@/utils/palette';

const schedule = useScheduleStore();
const settings = useSettingsStore();
const dayTasks = useDayTasksStore();
const inspirations = useInspirationsStore();
const router = useRouter();

const cursor = ref(dayjs());
const books = ref<Book[]>([]);
const schedulesByBookDate = ref<Map<string, Schedule>>(new Map());

const monthStart = computed(() => cursor.value.startOf('month'));
const gridStart = computed(() => monthStart.value.startOf('week').add(1, 'day'));
const gridEnd = computed(() => cursor.value.endOf('month').endOf('week').add(1, 'day'));

const todayStr = dayjs().format('YYYY-MM-DD');

const weeks = computed(() => {
  const out: { start: Dayjs; days: { date: string; inMonth: boolean; dayNum: number; weekday: number }[] }[] = [];
  let d = gridStart.value;
  while (d.isBefore(gridEnd.value)) {
    const row = { start: d, days: [] as any[] };
    for (let i = 0; i < 7; i++) {
      const cur = d.add(i, 'day');
      row.days.push({
        date: cur.format('YYYY-MM-DD'),
        inMonth: cur.month() === cursor.value.month(),
        dayNum: cur.date(),
        weekday: i,
      });
    }
    out.push(row);
    d = d.add(7, 'day');
  }
  return out;
});

async function refresh() {
  const start = gridStart.value.format('YYYY-MM-DD');
  const end = gridEnd.value.subtract(1, 'day').format('YYYY-MM-DD');
  const [bookList, schedList] = await Promise.all([
    api.books.list(),
    api.schedules.range(start, end),
  ]);
  books.value = bookList;
  const m = new Map<string, Schedule>();
  for (const s of schedList) m.set(`${s.book_id}:${s.date}:${s.segment_kind}`, s);
  schedulesByBookDate.value = m;
  await Promise.all([
    schedule.loadRange(start, end),
    dayTasks.loadRange(start, end),
  ]);
}

onMounted(async () => {
  if (!settings.loaded) await settings.load();
  await refresh();
});
watch(cursor, refresh);

function prev() { cursor.value = cursor.value.subtract(1, 'month'); }
function next() { cursor.value = cursor.value.add(1, 'month'); }
function jumpToday() { cursor.value = dayjs(); selectDay(todayStr); }

// ============ 条带布局 ============
interface Bar { book: Book; weekIdx: number; colStart: number; colEnd: number; lane: number; isStart: boolean; isEnd: boolean; completed: boolean; }
interface VideoBlock { book: Book; weekIdx: number; col: number; is_done: boolean; }

function computeBars() {
  const bars: Bar[][] = weeks.value.map(() => []);
  const videos: VideoBlock[][] = weeks.value.map(() => []);
  const laneCount: number[] = weeks.value.map(() => 0);
  const sortedBooks = [...books.value]
    .filter((b) => b.start_date && b.deadline)
    .sort((a, b) => {
      const sa = a.start_date || '';
      const sb = b.start_date || '';
      if (sa !== sb) return sa < sb ? -1 : 1;
      return a.id - b.id;
    });

  weeks.value.forEach((w, wi) => {
    const weekStart = w.start;
    const weekEnd = w.start.add(6, 'day');
    const lanes: string[] = [];
    const weekBars: Bar[] = [];
    for (const b of sortedBooks) {
      const bs = dayjs(b.start_date!);
      const be = dayjs(b.deadline);
      if (be.isBefore(weekStart) || bs.isAfter(weekEnd)) continue;
      const segStart = bs.isBefore(weekStart) ? weekStart : bs;
      const segEnd = be.isAfter(weekEnd) ? weekEnd : be;
      const col0 = segStart.diff(weekStart, 'day');
      const col1 = segEnd.diff(weekStart, 'day');
      let lane = -1;
      for (let i = 0; i < lanes.length; i++) {
        if (!lanes[i] || lanes[i] < segStart.format('YYYY-MM-DD')) { lane = i; break; }
      }
      if (lane < 0) { lane = lanes.length; lanes.push(''); }
      lanes[lane] = segEnd.format('YYYY-MM-DD');
      const doneOn = (d: string) => !!schedulesByBookDate.value.get(`${b.id}:${d}:book`)?.is_done;
      let allDone = true;
      let cur = segStart;
      while (cur.isBefore(segEnd) || cur.isSame(segEnd, 'day')) {
        if (!doneOn(cur.format('YYYY-MM-DD'))) { allDone = false; break; }
        cur = cur.add(1, 'day');
      }
      weekBars.push({
        book: b, weekIdx: wi,
        colStart: col0, colEnd: col1, lane,
        isStart: !bs.isBefore(weekStart),
        isEnd: !be.isAfter(weekEnd),
        completed: allDone || b.status === 'completed',
      });
    }
    laneCount[wi] = lanes.length;
    bars[wi] = weekBars;

    for (const b of sortedBooks) {
      if (!b.has_video) continue;
      const vDate = dayjs(b.deadline).add(1, 'day');
      if (vDate.isBefore(weekStart) || vDate.isAfter(weekEnd)) continue;
      const col = vDate.diff(weekStart, 'day');
      const s = schedulesByBookDate.value.get(`${b.id}:${vDate.format('YYYY-MM-DD')}:video`);
      videos[wi].push({ book: b, weekIdx: wi, col, is_done: !!s?.is_done });
    }
  });

  return { bars, videos, laneCount };
}

const layout = computed(() => computeBars());

function bookDoneOnDate(bookId: number, date: string) {
  return !!schedulesByBookDate.value.get(`${bookId}:${date}:book`)?.is_done;
}

function booksOnDate(date: string): { book: Book; kind: 'book' | 'video'; is_done: boolean }[] {
  const out: { book: Book; kind: 'book' | 'video'; is_done: boolean }[] = [];
  for (const b of books.value) {
    if (!b.start_date) continue;
    if (date >= b.start_date && date <= b.deadline) {
      out.push({ book: b, kind: 'book', is_done: bookDoneOnDate(b.id, date) });
    }
    if (b.has_video && dayjs(b.deadline).add(1, 'day').format('YYYY-MM-DD') === date) {
      const s = schedulesByBookDate.value.get(`${b.id}:${date}:video`);
      out.push({ book: b, kind: 'video', is_done: !!s?.is_done });
    }
  }
  return out;
}

async function toggleBookDoneOnDate(bookId: number, date: string) {
  if (date > todayStr) return;
  const current = bookDoneOnDate(bookId, date);
  await api.schedules.markBookDoneOnDate(bookId, date, !current);
  await refresh();
}

async function toggleVideoDone(bookId: number, date: string) {
  if (date > todayStr) return;
  const s = schedulesByBookDate.value.get(`${bookId}:${date}:video`);
  if (!s) return;
  await api.schedules.progress(s.id, { is_done: !s.is_done });
  await refresh();
}

async function toggleLeaveForCell(date: string) {
  if (schedule.isLeave(date)) await schedule.cancelLeave(date);
  else await schedule.requestLeave(date, '');
  await refresh();
}

function openBook(book: Book) { router.push(`/books/${book.id}`); }

function barStyle(bar: Bar) {
  return {
    background: bookGradient(bar.book.id),
    color: bookInk(bar.book.id),
    opacity: bar.completed ? 0.5 : 1,
    borderTopLeftRadius: bar.isStart ? '9999px' : '3px',
    borderBottomLeftRadius: bar.isStart ? '9999px' : '3px',
    borderTopRightRadius: bar.isEnd ? '9999px' : '3px',
    borderBottomRightRadius: bar.isEnd ? '9999px' : '3px',
  };
}
function videoStyle(v: VideoBlock) {
  return { background: bookSolid(v.book.id), color: bookInk(v.book.id), opacity: v.is_done ? 0.5 : 1 };
}

// 间隙常量（日与日之间）
const CELL_GAP = 8;   // px
const DAY_HEADER_H = 30;
const LANE_H = 22;
const LANE_GAP = 4;
const TASK_ROW_H = 20; // 每条任务徽章占高（含行间距）
const MAX_TASK_ROWS = 3;

// 某周"本条带 + 视频块"总高度
function barsZoneHeight(wi: number) {
  const lanes = layout.value.laneCount[wi] || 0;
  const videoRow = layout.value.videos[wi].length > 0 ? 1 : 0;
  return (lanes + videoRow) * (LANE_H + LANE_GAP);
}

// 任务徽章起始 top（紧跟 bar 区下方）
function tasksTop(wi: number) {
  return DAY_HEADER_H + barsZoneHeight(wi) + 6;
}

// 按内容算每周总高度（自适应）
function weekHeight(wi: number) {
  const tasksMax = weeks.value[wi].days
    .map((d) => Math.min(MAX_TASK_ROWS, dayTasks.byDate[d.date]?.length || 0))
    .reduce((a, b) => Math.max(a, b), 0);
  const hasOverflow = weeks.value[wi].days.some((d) => (dayTasks.byDate[d.date]?.length || 0) > MAX_TASK_ROWS);
  return DAY_HEADER_H + barsZoneHeight(wi) + 6
       + tasksMax * TASK_ROW_H
       + (hasOverflow ? 16 : 0)
       + 10; // 底部留白
}

// 条带位置计算：容器宽度按"7列等宽 + 6 个 gap"切分
// left = colStart * (cellW + gap)，width = (colEnd-colStart+1) * cellW + (colEnd-colStart) * gap
// 用 calc 把百分比 cellW 与 px gap 混合
function colLeft(colStart: number) {
  // colStart * (cellW + gap) = colStart * cellW + colStart * gap
  // cellW = (100% - 6*gap) / 7
  return `calc(${colStart} * ((100% - ${6 * CELL_GAP}px) / 7) + ${colStart * CELL_GAP}px)`;
}
function colWidth(span: number) {
  // span * cellW + (span-1) * gap
  return `calc(${span} * ((100% - ${6 * CELL_GAP}px) / 7) + ${(span - 1) * CELL_GAP}px)`;
}


// ============ 日抽屉 ============
const selectedDate = ref<string | null>(null);
const dayNote = ref('');
const dayNoteSaving = ref(false);

async function selectDay(date: string) {
  selectedDate.value = date;
  await Promise.all([
    dayTasks.loadDay(date),
    loadDayNote(date),
  ]);
}
function closeDrawer() { selectedDate.value = null; }

async function loadDayNote(date: string) {
  try {
    const log: any = await api.dayLog.get(date);
    dayNote.value = log?.notes || '';
  } catch { dayNote.value = ''; }
}

async function saveDayNote() {
  if (!selectedDate.value) return;
  dayNoteSaving.value = true;
  try {
    await api.dayLog.report(selectedDate.value, { notes: dayNote.value });
  } finally { dayNoteSaving.value = false; }
}

const dayBooks = computed(() => selectedDate.value ? booksOnDate(selectedDate.value) : []);
const dayCreations = computed(() =>
  selectedDate.value ? (dayTasks.byDate[selectedDate.value] || []).filter((t) => t.kind === 'creation') : []
);
const dayEditings = computed(() =>
  selectedDate.value ? (dayTasks.byDate[selectedDate.value] || []).filter((t) => t.kind === 'editing') : []
);
const selectedIsLeave = computed(() => !!selectedDate.value && schedule.isLeave(selectedDate.value));
const selectedIsPastOrToday = computed(() => !!selectedDate.value && selectedDate.value <= todayStr);

async function addTask(kind: DayTaskKind) {
  if (!selectedDate.value) return;
  await dayTasks.create({ date: selectedDate.value, kind, title: kind === 'creation' ? '新创作' : '新剪辑' });
  await dayTasks.loadDay(selectedDate.value);
}

async function updateTaskField(t: DayTask, patch: Partial<DayTask>) {
  await dayTasks.update(t.id, { ...patch });
  if (selectedDate.value) await dayTasks.loadDay(selectedDate.value);
}

async function toggleTaskDone(t: DayTask) {
  await updateTaskField(t, { is_done: t.is_done ? 0 : 1 });
}

async function removeTask(t: DayTask) {
  if (!confirm('删除这条？')) return;
  await dayTasks.remove(t.id, t.date);
}

// 从灵感库挑图
const inspirationPickerFor = ref<DayTask | null>(null);
async function openInspirationPicker(t: DayTask) {
  if (!inspirations.list.length) await inspirations.reload();
  inspirationPickerFor.value = t;
}
async function pickInspiration(ins: Inspiration | null) {
  if (!inspirationPickerFor.value) return;
  await updateTaskField(inspirationPickerFor.value, { inspiration_id: ins?.id ?? null });
  inspirationPickerFor.value = null;
}

function taskChipStyle(kind: DayTaskKind, is_done: boolean, date?: string) {
  const p = TASK_PALETTE[kind];
  const isPast = date && date < todayStr;
  return {
    background: p.light,
    color: isPast ? '#999' : p.ink,
    opacity: is_done ? 0.55 : isPast ? 0.6 : 1,
    textDecoration: is_done ? 'line-through' : 'none',
  };
}

function taskCellStyle(kind: DayTaskKind) {
  const p = TASK_PALETTE[kind];
  return { background: `linear-gradient(90deg, ${p.light} 0%, ${p.dark} 100%)`, color: p.ink };
}

async function markAllBooksDoneToday() {
  if (!selectedDate.value) return;
  for (const it of dayBooks.value) {
    if (it.kind === 'book' && !it.is_done) {
      await api.schedules.markBookDoneOnDate(it.book.id, selectedDate.value);
    } else if (it.kind === 'video' && !it.is_done) {
      const s = schedulesByBookDate.value.get(`${it.book.id}:${selectedDate.value}:video`);
      if (s) await api.schedules.progress(s.id, { is_done: true });
    }
  }
  await refresh();
}
</script>

<template>
  <div class="h-full flex flex-col gap-3 min-h-0 pb-8 pr-8">
    <!-- 顶部工具条 -->
    <div class="flex items-center gap-3 flex-wrap shrink-0">
      <button class="btn-ghost" @click="prev">‹ 上月</button>
      <div class="text-xl text-brand-700">{{ cursor.format('YYYY 年 M 月') }}</div>
      <button class="btn-ghost" @click="next">下月 ›</button>
      <button class="btn-ghost" @click="jumpToday">今天</button>
      <div class="ml-auto text-xs text-ink-500 flex items-center gap-2 flex-wrap">
        <span class="inline-block w-3 h-3 rounded-full align-middle" style="background:linear-gradient(90deg,#D7ECEE,#4C9BA4);"></span>画本
        <span class="inline-block w-3 h-3 rounded-full align-middle" style="background:#F4B9CC;"></span>创作
        <span class="inline-block w-3 h-3 rounded-full align-middle" style="background:#BFA8E8;"></span>剪辑
        <span class="text-ink-400">·</span> 点日期开抽屉
      </div>
    </div>

    <!-- 星期表头 -->
    <div class="grid grid-cols-7 text-center text-sm text-ink-500 shrink-0"
         :style="{ gap: CELL_GAP + 'px' }">
      <div v-for="w in ['一','二','三','四','五','六','日']" :key="w">周{{ w }}</div>
    </div>

    <!-- 月份主体（每周高度随内容自适应；不够一屏再滚）-->
    <div class="flex-1 min-h-0 overflow-auto pr-1 flex flex-col">
      <div class="flex flex-col gap-2 flex-1">
        <div v-for="(w, wi) in weeks" :key="wi"
             class="relative flex-1 overflow-hidden"
             :style="{ minHeight: weekHeight(wi) + 'px' }">
          <!-- 背景日格子（带间隙）-->
          <div class="absolute inset-0 grid grid-cols-7" :style="{ gap: CELL_GAP + 'px' }">
            <div v-for="d in w.days" :key="d.date"
                 class="relative rounded-xl2 shadow-soft cursor-pointer transition overflow-hidden flex flex-col"
                 :class="[
                   !d.inMonth ? 'bg-cream-100/50' : d.date < todayStr ? 'bg-gray-100' : 'bg-white',
                   schedule.isLeave(d.date) ? '!bg-[#FFF0D6]' : '',
                   d.date === todayStr ? 'ring-2 ring-[#A7CEE5]' : '',
                   selectedDate === d.date ? 'ring-2 ring-[#F2ABB6] shadow-pop' : '',
                 ]"
                 @click="selectDay(d.date)">
              <div class="flex items-center justify-between px-2.5 pt-2 shrink-0">
                <span class="text-base leading-none font-medium"
                      :class="[
                        !d.inMonth ? 'text-ink-300' : d.date < todayStr ? 'text-gray-500' : 'text-ink-700',
                        d.date === todayStr ? '!text-[#355F7D]' : '',
                      ]">{{ d.dayNum }}</span>
                <button v-if="d.inMonth"
                        class="text-xs leading-none px-2 py-1 rounded-full transition font-medium"
                        :class="schedule.isLeave(d.date)
                          ? 'bg-[#FFE4B5] text-[#8A5E26] hover:bg-[#F6D79F]'
                          : 'bg-cream-200/70 text-ink-500 hover:bg-[#DCF1E3] hover:text-[#316B4C]'"
                        :title="schedule.isLeave(d.date) ? '取消休息' : '标为休息'"
                        @click.stop="toggleLeaveForCell(d.date)">
                  {{ schedule.isLeave(d.date) ? '✓ 休' : '休' }}
                </button>
              </div>
            </div>
          </div>

          <!-- 本的条带（absolute 定位，用 calc 跨越 gap）-->
          <div class="absolute left-0 right-0 pointer-events-none" :style="{ top: DAY_HEADER_H + 'px' }">
            <div v-for="bar in layout.bars[wi]" :key="`b${bar.book.id}_${wi}`"
                 class="absolute pointer-events-auto cursor-pointer group"
                 :style="{
                   left: colLeft(bar.colStart),
                   width: colWidth(bar.colEnd - bar.colStart + 1),
                   top: (bar.lane * (LANE_H + LANE_GAP)) + 'px',
                   height: LANE_H + 'px',
                 }"
                 :title="`${bar.book.title} · ${bar.book.start_date} → ${bar.book.deadline}`"
                 @click.stop="openBook(bar.book)">
              <div class="h-full px-3 flex items-center gap-1.5 shadow-soft transition hover:brightness-105 hover:-translate-y-px"
                   :style="barStyle(bar)">
                <span v-if="bar.isStart" class="text-xs leading-none truncate font-medium">{{ bar.book.title }}</span>
                <span v-if="bar.completed" class="text-xs leading-none ml-auto">✓</span>
              </div>
            </div>

            <!-- 视频块 -->
            <div v-for="(v, vi) in layout.videos[wi]" :key="`v${wi}_${vi}`"
                 class="absolute pointer-events-auto cursor-pointer"
                 :style="{
                   left: colLeft(v.col),
                   width: colWidth(1),
                   top: (layout.laneCount[wi] * (LANE_H + LANE_GAP)) + 'px',
                   height: LANE_H + 'px',
                 }"
                 :title="`${v.book.title} · 录视频`"
                 @click.stop="toggleVideoDone(v.book.id, dayjs(v.book.deadline).add(1,'day').format('YYYY-MM-DD'))">
              <div class="h-full px-2 rounded-full flex items-center justify-center gap-1 shadow-soft"
                   :style="videoStyle(v)">
                <span class="text-xs">🎬</span>
                <span class="text-xs truncate font-medium">视频</span>
                <span v-if="v.is_done" class="text-xs">✓</span>
              </div>
            </div>
          </div>

          <!-- 每日创作/剪辑小徽章（紧跟 bar 区下方，避免与 bar 撞） -->
          <template v-for="d in w.days" :key="`t${d.date}`">
            <div v-if="dayTasks.byDate[d.date]?.length"
                 class="absolute pointer-events-none"
                 :style="{
                   left: colLeft(d.weekday),
                   width: colWidth(1),
                   top: tasksTop(wi) + 'px',
                   paddingLeft: '6px',
                   paddingRight: '6px',
                 }">
              <div class="space-y-0.5">
                <div v-for="t in dayTasks.byDate[d.date]?.slice(0, MAX_TASK_ROWS)" :key="t.id"
                     class="text-xs leading-[16px] px-2 py-0.5 rounded-full truncate font-medium"
                     :style="taskChipStyle(t.kind, !!t.is_done, d.date)">
                  <span v-if="t.kind === 'creation'">✨</span><span v-else>🎬</span>
                  {{ t.title || (t.kind === 'creation' ? '创作' : '剪辑') }}
                </div>
                <div v-if="(dayTasks.byDate[d.date]?.length || 0) > MAX_TASK_ROWS"
                     class="text-xs text-ink-500 px-2">+{{ (dayTasks.byDate[d.date]?.length || 0) - MAX_TASK_ROWS }}</div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 右侧抽屉 -->
    <Teleport to="body">
      <Transition name="drawer-backdrop">
        <div v-if="selectedDate" class="fixed inset-0 bg-ink-900/20 z-30" @click="closeDrawer" />
      </Transition>
      <Transition name="drawer-panel">
        <aside v-if="selectedDate"
               class="fixed top-0 right-0 h-full w-[440px] max-w-[92vw] bg-cream-100 shadow-pop z-40 flex flex-col border-l border-cream-300/60">
          <!-- 抽屉头 -->
          <div class="px-5 py-4 border-b border-cream-300/60 flex items-start gap-3 shrink-0">
            <div class="flex-1 min-w-0">
              <h3 class="text-xl text-brand-700 truncate">
                {{ dayjs(selectedDate).format('M 月 D 日') }}
                <span class="text-sm text-ink-500 ml-1">周{{ ['日','一','二','三','四','五','六'][dayjs(selectedDate).day()] }}</span>
              </h3>
              <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                <span v-if="selectedDate === todayStr" class="chip-brand text-[10px]">今天</span>
                <span v-if="selectedIsLeave" class="chip-warn text-[10px]">休息日</span>
                <span class="text-xs text-ink-500">画本 {{ dayBooks.length }} · 创作 {{ dayCreations.length }} · 剪辑 {{ dayEditings.length }}</span>
              </div>
            </div>
            <button class="btn-ghost !px-2 !py-1 text-lg leading-none shrink-0" title="关闭" @click="closeDrawer">×</button>
          </div>

          <!-- 主体滚动 -->
          <div class="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            <!-- 休息切换 -->
            <section class="bg-white rounded-xl2 shadow-soft p-3 flex items-center gap-2">
              <div class="flex-1">
                <div class="text-xs text-ink-500">休息状态</div>
                <div class="text-sm" :class="selectedIsLeave ? 'text-brand-700' : 'text-ink-700'">
                  {{ selectedIsLeave ? '已标为休息日' : '正常工作' }}
                </div>
              </div>
              <button class="btn-ghost text-sm" @click="toggleLeaveForCell(selectedDate!)">
                {{ selectedIsLeave ? '取消' : '标休' }}
              </button>
            </section>

            <!-- 画本 -->
            <section>
              <div class="flex items-center justify-between mb-2 px-1">
                <div class="text-xs text-ink-500">画本（{{ dayBooks.length }}）</div>
                <button v-if="selectedIsPastOrToday && dayBooks.some(it => !it.is_done)"
                        class="chip-done text-[11px] px-2 py-0.5 hover:brightness-95 transition"
                        @click="markAllBooksDoneToday">✓ 全标完成</button>
              </div>
              <div v-if="!dayBooks.length" class="text-sm text-ink-400 text-center py-3">今天没有本排到</div>
              <div v-else class="space-y-2">
                <div v-for="(it, i) in dayBooks" :key="`bd${i}`"
                     class="bg-white rounded-xl2 shadow-soft p-3">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" :checked="it.is_done"
                           :disabled="selectedDate! > todayStr"
                           class="w-4 h-4 shrink-0"
                           @change="it.kind === 'book' ? toggleBookDoneOnDate(it.book.id, selectedDate!) : toggleVideoDone(it.book.id, selectedDate!)" />
                    <div class="flex-1 min-w-0">
                      <div class="text-sm" :class="it.is_done ? 'line-through text-ink-500' : 'text-ink-700'">
                        <span v-if="it.kind === 'video'" class="mr-1">🎬</span>{{ it.book.title }}
                        <span v-if="it.kind === 'video'" class="text-ink-500 text-xs ml-1">· 录视频</span>
                      </div>
                      <div class="text-[11px] text-ink-500 mt-0.5">
                        {{ it.book.start_date }} → {{ it.book.deadline }}
                      </div>
                    </div>
                    <button class="btn-ghost !py-1 !px-2 text-xs" @click="openBook(it.book)">打开</button>
                  </div>
                </div>
              </div>
            </section>

            <!-- 创作 -->
            <section>
              <div class="flex items-center justify-between mb-2 px-1">
                <div class="text-xs text-ink-500">创作（{{ dayCreations.length }}）</div>
                <button class="text-xs text-[#8B3C55] hover:underline" @click="addTask('creation')">＋ 新增创作</button>
              </div>
              <div v-if="!dayCreations.length" class="text-sm text-ink-400 text-center py-3">没有临时创作</div>
              <div v-else class="space-y-2">
                <div v-for="t in dayCreations" :key="t.id"
                     class="rounded-xl2 shadow-soft p-3"
                     :style="taskCellStyle('creation')">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" class="w-4 h-4 shrink-0"
                           :checked="!!t.is_done"
                           @change="toggleTaskDone(t)" />
                    <input :value="t.title"
                           class="flex-1 bg-transparent text-sm text-ink-900 outline-none border-b border-white/60 focus:border-[#8B3C55]"
                           :class="t.is_done ? 'line-through text-ink-500' : ''"
                           @change="(e) => updateTaskField(t, { title: (e.target as HTMLInputElement).value })" />
                    <button class="text-[11px] text-ink-500 hover:text-[#D98B92]" title="删除" @click="removeTask(t)">✕</button>
                  </div>
                  <div class="flex items-center gap-2 mt-2">
                    <div v-if="t.inspiration" class="w-10 h-10 rounded overflow-hidden shrink-0 bg-white/50">
                      <img :src="`http://localhost:3899/images/${t.inspiration.thumb_path}`" class="w-full h-full object-cover" />
                    </div>
                    <button class="btn-ghost !py-1 !px-2 text-[11px]" @click="openInspirationPicker(t)">
                      {{ t.inspiration ? '换灵感' : '选灵感' }}
                    </button>
                    <button v-if="t.inspiration" class="text-[11px] text-ink-500 hover:underline"
                            @click="updateTaskField(t, { inspiration_id: null })">去除</button>
                  </div>
                  <textarea :value="t.note" rows="1"
                            placeholder="备注…"
                            class="input !text-xs !py-1 mt-2 bg-white/60"
                            @change="(e) => updateTaskField(t, { note: (e.target as HTMLTextAreaElement).value })" />
                </div>
              </div>
            </section>

            <!-- 剪辑 -->
            <section>
              <div class="flex items-center justify-between mb-2 px-1">
                <div class="text-xs text-ink-500">剪辑（{{ dayEditings.length }}）</div>
                <button class="text-xs text-[#5B3C8A] hover:underline" @click="addTask('editing')">＋ 新增剪辑</button>
              </div>
              <div v-if="!dayEditings.length" class="text-sm text-ink-400 text-center py-3">没有临时剪辑</div>
              <div v-else class="space-y-2">
                <div v-for="t in dayEditings" :key="t.id"
                     class="rounded-xl2 shadow-soft p-3"
                     :style="taskCellStyle('editing')">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" class="w-4 h-4 shrink-0"
                           :checked="!!t.is_done"
                           @change="toggleTaskDone(t)" />
                    <input :value="t.title"
                           class="flex-1 bg-transparent text-sm text-ink-900 outline-none border-b border-white/60 focus:border-[#5B3C8A]"
                           :class="t.is_done ? 'line-through text-ink-500' : ''"
                           @change="(e) => updateTaskField(t, { title: (e.target as HTMLInputElement).value })" />
                    <button class="text-[11px] text-ink-500 hover:text-[#D98B92]" title="删除" @click="removeTask(t)">✕</button>
                  </div>
                  <textarea :value="t.note" rows="1"
                            placeholder="备注…"
                            class="input !text-xs !py-1 mt-2 bg-white/60"
                            @change="(e) => updateTaskField(t, { note: (e.target as HTMLTextAreaElement).value })" />
                </div>
              </div>
            </section>

            <!-- 笔记 -->
            <section class="bg-white rounded-xl2 shadow-soft p-3">
              <div class="text-xs text-ink-500 mb-1">今天笔记</div>
              <textarea v-model="dayNote" rows="3" class="input text-sm" placeholder="记一句…" />
              <div class="flex justify-end mt-2">
                <button class="btn-ghost text-xs" :disabled="dayNoteSaving" @click="saveDayNote">
                  {{ dayNoteSaving ? '保存中…' : '保存笔记' }}
                </button>
              </div>
            </section>
          </div>
        </aside>
      </Transition>
    </Teleport>

    <!-- 灵感挑选弹窗 -->
    <Teleport to="body">
      <div v-if="inspirationPickerFor" class="fixed inset-0 z-[60] grid place-items-center">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="inspirationPickerFor = null" />
        <div class="relative card w-[680px] max-w-[92vw] max-h-[82vh] overflow-auto animate-pop">
          <div class="flex items-center gap-2 mb-3">
            <h3 class="text-lg text-brand-700 flex-1">从创作中心挑灵感</h3>
            <button class="text-xs text-ink-500" @click="inspirationPickerFor = null">关闭</button>
          </div>
          <div v-if="!inspirations.list.length" class="text-sm text-ink-500 text-center py-10">
            创作中心还没图，先去 ✨创作中心 上传吧
          </div>
          <div v-else class="grid grid-cols-3 md:grid-cols-4 gap-2">
            <div v-for="ins in inspirations.list" :key="ins.id"
                 class="bg-cream-200 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand-400 transition"
                 @click="pickInspiration(ins)">
              <div class="aspect-square">
                <img :src="`http://localhost:3899/images/${ins.thumb_path}`" class="w-full h-full object-cover" />
              </div>
              <div v-if="ins.note" class="text-[11px] p-1.5 truncate">{{ ins.note }}</div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
