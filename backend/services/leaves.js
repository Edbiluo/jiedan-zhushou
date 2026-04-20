const { getDb } = require('../db');
const scheduler = require('../scheduler');

function list(range) {
  if (range && range.start && range.end) {
    return getDb()
      .prepare('SELECT * FROM leave WHERE date BETWEEN ? AND ? ORDER BY date')
      .all(range.start, range.end);
  }
  return getDb().prepare('SELECT * FROM leave ORDER BY date').all();
}

function create({ date, reason = '' }) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO leave (date, reason) VALUES (?, ?)').run(date, reason);
  const row = db.prepare('SELECT * FROM leave WHERE date = ?').get(date);
  scheduler.recomputeForLeaveChange(date);
  return row;
}

function remove(date) {
  const db = getDb();
  db.prepare('DELETE FROM leave WHERE date = ?').run(date);
  scheduler.recomputeForLeaveChange(date);
  return { date };
}

function isOnLeave(date) {
  return !!getDb().prepare('SELECT 1 FROM leave WHERE date = ?').get(date);
}

module.exports = { list, create, remove, isOnLeave };
