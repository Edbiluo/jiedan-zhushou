import { defineStore } from 'pinia';
import { api } from '@/api';
import type { DayTask, DayTaskKind } from '@/types';

export const useDayTasksStore = defineStore('dayTasks', {
  state: () => ({
    byDate: {} as Record<string, DayTask[]>,
  }),
  actions: {
    async loadDay(date: string) {
      const list = await api.dayTasks.byDate(date);
      this.byDate[date] = list;
      return list;
    },
    async loadRange(start: string, end: string) {
      const list = await api.dayTasks.range(start, end);
      const grouped: Record<string, DayTask[]> = {};
      for (const t of list) (grouped[t.date] ||= []).push(t);
      this.byDate = grouped;
    },
    async create(b: { date: string; kind: DayTaskKind; title?: string; inspiration_id?: number | null; note?: string }) {
      const t = await api.dayTasks.create(b);
      (this.byDate[b.date] ||= []).push(t);
      return t;
    },
    async update(id: number, b: Partial<DayTask>) {
      const updated = await api.dayTasks.update(id, b);
      if (updated.date && this.byDate[updated.date]) {
        this.byDate[updated.date] = this.byDate[updated.date].map((x) => x.id === id ? updated : x);
      }
      return updated;
    },
    async remove(id: number, date: string) {
      await api.dayTasks.remove(id);
      if (this.byDate[date]) this.byDate[date] = this.byDate[date].filter((x) => x.id !== id);
    },
  },
});
