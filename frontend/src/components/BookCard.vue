<script setup lang="ts">
import type { Book } from '@/types';
import { computed } from 'vue';
import dayjs from 'dayjs';

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
const pageCount = computed(() => props.book.pages?.length || 0);
</script>

<template>
  <div class="card cursor-pointer hover:-translate-y-1 hover:shadow-pop transition" @click="emit('open', book)">
    <div class="flex items-start justify-between gap-2 mb-3">
      <h3 class="font-hand text-lg text-ink-900 flex-1 truncate">{{ book.title }}</h3>
      <span :class="statusClass">{{ statusLabel }}</span>
    </div>
    <div class="grid grid-cols-3 gap-2 text-xs text-ink-500">
      <div>
        <div class="text-ink-900 font-hand text-base">{{ pageCount }}</div>
        <div>画页</div>
      </div>
      <div>
        <div class="text-ink-900 font-hand text-base">¥{{ book.unit_price }}</div>
        <div>单价</div>
      </div>
      <div>
        <div class="font-hand text-base" :class="daysLeft < 0 ? 'text-[#D98B92]' : daysLeft <= 3 ? 'text-[#E4B77A]' : 'text-ink-900'">
          {{ daysLeft < 0 ? `延期 ${-daysLeft}` : daysLeft === 0 ? '今天' : `${daysLeft} 天` }}
        </div>
        <div>{{ book.deadline }}</div>
      </div>
    </div>
  </div>
</template>
