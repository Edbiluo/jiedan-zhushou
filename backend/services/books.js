const { getDb } = require('../db');
const scheduler = require('../scheduler');
const settingsSvc = require('./settings');
const dayjs = require('dayjs');

function nearDeadlineDays() {
  return parseInt(settingsSvc.get('near_deadline_days', '3'), 10);
}

function computeStatus(book, allScheduleDone) {
  if (allScheduleDone) return 'completed';
  const today = dayjs().format('YYYY-MM-DD');
  const days = dayjs(book.deadline).diff(dayjs(today), 'day');
  if (days < 0) return 'overdue';
  if (days <= nearDeadlineDays()) return 'near_deadline';
  return 'in_progress';
}

function isBookDone(bookId) {
  const total = getDb().prepare('SELECT COUNT(*) c FROM book_page WHERE book_id = ?').get(bookId).c;
  if (total === 0) return false;
  const doneBooks = getDb()
    .prepare(
      `SELECT COUNT(DISTINCT page_id) c FROM schedule WHERE book_id = ? AND is_done = 1`
    )
    .get(bookId).c;
  return doneBooks >= total;
}

function hydrate(book) {
  if (!book) return null;
  const pages = getDb()
    .prepare(
      `SELECT p.*, bp.sort_order FROM book_page bp
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
  const rows = getDb().prepare(`SELECT * FROM book ${where} ORDER BY deadline ASC, id DESC`).all({ status });
  return rows.map(hydrate);
}

function getById(id) {
  return hydrate(getDb().prepare('SELECT * FROM book WHERE id = ?').get(id));
}

function create({ title, unit_price, deadline, page_ids = [], note = '' }) {
  if (!title || !deadline) throw new Error('title and deadline required');
  const db = getDb();
  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO book (title, unit_price, deadline, status, note) VALUES (?, ?, ?, 'in_progress', ?)`
      )
      .run(title, unit_price || 0, deadline, note);
    const bookId = info.lastInsertRowid;
    const ins = db.prepare('INSERT INTO book_page (book_id, page_id, sort_order) VALUES (?, ?, ?)');
    page_ids.forEach((pid, idx) => ins.run(bookId, pid, idx * 10));
    return bookId;
  });
  const bookId = tx();
  scheduler.regenerate(bookId);
  return getById(bookId);
}

function update(id, { title, unit_price, deadline, page_ids, note }) {
  const cur = getDb().prepare('SELECT * FROM book WHERE id = ?').get(id);
  if (!cur) throw new Error('book not found');
  const db = getDb();
  db.prepare(
    `UPDATE book SET title = ?, unit_price = ?, deadline = ?, note = ? WHERE id = ?`
  ).run(
    title ?? cur.title,
    unit_price ?? cur.unit_price,
    deadline ?? cur.deadline,
    note ?? cur.note,
    id
  );
  if (page_ids) {
    db.prepare('DELETE FROM book_page WHERE book_id = ?').run(id);
    const ins = db.prepare('INSERT INTO book_page (book_id, page_id, sort_order) VALUES (?, ?, ?)');
    page_ids.forEach((pid, idx) => ins.run(id, pid, idx * 10));
    scheduler.regenerate(id);
  } else if (deadline && deadline !== cur.deadline) {
    scheduler.regenerate(id);
  }
  return getById(id);
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

module.exports = { list, getById, create, update, remove, markComplete };
