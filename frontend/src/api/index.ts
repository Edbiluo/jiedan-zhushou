import { http } from './client';
import type { Book, DayLog, Leave, Page, Schedule, Settings, Size, StatsSummary, Style } from '@/types';

export const api = {
  settings: {
    get: () => http.get<Settings>('/settings'),
    update: (v: Partial<Settings>) => http.put<Settings>('/settings', v),
  },
  styles: {
    list: () => http.get<Style[]>('/styles'),
    create: (b: { name: string; sort_order?: number }) => http.post<Style>('/styles', b),
    update: (id: number, b: Partial<Style>) => http.put<Style>(`/styles/${id}`, b),
    remove: (id: number) => http.del<{ id: number }>(`/styles/${id}`),
  },
  sizes: {
    list: () => http.get<Size[]>('/sizes'),
    create: (b: { name: string; sort_order?: number }) => http.post<Size>('/sizes', b),
    update: (id: number, b: Partial<Size>) => http.put<Size>(`/sizes/${id}`, b),
    remove: (id: number) => http.del<{ id: number }>(`/sizes/${id}`),
  },
  pages: {
    list: (q: { style_id?: number; size_id?: number; is_cover?: boolean; keyword?: string } = {}) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(q)) if (v != null) params.set(k, String(v));
      const s = params.toString();
      return http.get<Page[]>(`/pages${s ? `?${s}` : ''}`);
    },
    get: (id: number) => http.get<Page>(`/pages/${id}`),
    create: (b: Partial<Page> & { src_path: string }) => http.post<Page>('/pages', b),
    update: (id: number, b: Partial<Page>) => http.put<Page>(`/pages/${id}`, b),
    remove: (id: number) => http.del<{ id: number }>(`/pages/${id}`),
  },
  books: {
    list: (status?: string) => http.get<Book[]>(`/books${status ? `?status=${status}` : ''}`),
    get: (id: number) => http.get<Book>(`/books/${id}`),
    create: (b: { title: string; unit_price: number; deadline: string; page_ids: number[]; note?: string }) =>
      http.post<Book>('/books', b),
    update: (id: number, b: Partial<Book> & { page_ids?: number[] }) => http.put<Book>(`/books/${id}`, b),
    remove: (id: number) => http.del<{ id: number }>(`/books/${id}`),
    complete: (id: number) => http.post<Book>(`/books/${id}/complete`),
  },
  schedules: {
    byDate: (date: string) => http.get<Schedule[]>(`/schedules/date/${date}`),
    range: (start: string, end: string) => http.get<Schedule[]>(`/schedules/range?start=${start}&end=${end}`),
    byBook: (id: number) => http.get<Schedule[]>(`/schedules/book/${id}`),
    progress: (id: number, b: { actual_hours?: number; is_done?: boolean; note?: string }) =>
      http.post<Schedule>(`/schedules/${id}/progress`, b),
    move: (id: number, date: string) => http.post<Schedule>(`/schedules/${id}/move`, { date }),
    recomputeBook: (id: number) => http.post(`/schedules/recompute/book/${id}`),
    recomputeAll: () => http.post(`/schedules/recompute/all`),
  },
  leaves: {
    list: (q: { start?: string; end?: string } = {}) => {
      const s = new URLSearchParams(q as any).toString();
      return http.get<Leave[]>(`/leaves${s ? `?${s}` : ''}`);
    },
    create: (b: { date: string; reason?: string }) => http.post<Leave>('/leaves', b),
    remove: (date: string) => http.del(`/leaves/${date}`),
  },
  dayLog: {
    get: (date: string) => http.get<DayLog | null>(`/day-log/${date}`),
    report: (date: string, b: { notes?: string } = {}) => http.post<DayLog>(`/day-log/${date}`, b),
    getHours: (date: string) => http.get<{ date: string; hours: number | null }>(`/day-hours/${date}`),
    setHours: (date: string, hours: number) => http.put(`/day-hours/${date}`, { hours }),
  },
  stats: {
    summary: (from: string, to: string) => http.get<StatsSummary>(`/stats/summary?from=${from}&to=${to}`),
  },
};
