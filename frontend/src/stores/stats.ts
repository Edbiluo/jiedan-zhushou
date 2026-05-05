import { defineStore } from 'pinia';
import { api } from '@/api';
import type { StatsSummary } from '@/types';

export const useStatsStore = defineStore('stats', {
  state: () => ({
    summary: null as StatsSummary | null,
  }),
  actions: {
    async load(fromDate: string, toDate: string) {
      this.summary = await api.stats.summary(fromDate, toDate);
      return this.summary;
    },
  },
});
