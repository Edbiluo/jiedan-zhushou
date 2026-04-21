const { getDb } = require('../db');
const settingsSvc = require('./settings');
const dayjs = require('dayjs');

function nearDeadlineDays() {
  return parseInt(settingsSvc.get('near_deadline_days', '3'), 10);
}

function todayStr() {
  return dayjs().format('YYYY-MM-DD');
}

function computeStatus(book, allScheduleDone) {
  if (allScheduleDone) return 'completed';
  const today = todayStr();
  const days = dayjs(book.deadline).diff(dayjs(today), 'day');
  if (days < 0) return 'overdue';
  if (days <= nearDeadlineDays()) return 'near_deadline';
  return 'in_progress';
}

function isBookDone(bookId) {
  const rows = getDb()
    .prepare(`SELECT is_done FROM schedule WHERE book_id = ?`)
    .all(bookId);
  if (!rows.length) return false;
  return rows.every((r) => r.is_done === 1);
}

function hydrate(book) {
  if (!book) return null;
  const pages = getDb()
    .prepare(
      `SELECT p.*, bp.sort_order, bp.note AS book_note
       FROM book_page bp
       JOIN page p ON p.id = bp.page_id
       WHERE bp.book_id = ? ORDER BY bp.sort_order, p.id`
    )
    .all(book.id);
  const done = isBookDone(book.id);
  const computed = computeStatus(book, done);
  if (computed !== book.status) {
    getDb().prepare('UPDATE book SET status = ? WHERE id = ?').run(computed, book.id);
    book.status = computed;
    if (computed === 'completed' && !book.completed_at) {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
      getDb().prepare('UPDATE book SET completed_at = ? WHERE id = ?').run(now, book.id);
      book.completed_at = now;
    }
  }
  return { ...book, pages };
}

function list({ status } = {}) {
  const where = status ? 'WHERE status = @status' : '';
  const rows = getDb()
    .prepare(`SELECT * FROM book ${where} ORDER BY deadline ASC, id DESC`)
    .all({ status });
  return rows.map(hydrate);
}

function getById(id) {
  return hydrate(getDb().prepare('SELECT * FROM book WHERE id = ?').get(id));
}

// ---- 区间展开：把 [start, end] 每天写一条 segment_kind='book'；
//      has_video 则 end+1 再加一条 segment_kind='video'（v3 起不再存工时）----
function generateScheduleRows({ bookId, start_date, end_date, has_video }) {
  const db = getDb();
  // 清旧（保留用户已勾完成的行：尊重事实）
  db.prepare(`DELETE FROM schedule WHERE book_id = ? AND is_done = 0`).run(bookId);

  const start = dayjs(start_date);
  const end = dayjs(end_date);
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return;

  const ins = db.prepare(
    `INSERT INTO schedule (date, book_id, page_id, segment_kind)
     VALUES (?, ?, NULL, 'book')
     ON CONFLICT(date, book_id, segment_kind) DO NOTHING`
  );

  let cur = start;
  while (cur.isBefore(end) || cur.isSame(end, 'day')) {
    ins.run(cur.format('YYYY-MM-DD'), bookId);
    cur = cur.add(1, 'day');
  }

  if (has_video) {
    const vDate = end.add(1, 'day').format('YYYY-MM-DD');
    db.prepare(
      `INSERT INTO schedule (date, book_id, page_id, segment_kind)
       VALUES (?, ?, NULL, 'video')
       ON CONFLICT(date, book_id, segment_kind) DO NOTHING`
    ).run(vDate, bookId);
  }
}

function validateDateRange({ start_date, deadline }) {
  const today = todayStr();
  if (!start_date) throw new Error('start_date required');
  if (!deadline) throw new Error('deadline required');
  if (start_date < today) throw new Error('开画日期不能早于今天');
  if (deadline < today) throw new Error('完成日期不能早于今天');
  if (deadline < start_date) throw new Error('完成日期不能早于开画日期');
}

