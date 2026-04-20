import { defineStore } from 'pinia';
import { api } from '@/api';
import type { StatsSummary } from '@/types';

export const useStatsStore = defineStore('stats', {
  state: () => ({
    summary: null as StatsSummary | null,
  }),
  actions: {
    async load(from: string, to: string) {
      this.summary = await api.stats.summary(from, to);
      return this.summary;
    },
  },
});
