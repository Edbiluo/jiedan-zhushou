export type Id = number;

export type BookStatus = 'in_progress' | 'near_deadline' | 'overdue' | 'completed';

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
}

export interface Book {
  id: Id;
  title: string;
  unit_price: number;
  deadline: string;
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
  page_id: Id;
  planned_hours: number;
  actual_hours: number | null;
  is_done: 0 | 1;
  is_user_override: 0 | 1;
  note: string;
  book_title?: string;
  book_deadline?: string;
  book_status?: BookStatus;
  page_title?: string;
  thumb_path?: string;
  is_cover?: 0 | 1;
  estimated_hours?: number;
  style_name?: string | null;
  size_name?: string | null;
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

export interface Settings {
  default_daily_hours: string;
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
