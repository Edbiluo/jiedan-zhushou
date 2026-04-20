const { getDb } = require('../db');
const dayjs = require('dayjs');

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

function setDailyHours(date, hours) {
  getDb()
    .prepare(
      `INSERT INTO day_work_hours (date, hours) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET hours = excluded.hours`
    )
    .run(date, hours);
  return { date, hours };
}

function getDailyHours(date) {
  const row = getDb().prepare('SELECT hours FROM day_work_hours WHERE date = ?').get(date);
  return row ? row.hours : null;
}

module.exports = { report, isReported, get, setDailyHours, getDailyHours };
