import { defineStore } from 'pinia';
import { api } from '@/api';
import type { Leave, Schedule } from '@/types';
import dayjs from 'dayjs';

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    byDate: {} as Record<string, Schedule[]>,
    leaves: [] as Leave[],
  }),
  actions: {
    async loadRange(start: string, end: string) {
      const [schedules, leaves] = await Promise.all([
        api.schedules.range(start, end),
        api.leaves.list({ start, end }),
      ]);
      const grouped: Record<string, Schedule[]> = {};
      for (const s of schedules) {
        (grouped[s.date] ||= []).push(s);
      }
      this.byDate = grouped;
      this.leaves = leaves;
    },
    async loadDay(date: string) {
      const list = await api.schedules.byDate(date);
      this.byDate[date] = list;
      return list;
    },
    isLeave(date: string) {
      return this.leaves.some((l) => l.date === date);
    },
    async requestLeave(date: string, reason = '') {
      await api.leaves.create({ date, reason });
      await this.loadRange(dayjs(date).startOf('month').format('YYYY-MM-DD'), dayjs(date).endOf('month').format('YYYY-MM-DD'));
    },
    async cancelLeave(date: string) {
      await api.leaves.remove(date);
      await this.loadRange(dayjs(date).startOf('month').format('YYYY-MM-DD'), dayjs(date).endOf('month').format('YYYY-MM-DD'));
    },
    async reportProgress(id: number, body: { actual_hours?: number; is_done?: boolean; note?: string }) {
      return api.schedules.progress(id, body);
    },
    async move(id: number, date: string) {
      return api.schedules.move(id, date);
    },
    /** 批量把某天所有未完成 schedule 置为完成 */
    async markAllDoneForDate(date: string) {
      const list = this.byDate[date] || (await this.loadDay(date));
      const undone = list.filter((s) => !s.is_done);
      for (const s of undone) {
        await api.schedules.progress(s.id, {
          is_done: true,
          actual_hours: s.actual_hours ?? s.planned_hours,
        });
      }
      await this.loadDay(date);
    },
    /** 全量重算排期 */
    async recomputeAll() {
      await api.schedules.recomputeAll();
    },
  },
});
