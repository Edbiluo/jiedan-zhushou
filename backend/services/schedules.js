const { getDb } = require('../db');
const dayjs = require('dayjs');

function listByDate(date) {
  return getDb()
    .prepare(
      `SELECT s.*, b.title AS book_title, b.start_date AS book_start, b.deadline AS book_deadline,
              b.status AS book_status, b.has_video AS book_has_video,
              st.name AS style_name, sz.name AS size_name
       FROM schedule s
       JOIN book b ON b.id = s.book_id
       LEFT JOIN style st ON st.id = b.style_id
       LEFT JOIN size sz ON sz.id = b.size_id
       WHERE s.date = ?
       ORDER BY b.deadline, s.id`
    )
    .all(date);
}

function listRange(start, end) {
  return getDb()
    .prepare(
      `SELECT s.*, b.title AS book_title, b.start_date AS book_start, b.deadline AS book_deadline,
              b.status AS book_status, b.has_video AS book_has_video
       FROM schedule s
       JOIN book b ON b.id = s.book_id
       WHERE s.date BETWEEN ? AND ?
       ORDER BY s.date ASC, b.deadline ASC`
    )
    .all(start, end);
}

function listByBook(bookId) {
  return getDb()
    .prepare(
      `SELECT s.* FROM schedule s
       WHERE s.book_id = ?
       ORDER BY s.date ASC, s.segment_kind DESC, s.id`
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

// 某日某本标完成（按 segment_kind=book，默认）—— 不存在则创建一条
function markBookDoneOnDate(bookId, date, isDone = true) {
  const db = getDb();
  const cur = db
    .prepare(
      `SELECT * FROM schedule WHERE book_id = ? AND date = ? AND segment_kind = 'book'`
    )
    .get(bookId, date);
  if (cur) {
    db.prepare(`UPDATE schedule SET is_done = ? WHERE id = ?`).run(isDone ? 1 : 0, cur.id);
    return db.prepare('SELECT * FROM schedule WHERE id = ?').get(cur.id);
  }
  const info = db
    .prepare(
      `INSERT INTO schedule (date, book_id, page_id, segment_kind, is_done, is_user_override)
       VALUES (?, ?, NULL, 'book', ?, 1)`
    )
    .run(date, bookId, isDone ? 1 : 0);
  return db.prepare('SELECT * FROM schedule WHERE id = ?').get(info.lastInsertRowid);
}

function overrideMove(id, newDate) {
  const db = getDb();
  db.prepare(
    'UPDATE schedule SET date = ?, is_user_override = 1 WHERE id = ?'
  ).run(newDate, id);
  return db.prepare('SELECT * FROM schedule WHERE id = ?').get(id);
}

module.exports = {
  listByDate,
  listRange,
  listByBook,
  reportProgress,
  overrideMove,
  markBookDoneOnDate,
};
