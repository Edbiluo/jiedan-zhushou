import { defineStore } from 'pinia';
import { api } from '@/api';
import type { Book } from '@/types';

export const useBooksStore = defineStore('books', {
  state: () => ({
    list: [] as Book[],
    current: null as Book | null,
  }),
  actions: {
    async reload(status?: string) {
      this.list = await api.books.list(status);
    },
    async load(id: number) {
      this.current = await api.books.get(id);
      return this.current;
    },
    async create(b: { title: string; unit_price: number; deadline: string; page_ids: number[]; note?: string }) {
      const book = await api.books.create(b);
      await this.reload();
      return book;
    },
    async update(id: number, b: Partial<Book> & { page_ids?: number[] }) {
      const book = await api.books.update(id, b);
      if (this.current?.id === id) this.current = book;
      await this.reload();
      return book;
    },
    async remove(id: number) {
      await api.books.remove(id);
      this.list = this.list.filter((b) => b.id !== id);
      if (this.current?.id === id) this.current = null;
    },
    async complete(id: number) {
      const book = await api.books.complete(id);
      if (this.current?.id === id) this.current = book;
      await this.reload();
      return book;
    },
  },
});
