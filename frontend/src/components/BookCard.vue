<script setup lang="ts">
import type { Book } from '@/types';
import { computed } from 'vue';
import dayjs from 'dayjs';
import { bookGradient } from '@/utils/palette';

const props = defineProps<{ book: Book }>();
const emit = defineEmits<{ (e: 'open', b: Book): void }>();

const status = computed(() => props.book.status);
const statusLabel = computed(() => ({
  in_progress: '进行中',
  near_deadline: '快到交付',
  overdue: '延期',
  completed: '已完成',
} as const)[status.value]);
const statusClass = computed(() => ({
  in_progress: 'chip-brand',
  near_deadline: 'chip-warn',
  overdue: 'chip-danger',
  completed: 'chip-done',
} as const)[status.value]);
const daysLeft = computed(() => dayjs(props.book.deadline).diff(dayjs().format('YYYY-MM-DD'), 'day'));
const pageCount = computed(() => props.book.page_count || props.book.pages?.length || 0);

const gradient = computed(() => bookGradient(props.book.id));
</script>

<template>
  <div class="card cursor-pointer hover:-translate-y-1 hover:shadow-pop transition overflow-hidden"
       @click="emit('open', book)">
    <div class="h-1.5 -mx-4 -mt-4 mb-3" :style="{ background: gradient }"></div>
    <div class="flex items-start justify-between gap-2 mb-3">
      <h3 class="text-base text-ink-900 flex-1 truncate">{{ book.title }}</h3>
      <span :class="statusClass">{{ statusLabel }}</span>
    </div>
    <div class="grid grid-cols-3 gap-2 text-xs text-ink-500">
      <div>
        <div class="text-ink-900 text-base">{{ pageCount }}</div>
        <div>页数</div>
      </div>
      <div>
        <div class="text-ink-900 text-base">¥{{ book.unit_price }}</div>
        <div>单价</div>
      </div>
      <div>
        <div class="text-base"
             :class="daysLeft < 0 ? 'text-[#D98B92]' : daysLeft <= 3 ? 'text-[#E4B77A]' : 'text-ink-900'">
          {{ daysLeft < 0 ? `延 ${-daysLeft}` : daysLeft === 0 ? '今天' : `${daysLeft}天` }}
        </div>
        <div>{{ book.deadline }}</div>
      </div>
    </div>
    <div class="flex items-center gap-1 mt-3 flex-wrap text-[11px]">
      <span v-if="book.start_date" class="chip">{{ book.start_date }} → {{ book.deadline }}</span>
      <span v-if="book.sided === 'double'" class="chip">双面</span>
      <span v-if="book.has_video" class="chip chip-brand">含视频</span>
    </div>
  </div>
</template>
