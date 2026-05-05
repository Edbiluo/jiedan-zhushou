const { getDb } = require('../db');

function monthlyIncome(fromDate, toDate) {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-%m', completed_at) AS month, SUM(unit_price) AS income, COUNT(*) AS book_count
       FROM book
       WHERE status = 'completed' AND completed_at IS NOT NULL
         AND date(completed_at) BETWEEN ? AND ?
       GROUP BY month ORDER BY month`
    )
    .all(fromDate, toDate);
}

function averagePrice(fromDate, toDate) {
  const rows = getDb()
    .prepare(
      `SELECT COUNT(*) AS cnt, AVG(unit_price) AS avg_price
       FROM book
       WHERE status = 'completed' AND completed_at IS NOT NULL
         AND date(completed_at) BETWEEN ? AND ?`
    )
    .get(fromDate, toDate);
  return {
    count: rows.cnt || 0,
    avg_price: rows.avg_price ? Math.round(rows.avg_price * 100) / 100 : 0,
  };
}

function styleDistribution(fromDate, toDate) {
  // v2：款式从 book.style_id 取（本级）
  return getDb()
    .prepare(
      `SELECT COALESCE(s.name, '未分类') AS style_name, COUNT(*) AS page_count
       FROM book b
       LEFT JOIN style s ON s.id = b.style_id
       WHERE b.status = 'completed' AND b.completed_at IS NOT NULL
         AND date(b.completed_at) BETWEEN ? AND ?
       GROUP BY style_name ORDER BY page_count DESC`
    )
    .all(fromDate, toDate);
}

function completedBookCount(fromDate, toDate) {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-%m', completed_at) AS month, COUNT(*) AS cnt
       FROM book
       WHERE status = 'completed' AND completed_at IS NOT NULL
         AND date(completed_at) BETWEEN ? AND ?
       GROUP BY month ORDER BY month`
    )
    .all(fromDate, toDate);
}

function pendingIncome() {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS cnt, SUM(unit_price) AS amount
       FROM book
       WHERE status != 'completed'`
    )
    .get();
  return {
    count: row.cnt || 0,
    amount: row.amount || 0,
  };
}

function monthlyComparison(fromDate, toDate) {
  const completedRows = getDb()
    .prepare(
      `SELECT strftime('%Y-%m', completed_at) AS month, SUM(unit_price) AS completed_amount
       FROM book
       WHERE status = 'completed' AND completed_at IS NOT NULL
         AND date(completed_at) BETWEEN ? AND ?
       GROUP BY month ORDER BY month`
    )
    .all(fromDate, toDate);

  const pendingRows = getDb()
    .prepare(
      `SELECT strftime('%Y-%m', created_at) AS month, SUM(unit_price) AS pending_amount
       FROM book
       WHERE status != 'completed'
         AND date(created_at) BETWEEN ? AND ?
       GROUP BY month ORDER BY month`
    )
    .all(fromDate, toDate);

  // Merge by month
  const monthMap = {};
  for (const r of completedRows) {
    monthMap[r.month] = monthMap[r.month] || { month: r.month, completed_amount: 0, pending_amount: 0 };
    monthMap[r.month].completed_amount = r.completed_amount || 0;
  }
  for (const r of pendingRows) {
    monthMap[r.month] = monthMap[r.month] || { month: r.month, completed_amount: 0, pending_amount: 0 };
    monthMap[r.month].pending_amount = r.pending_amount || 0;
  }

  return Object.values(monthMap)
    .map((m) => ({
      month: m.month,
      completed_amount: m.completed_amount,
      pending_amount: m.pending_amount,
      total_amount: m.completed_amount + m.pending_amount,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function summary(fromDate, toDate) {
  return {
    monthly_income: monthlyIncome(fromDate, toDate),
    average_price: averagePrice(fromDate, toDate),
    style_distribution: styleDistribution(fromDate, toDate),
    completed_book_count: completedBookCount(fromDate, toDate),
    avg_page_hours: [],
    pending_income: pendingIncome(),
    monthly_comparison: monthlyComparison(fromDate, toDate),
  };
}

module.exports = {
  monthlyIncome,
  averagePrice,
  styleDistribution,
  completedBookCount,
  pendingIncome,
  monthlyComparison,
  summary,
};
