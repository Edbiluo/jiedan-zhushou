const { getDb } = require('../db');

function list() {
  return getDb().prepare('SELECT * FROM size ORDER BY sort_order, id').all();
}

function create({ name, sort_order = 100 }) {
  const info = getDb()
    .prepare('INSERT INTO size (name, sort_order, is_preset) VALUES (?, ?, 0)')
    .run(name, sort_order);
  return getDb().prepare('SELECT * FROM size WHERE id = ?').get(info.lastInsertRowid);
}

function update(id, { name, sort_order }) {
  const cur = getDb().prepare('SELECT * FROM size WHERE id = ?').get(id);
  if (!cur) throw new Error('size not found');
  getDb()
    .prepare('UPDATE size SET name = ?, sort_order = ? WHERE id = ?')
    .run(name ?? cur.name, sort_order ?? cur.sort_order, id);
  return getDb().prepare('SELECT * FROM size WHERE id = ?').get(id);
}

function remove(id) {
  const cur = getDb().prepare('SELECT * FROM size WHERE id = ?').get(id);
  if (!cur) throw new Error('size not found');
  if (cur.is_preset) throw new Error('preset size cannot be deleted');
  getDb().prepare('DELETE FROM size WHERE id = ?').run(id);
  return { id };
}

module.exports = { list, create, update, remove };
