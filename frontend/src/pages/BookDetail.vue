<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import type { Book, Schedule } from '@/types';
import Confetti from '@/components/Confetti.vue';
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();
const bookId = computed(() => Number(route.params.id));
const book = ref<Book | null>(null);
const schedules = ref<Schedule[]>([]);
const saving = ref(false);
const confettiTick = ref(0);

async function refresh() {
  book.value = await api.books.get(bookId.value);
  schedules.value = await api.schedules.byBook(bookId.value);
}

onMounted(refresh);
watch(() => bookId.value, refresh);

const byDate = computed(() => {
  const map: Record<string, Schedule[]> = {};
  for (const s of schedules.value) (map[s.date] ||= []).push(s);
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
});

async function markDone(s: Schedule) {
  await api.schedules.progress(s.id, { is_done: !s.is_done, actual_hours: s.planned_hours });
  const all = schedules.value.every((x) => x.id === s.id ? !s.is_done : x.is_done);
  if (all) confettiTick.value++;
  await refresh();
}

async function moveItem(s: Schedule, delta: number) {
  const newDate = dayjs(s.date).add(delta, 'day').format('YYYY-MM-DD');
  await api.schedules.move(s.id, newDate);
  await refresh();
}

async function completeBook() {
  if (!confirm('确认标记整本完成？')) return;
  saving.value = true;
  try {
    await api.books.complete(bookId.value);
    confettiTick.value++;
    await refresh();
  } finally { saving.value = false; }
}

async function recompute() {
  saving.value = true;
  try {
    await api.schedules.recomputeBook(bookId.value);
    await refresh();
  } finally { saving.value = false; }
}

async function removeBook() {
  if (!confirm('删除整本？此操作不可撤销')) return;
  await api.books.remove(bookId.value);
  router.push('/books');
}
</script>

<template>
  <div v-if="book" class="space-y-4">
    <Confetti :trigger="confettiTick" />
    <div class="card">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-2xl font-hand text-brand-700">{{ book.title }}</h2>
          <div class="text-sm text-ink-500 mt-1 font-hand">交付 {{ book.deadline }} · 单价 ¥{{ book.unit_price }} · 共 {{ book.pages?.length || 0 }} 画页</div>
          <p v-if="book.note" class="text-sm text-ink-700 mt-2 font-hand">{{ book.note }}</p>
        </div>
        <div class="flex flex-col gap-2">
          <button class="btn-ghost font-hand" @click="recompute" :disabled="saving">🔄 重新排期</button>
          <button class="btn-primary font-hand" @click="completeBook" :disabled="saving || book.status === 'completed'">✓ 标记完成</button>
          <button class="btn-danger font-hand" @click="removeBook">删除本</button>
        </div>
      </div>
    </div>

    <div v-if="book.pages?.length" class="card">
      <h3 class="font-hand text-lg text-brand-700 mb-3">画页（{{ book.pages.length }}）</h3>
      <div class="grid grid-cols-6 gap-2">
        <div v-for="p in book.pages" :key="p.id" class="text-center">
          <div class="aspect-square bg-cream-200 rounded-xl2 overflow-hidden">
            <img v-if="p.thumb_path" :src="`http://localhost:3899/images/${p.thumb_path}`" class="w-full h-full object-cover" />
          </div>
          <div class="text-xs font-hand mt-1 truncate">{{ p.is_cover ? '【封】' : '' }}{{ p.title }}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="font-hand text-lg text-brand-700 mb-3">排期日程</h3>
      <div v-if="!byDate.length" class="text-center py-10 text-ink-500 font-hand">暂无排期</div>
      <div v-else class="space-y-3">
        <div v-for="[date, items] in byDate" :key="date" class="border-l-4 border-brand-200 pl-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="font-hand text-brand-700">{{ date }}</span>
            <span class="text-xs text-ink-500 font-hand">{{ items.reduce((s, i) => s + i.planned_hours, 0) }}h</span>
          </div>
          <div class="space-y-1">
            <div v-for="it in items" :key="it.id" class="flex items-center gap-2 p-2 rounded-xl2 bg-cream-100">
              <input type="checkbox" :checked="!!it.is_done" class="w-4 h-4" @change="markDone(it)" />
              <div class="flex-1 text-sm font-hand" :class="it.is_done ? 'line-through text-ink-500' : ''">
                {{ it.is_cover ? '【封】' : '' }}{{ it.page_title }}
                <span class="text-xs text-ink-500 ml-2">{{ it.planned_hours }}h</span>
                <span v-if="it.is_user_override" class="chip ml-2 text-[10px]">已调整</span>
              </div>
              <button class="btn-ghost !p-1 text-xs" title="提前一天" @click="moveItem(it, -1)">←</button>
              <button class="btn-ghost !p-1 text-xs" title="推后一天" @click="moveItem(it, 1)">→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-center py-20 text-ink-500 font-hand">加载中...</div>
</template>
