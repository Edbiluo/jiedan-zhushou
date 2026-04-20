import { defineStore } from 'pinia';
import { api } from '@/api';
import type { Page } from '@/types';

export const usePagesStore = defineStore('pages', {
  state: () => ({
    list: [] as Page[],
    filter: { style_id: undefined as number | undefined, size_id: undefined as number | undefined, is_cover: undefined as boolean | undefined, keyword: '' as string },
    loading: false,
  }),
  actions: {
    async reload() {
      this.loading = true;
      try {
        this.list = await api.pages.list({
          style_id: this.filter.style_id,
          size_id: this.filter.size_id,
          is_cover: this.filter.is_cover,
          keyword: this.filter.keyword || undefined,
        });
      } finally {
        this.loading = false;
      }
    },
    async create(b: Partial<Page> & { src_path: string }) {
      await api.pages.create(b);
      await this.reload();
    },
    async update(id: number, b: Partial<Page>) {
      await api.pages.update(id, b);
      await this.reload();
    },
    async remove(id: number) {
      await api.pages.remove(id);
      this.list = this.list.filter((p) => p.id !== id);
    },
  },
});
