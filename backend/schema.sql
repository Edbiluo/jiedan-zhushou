-- 接单助手 SQLite schema v1

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS style (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS size (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS page (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  image_path TEXT NOT NULL,
  thumb_path TEXT NOT NULL,
  style_id INTEGER,
  size_id INTEGER,
  is_cover INTEGER NOT NULL DEFAULT 0,
  estimated_hours REAL NOT NULL DEFAULT 1,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (style_id) REFERENCES style(id) ON DELETE SET NULL,
  FOREIGN KEY (size_id) REFERENCES size(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_page_created ON page(created_at);
CREATE INDEX IF NOT EXISTS idx_page_style ON page(style_id);
CREATE INDEX IF NOT EXISTS idx_page_size ON page(size_id);
CREATE INDEX IF NOT EXISTS idx_page_cover ON page(is_cover);

CREATE TABLE IF NOT EXISTS book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_book_deadline ON book(deadline);
CREATE INDEX IF NOT EXISTS idx_book_status ON book(status);

CREATE TABLE IF NOT EXISTS book_page (
  book_id INTEGER NOT NULL,
  page_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (book_id, page_id),
  FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_book_page_book ON book_page(book_id);

CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  book_id INTEGER NOT NULL,
  page_id INTEGER NOT NULL,
  planned_hours REAL NOT NULL DEFAULT 0,
  actual_hours REAL,
  is_done INTEGER NOT NULL DEFAULT 0,
  is_user_override INTEGER NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE (date, book_id, page_id),
  FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(date);
CREATE INDEX IF NOT EXISTS idx_schedule_book ON schedule(book_id);
CREATE INDEX IF NOT EXISTS idx_schedule_done ON schedule(is_done);

CREATE TABLE IF NOT EXISTS leave (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  reason TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS day_log (
  date TEXT PRIMARY KEY,
  notes TEXT DEFAULT '',
  reported_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS day_work_hours (
  date TEXT PRIMARY KEY,
  hours REAL NOT NULL DEFAULT 8
);

-- 预置数据：款式
INSERT OR IGNORE INTO style (name, sort_order, is_preset) VALUES
  ('特价款', 10, 1),
  ('优质款', 20, 1),
  ('重工款', 30, 1);

-- 预置数据：尺寸
INSERT OR IGNORE INTO size (name, sort_order, is_preset) VALUES
  ('小号', 10, 1),
  ('中号', 20, 1),
  ('大号', 30, 1);

-- 预置设置
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('default_daily_hours', '8'),
  ('reminder_time', '22:00'),
  ('near_deadline_days', '3'),
  ('theme', 'cream-blue'),
  ('notification_enabled', '1'),
  ('schema_version', '1');
