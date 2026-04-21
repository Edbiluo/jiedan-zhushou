import { defineStore } from 'pinia';
import { api } from '@/api';
import type { Inspiration } from '@/types';

export const useInspirationsStore = defineStore('inspirations', {
  state: () => ({
    list: [] as Inspiration[],
    loading: false,
    keyword: '',
  }),
  actions: {
    async reload() {
      this.loading = true;
      try {
        this.list = await api.inspirations.list(this.keyword || undefined);
      } finally {
        this.loading = false;
      }
    },
    async create(b: { src_path: string; note?: string }) {
      await api.inspirations.create(b);
      await this.reload();
    },
    async update(id: number, b: { note?: string }) {
      await api.inspirations.update(id, b);
      await this.reload();
    },
    async remove(id: number) {
      await api.inspirations.remove(id);
      this.list = this.list.filter((x) => x.id !== id);
    },
  },
});
