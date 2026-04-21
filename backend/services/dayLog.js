const { getDb } = require('../db');

function report(date, { notes = '' } = {}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO day_log (date, notes, reported_at) VALUES (?, ?, datetime('now','localtime'))
     ON CONFLICT(date) DO UPDATE SET notes = excluded.notes, reported_at = excluded.reported_at`
  ).run(date, notes);
  return db.prepare('SELECT * FROM day_log WHERE date = ?').get(date);
}

function isReported(date) {
  return !!getDb().prepare('SELECT 1 FROM day_log WHERE date = ?').get(date);
}

function get(date) {
  return getDb().prepare('SELECT * FROM day_log WHERE date = ?').get(date);
}

module.exports = { report, isReported, get };
