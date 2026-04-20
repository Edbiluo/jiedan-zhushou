const { getDb } = require('../db');

function list() {
  return getDb().prepare('SELECT * FROM style ORDER BY sort_order, id').all();
}

function create({ name, sort_order = 100 }) {
  const info = getDb()
    .prepare('INSERT INTO style (name, sort_order, is_preset) VALUES (?, ?, 0)')
    .run(name, sort_order);
  return getDb().prepare('SELECT * FROM style WHERE id = ?').get(info.lastInsertRowid);
}

function update(id, { name, sort_order }) {
  const cur = getDb().prepare('SELECT * FROM style WHERE id = ?').get(id);
  if (!cur) throw new Error('style not found');
  getDb()
    .prepare('UPDATE style SET name = ?, sort_order = ? WHERE id = ?')
    .run(name ?? cur.name, sort_order ?? cur.sort_order, id);
  return getDb().prepare('SELECT * FROM style WHERE id = ?').get(id);
}

function remove(id) {
  const cur = getDb().prepare('SELECT * FROM style WHERE id = ?').get(id);
  if (!cur) throw new Error('style not found');
  if (cur.is_preset) throw new Error('preset style cannot be deleted');
  getDb().prepare('DELETE FROM style WHERE id = ?').run(id);
  return { id };
}

module.exports = { list, create, update, remove };
