const { getDb } = require('../db');

function hydrate(row) {
  if (!row) return null;
  if (row.inspiration_id) {
    const ins = getDb()
      .prepare('SELECT id, image_path, thumb_path, note FROM inspiration WHERE id = ?')
      .get(row.inspiration_id);
    return { ...row, inspiration: ins || null };
  }
  return { ...row, inspiration: null };
}

function listByDate(date) {
  const rows = getDb()
    .prepare(
      `SELECT * FROM day_task WHERE date = ? ORDER BY kind, sort_order, id`
    )
    .all(date);
  return rows.map(hydrate);
}

function listRange(start, end) {
  const rows = getDb()
    .prepare(
      `SELECT * FROM day_task WHERE date BETWEEN ? AND ? ORDER BY date, kind, sort_order, id`
    )
    .all(start, end);
  return rows.map(hydrate);
}

function create({ date, kind, title = '', inspiration_id = null, note = '' }) {
  if (!date) throw new Error('date required');
  if (!['creation', 'editing'].includes(kind)) throw new Error('invalid kind');
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO day_task (date, kind, title, inspiration_id, note)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(date, kind, title || '', inspiration_id || null, note || '');
  return hydrate(db.prepare('SELECT * FROM day_task WHERE id = ?').get(info.lastInsertRowid));
}

function update(id, { title, inspiration_id, note, is_done, date, kind }) {
  const db = getDb();
  const cur = db.prepare('SELECT * FROM day_task WHERE id = ?').get(id);
  if (!cur) throw new Error('day_task not found');
  db.prepare(
    `UPDATE day_task SET title=?, inspiration_id=?, note=?, is_done=?, date=?, kind=?
     WHERE id=?`
  ).run(
    title ?? cur.title,
    inspiration_id !== undefined ? inspiration_id : cur.inspiration_id,
    note ?? cur.note,
    is_done != null ? (is_done ? 1 : 0) : cur.is_done,
    date ?? cur.date,
    kind ?? cur.kind,
    id
  );
  return hydrate(db.prepare('SELECT * FROM day_task WHERE id = ?').get(id));
}

function remove(id) {
  getDb().prepare('DELETE FROM day_task WHERE id = ?').run(id);
  return { id };
}

module.exports = { listByDate, listRange, create, update, remove };