function create({
  title,
  unit_price,
  start_date,
  deadline,
  page_count = 0,
  size_id = null,
  style_id = null,
  sided = 'single',
  has_video = 0,
  note = '',
  page_ids = [],
}) {
  if (!title) throw new Error('title required');
  validateDateRange({ start_date, deadline });

  const db = getDb();
  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO book (title, unit_price, start_date, deadline, page_count,
                           size_id, style_id, sided, has_video, status, note)
         VALUES (@title, @unit_price, @start_date, @deadline, @page_count,
                 @size_id, @style_id, @sided, @has_video, 'in_progress', @note)`
      )
      .run({
        title,
        unit_price: unit_price || 0,
        start_date,
        deadline,
        page_count: page_count || 0,
        size_id: size_id ?? null,
        style_id: style_id ?? null,
        sided: sided === 'double' ? 'double' : 'single',
        has_video: has_video ? 1 : 0,
        note: note || '',
      });
    const bookId = info.lastInsertRowid;

    if (page_ids && page_ids.length) {
      const ins = db.prepare(
        `INSERT INTO book_page (book_id, page_id, sort_order, note) VALUES (?, ?, ?, '')`
      );
      page_ids.forEach((pid, idx) => ins.run(bookId, pid, idx * 10));
    }

    generateScheduleRows({
      bookId,
      start_date,
      end_date: deadline,
      has_video: has_video ? 1 : 0,
    });
    return bookId;
  });
  const bookId = tx();
  return getById(bookId);
}

function update(id, body) {
  const cur = getDb().prepare('SELECT * FROM book WHERE id = ?').get(id);
  if (!cur) throw new Error('book not found');

  const merged = {
    title: body.title ?? cur.title,
    unit_price: body.unit_price ?? cur.unit_price,
    start_date: body.start_date ?? cur.start_date,
    deadline: body.deadline ?? cur.deadline,
    page_count: body.page_count ?? cur.page_count,
    size_id: body.size_id !== undefined ? body.size_id : cur.size_id,
    style_id: body.style_id !== undefined ? body.style_id : cur.style_id,
    sided: body.sided ?? cur.sided,
    has_video: body.has_video != null ? (body.has_video ? 1 : 0) : cur.has_video,
    note: body.note ?? cur.note,
  };

  // 日期变动时校验（允许保持原值即使早于今天——不强退已有本）
  if (body.start_date && body.start_date !== cur.start_date) {
    if (body.start_date < todayStr()) throw new Error('开画日期不能早于今天');
  }
  if (body.deadline && body.deadline !== cur.deadline) {
    if (body.deadline < todayStr()) throw new Error('完成日期不能早于今天');
  }
  if (merged.deadline < merged.start_date) throw new Error('完成日期不能早于开画日期');

  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE book SET title=@title, unit_price=@unit_price, start_date=@start_date,
         deadline=@deadline, page_count=@page_count,
         size_id=@size_id, style_id=@style_id, sided=@sided, has_video=@has_video, note=@note
       WHERE id=@id`
    ).run({ id, ...merged });

    if (Array.isArray(body.page_ids)) {
      // 保留已有 note：先查出旧 note，覆盖重建
      const oldNotes = new Map();
      db.prepare('SELECT page_id, note FROM book_page WHERE book_id = ?')
        .all(id)
        .forEach((r) => oldNotes.set(r.page_id, r.note || ''));
      db.prepare('DELETE FROM book_page WHERE book_id = ?').run(id);
      const ins = db.prepare(
        `INSERT INTO book_page (book_id, page_id, sort_order, note) VALUES (?, ?, ?, ?)`
      );
      body.page_ids.forEach((pid, idx) =>
        ins.run(id, pid, idx * 10, oldNotes.get(pid) || '')
      );
    }

    // 日期/视频开关变了，重新展开 schedule
    const scheduleDirty =
      body.start_date !== undefined ||
      body.deadline !== undefined ||
      body.has_video !== undefined;
    if (scheduleDirty) {
      generateScheduleRows({
        bookId: id,
        start_date: merged.start_date,
        end_date: merged.deadline,
        has_video: merged.has_video,
      });
    }
  });
  tx();
  return getById(id);
}

function updateBookPageNote(bookId, pageId, note) {
  const db = getDb();
  const row = db
    .prepare('SELECT 1 FROM book_page WHERE book_id = ? AND page_id = ?')
    .get(bookId, pageId);
  if (!row) throw new Error('page not in book');
  db.prepare(
    'UPDATE book_page SET note = ? WHERE book_id = ? AND page_id = ?'
  ).run(note || '', bookId, pageId);
  return { ok: true };
}

function reorderPages(bookId, orderedPageIds) {
  const db = getDb();
  const tx = db.transaction(() => {
    const upd = db.prepare(
      'UPDATE book_page SET sort_order = ? WHERE book_id = ? AND page_id = ?'
    );
    orderedPageIds.forEach((pid, idx) => upd.run(idx * 10, bookId, pid));
  });
  tx();
  return getById(bookId);
}

function remove(id) {
  const db = getDb();
  db.prepare('DELETE FROM book WHERE id = ?').run(id);
  return { id };
}

function markComplete(id) {
  const db = getDb();
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  db.prepare("UPDATE book SET status = 'completed', completed_at = ? WHERE id = ?").run(now, id);
  db.prepare('UPDATE schedule SET is_done = 1 WHERE book_id = ?').run(id);
  return getById(id);
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  markComplete,
  updateBookPageNote,
  reorderPages,
};
