export type Id = number;

export type BookStatus = 'in_progress' | 'near_deadline' | 'overdue' | 'completed';
export type Sided = 'single' | 'double';
export type SegmentKind = 'book' | 'video';

export interface Style {
  id: Id;
  name: string;
  sort_order: number;
  is_preset: 0 | 1;
}

export interface Size {
  id: Id;
  name: string;
  sort_order: number;
  is_preset: 0 | 1;
}

export interface Page {
  id: Id;
  title: string;
  image_path: string;
  thumb_path: string;
  style_id: Id | null;
  size_id: Id | null;
  is_cover: 0 | 1;
  estimated_hours: number;
  note: string;
  created_at: string;
  // BookDetail 里带出的本内专属备注
  book_note?: string;
  sort_order?: number;
}

export interface Book {
  id: Id;
  title: string;
  unit_price: number;
  start_date: string | null;
  deadline: string;
  page_count: number;
  size_id: Id | null;
  style_id: Id | null;
  sided: Sided;
  has_video: 0 | 1;
  status: BookStatus;
  note: string;
  created_at: string;
  completed_at: string | null;
  pages?: Page[];
}

export interface Schedule {
  id: Id;
  date: string;
  book_id: Id;
  page_id: Id | null;
  segment_kind: SegmentKind;
  is_done: 0 | 1;
  is_user_override: 0 | 1;
  note: string;
  // join 字段
  book_title?: string;
  book_start?: string | null;
  book_deadline?: string;
  book_status?: BookStatus;
  book_has_video?: 0 | 1;
  style_name?: string | null;
  size_name?: string | null;
}

export type DayTaskKind = 'creation' | 'editing';

export interface DayTask {
  id: Id;
  date: string;
  kind: DayTaskKind;
  title: string;
  inspiration_id: Id | null;
  note: string;
  is_done: 0 | 1;
  sort_order: number;
  created_at: string;
  inspiration?: {
    id: Id;
    image_path: string;
    thumb_path: string;
    note: string;
  } | null;
}

export interface Leave {
  id: Id;
  date: string;
  reason: string;
}

export interface DayLog {
  date: string;
  notes: string;
  reported_at: string;
}

export interface Inspiration {
  id: Id;
  image_path: string;
  thumb_path: string;
  note: string;
  created_at: string;
}

export interface Settings {
  reminder_time: string;
  near_deadline_days: string;
  theme: string;
  notification_enabled: string;
  schema_version: string;
  [k: string]: string;
}

export interface StatsSummary {
  monthly_income: { month: string; income: number; book_count: number }[];
  average_price: { count: number; avg_price: number };
  style_distribution: { style_name: string; page_count: number }[];
  completed_book_count: { month: string; cnt: number }[];
  avg_page_hours: { month: string; avg_hours: number; samples: number }[];
}

export interface CreateBookInput {
  title: string;
  unit_price: number;
  start_date: string;
  deadline: string;
  page_count: number;
  size_id?: Id | null;
  style_id?: Id | null;
  sided: Sided;
  has_video: 0 | 1;
  note?: string;
}
