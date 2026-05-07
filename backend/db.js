const fs = require('fs');
const path = require('path');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.warn('better-sqlite3 not installed yet');
}

let db = null;
let dbPath = null;

function hasColumn(d, table, col) {
  const rows = d.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === col);
}

function hasTable(d, name) {
  const row = d
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
  return !!row;
}

function migrateToV2(d) {
  const addCol = (sql) => {
    try { d.exec(sql); } catch (e) { console.warn('migrate add col skip:', e.message); }
  };

  // book 新字段
  if (!hasColumn(d, 'book', 'start_date')) {
    addCol(`ALTER TABLE book ADD COLUMN start_date TEXT`);
  }
  if (!hasColumn(d, 'book', 'page_count')) addCol(`ALTER TABLE book ADD COLUMN page_count INTEGER NOT NULL DEFAULT 0`);
  if (!hasColumn(d, 'book', 'estimated_hours')) addCol(`ALTER TABLE book ADD COLUMN estimated_hours REAL NOT NULL DEFAULT 0`);
  if (!hasColumn(d, 'book', 'size_id')) addCol(`ALTER TABLE book ADD COLUMN size_id INTEGER`);
  if (!hasColumn(d, 'book', 'style_id')) addCol(`ALTER TABLE book ADD COLUMN style_id INTEGER`);
  if (!hasColumn(d, 'book', 'sided')) addCol(`ALTER TABLE book ADD COLUMN sided TEXT NOT NULL DEFAULT 'single'`);
  if (!hasColumn(d, 'book', 'has_video')) addCol(`ALTER TABLE book ADD COLUMN has_video INTEGER NOT NULL DEFAULT 0`);

  // book_page 新字段
  if (!hasColumn(d, 'book_page', 'note')) addCol(`ALTER TABLE book_page ADD COLUMN note TEXT DEFAULT ''`);

  // schedule 改造：page_id 从 NOT NULL 变可空，新增 segment_kind，UNIQUE 约束从 (date, book, page) 改为 (date, book, segment_kind)
  // SQLite 不支持直接改列约束，需要重建表
  const needScheduleRebuild = !hasColumn(d, 'schedule', 'segment_kind');
  if (needScheduleRebuild) {
    const tx = d.transaction(() => {
      d.exec(`
        CREATE TABLE schedule_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          book_id INTEGER NOT NULL,
          page_id INTEGER,
          segment_kind TEXT NOT NULL DEFAULT 'book',
          planned_hours REAL NOT NULL DEFAULT 0,
          actual_hours REAL,
          is_done INTEGER NOT NULL DEFAULT 0,
          is_user_override INTEGER NOT NULL DEFAULT 0,
          note TEXT DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          UNIQUE (date, book_id, segment_kind),
          FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
          FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE SET NULL
        );
      `);
      // 把旧数据按 (date, book_id) 聚合迁移（旧数据是按页粒度，合并为本级 'book' 段）
      d.exec(`
        INSERT INTO schedule_new (date, book_id, page_id, segment_kind, planned_hours, actual_hours, is_done, is_user_override, note, created_at)
        SELECT date, book_id, NULL, 'book',
               SUM(COALESCE(planned_hours, 0)),
               SUM(actual_hours),
               MAX(is_done),
               MAX(is_user_override),
               COALESCE(MAX(note), ''),
               MIN(created_at)
        FROM schedule
        GROUP BY date, book_id;
      `);
      d.exec(`DROP TABLE schedule;`);
      d.exec(`ALTER TABLE schedule_new RENAME TO schedule;`);
      d.exec(`CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(date);`);
      d.exec(`CREATE INDEX IF NOT EXISTS idx_schedule_book ON schedule(book_id);`);
      d.exec(`CREATE INDEX IF NOT EXISTS idx_schedule_done ON schedule(is_done);`);
    });
    try { tx(); } catch (e) { console.error('schedule rebuild failed:', e.message); }
  }

  // 写入 schema_version = 2
  d.prepare(
    `INSERT INTO settings (key, value) VALUES ('schema_version', '2')
     ON CONFLICT(key) DO UPDATE SET value = '2'`
  ).run();

  // 追加 video_hours 默认
  d.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('video_hours', '4')`
  ).run();

  // 新字段建索引（必须在 ADD COLUMN 之后）
  try { d.exec(`CREATE INDEX IF NOT EXISTS idx_book_start ON book(start_date)`); }
  catch (e) { console.warn('idx_book_start skip:', e.message); }
}

function migrateToV3(d) {
  // v3：新增 day_task；清理 settings 里不再使用的 hours 键
  const addCol = (sql) => { try { d.exec(sql); } catch (e) { console.warn('migrate v3 skip:', e.message); } };

  if (!hasTable(d, 'day_task')) {
    d.exec(`
      CREATE TABLE day_task (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT DEFAULT '',
        inspiration_id INTEGER,
        note TEXT DEFAULT '',
        is_done INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (inspiration_id) REFERENCES inspiration(id) ON DELETE SET NULL
      );
    `);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_day_task_date ON day_task(date);`);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_day_task_kind ON day_task(kind);`);
  }

  // 清退 settings 里的 hours 键
  d.prepare("DELETE FROM settings WHERE key IN ('default_daily_hours','video_hours')").run();

  d.prepare(
    `INSERT INTO settings (key, value) VALUES ('schema_version', '3')
     ON CONFLICT(key) DO UPDATE SET value = '3'`
  ).run();
}

function migrateToV4(d) {
  const cols = d.prepare("PRAGMA table_info(book)").all().map(c => c.name);
  if (!cols.includes('deposit')) {
    d.exec("ALTER TABLE book ADD COLUMN deposit REAL NOT NULL DEFAULT 0");
  }
  d.prepare("INSERT INTO settings(key,value) VALUES('schema_version','4') ON CONFLICT(key) DO UPDATE SET value='4'").run();
}

function runMigrations(d) {
  let current = 1;
  try {
    const row = d.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get();
    if (row) current = parseInt(row.value, 10) || 1;
  } catch (e) { /* 全新库，schema.sql 还没跑完这里就没 settings 表，交给后续 */ }

  if (current < 2) migrateToV2(d);
  if (current < 3) migrateToV3(d);
  if (current < 4) migrateToV4(d);

  // 保证旧库也有 app_name 默认值（新库由 schema.sql 的 INSERT OR IGNORE 覆盖）
  try {
    d.prepare(
      `INSERT OR IGNORE INTO settings (key, value) VALUES ('app_name', '小猪的接单小助手')`
    ).run();
  } catch (e) { console.warn('app_name migration skip:', e.message); }
}

function initDb(targetPath) {
  if (!Database) throw new Error('better-sqlite3 not available');
  dbPath = targetPath;
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(targetPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // 老库（schema_version < 2）升级
  runMigrations(db);

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function getDbPath() {
  return dbPath;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDb, getDb, getDbPath, closeDb };
