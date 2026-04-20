const { getDb } = require('../db');
const dayjs = require('dayjs');
const scheduler = require('../scheduler');

function listByDate(date) {
  return getDb()
    .prepare(
      `SELECT s.*, b.title AS book_title, b.deadline AS book_deadline, b.status AS book_status,
              p.title AS page_title, p.thumb_path, p.is_cover, p.estimated_hours,
              st.name AS style_name, sz.name AS size_name
       FROM schedule s
       JOIN book b ON b.id = s.book_id
       JOIN page p ON p.id = s.page_id
       LEFT JOIN style st ON st.id = p.style_id
       LEFT JOIN size sz ON sz.id = p.size_id
       WHERE s.date = ?
       ORDER BY b.deadline, s.id`
    )
    .all(date);
}

function listRange(start, end) {
  return getDb()
    .prepare(
      `SELECT s.*, b.title AS book_title, b.deadline AS book_deadline, b.status AS book_status,
              p.title AS page_title, p.is_cover
       FROM schedule s
       JOIN book b ON b.id = s.book_id
       JOIN page p ON p.id = s.page_id
       WHERE s.date BETWEEN ? AND ?
       ORDER BY s.date ASC, b.deadline ASC`
    )
    .all(start, end);
}

function listByBook(bookId) {
  return getDb()
    .prepare(
      `SELECT s.*, p.title AS page_title, p.is_cover, p.thumb_path
       FROM schedule s
       JOIN page p ON p.id = s.page_id
       WHERE s.book_id = ?
       ORDER BY s.date ASC, s.id`
    )
    .all(bookId);
}

function reportProgress(id, { actual_hours, is_done, note }) {
  const db = getDb();
  const cur = db.prepare('SELECT * FROM schedule WHERE id = ?').get(id);
  if (!cur) throw new Error('schedule not found');
  db.prepare(
    `UPDATE schedule SET actual_hours = ?, is_done = ?, note = ? WHERE id = ?`
  ).run(
    actual_hours ?? cur.actual_hours,
    is_done != null ? (is_done ? 1 : 0) : cur.is_done,
    note ?? cur.note,
    id
  );
  return db.prepare('SELECT * FROM schedule WHERE id = ?').get(id);
}

function overrideMove(id, newDate) {
  const db = getDb();
  db.prepare(
    'UPDATE schedule SET date = ?, is_user_override = 1 WHERE id = ?'
  ).run(newDate, id);
  return db.prepare('SELECT * FROM schedule WHERE id = ?').get(id);
}

function recomputeForBook(bookId) {
  return scheduler.regenerate(bookId, { keepOverride: true });
}

function recomputeAll() {
  const bookIds = getDb()
    .prepare("SELECT id FROM book WHERE status NOT IN ('completed')")
    .all()
    .map((r) => r.id);
  bookIds.forEach((id) => scheduler.regenerate(id, { keepOverride: true }));
  return { updated: bookIds.length };
}

module.exports = {
  listByDate,
  listRange,
  listByBook,
  reportProgress,
  overrideMove,
  recomputeForBook,
  recomputeAll,
};
