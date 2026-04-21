import { defineStore } from 'pinia';
import { api } from '@/api';
import type { Settings, Size, Style } from '@/types';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {} as Settings,
    styles: [] as Style[],
    sizes: [] as Size[],
    loaded: false,
  }),
  getters: {
    nearDeadlineDays: (s) => parseInt(s.settings.near_deadline_days || '3', 10),
    reminderTime: (s) => s.settings.reminder_time || '22:00',
    theme: (s) => s.settings.theme || 'cream-blue',
    raw: (s) => s.settings,
  },
  actions: {
    async load() {
      const [settings, styles, sizes] = await Promise.all([
        api.settings.get(),
        api.styles.list(),
        api.sizes.list(),
      ]);
      this.settings = settings;
      this.styles = styles;
      this.sizes = sizes;
      this.loaded = true;
    },
    async update(v: Partial<Settings>) {
      this.settings = await api.settings.update(v);
    },
    async addStyle(name: string) {
      await api.styles.create({ name });
      this.styles = await api.styles.list();
    },
    async removeStyle(id: number) {
      await api.styles.remove(id);
      this.styles = await api.styles.list();
    },
    async addSize(name: string) {
      await api.sizes.create({ name });
      this.sizes = await api.sizes.list();
    },
    async removeSize(id: number) {
      await api.sizes.remove(id);
      this.sizes = await api.sizes.list();
    },
  },
});
