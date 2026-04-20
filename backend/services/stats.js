const { getDb } = require('../db');

function monthlyIncome(fromMonth, toMonth) {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-%m', completed_at) AS month, SUM(unit_price) AS income, COUNT(*) AS book_count
       FROM book
       WHERE status = 'completed' AND completed_at IS NOT NULL
         AND strftime('%Y-%m', completed_at) BETWEEN ? AND ?
       GROUP BY month ORDER BY month`
    )
    .all(fromMonth, toMonth);
}

function averagePrice(fromMonth, toMonth) {
  const rows = getDb()
    .prepare(
      `SELECT COUNT(*) AS cnt, AVG(unit_price) AS avg_price
       FROM book
       WHERE status = 'completed' AND completed_at IS NOT NULL
         AND strftime('%Y-%m', completed_at) BETWEEN ? AND ?`
    )
    .get(fromMonth, toMonth);
  return {
    count: rows.cnt || 0,
    avg_price: rows.avg_price ? Math.round(rows.avg_price * 100) / 100 : 0,
  };
}

function styleDistribution(fromMonth, toMonth) {
  return getDb()
    .prepare(
      `SELECT COALESCE(s.name, '未分类') AS style_name, COUNT(*) AS page_count
       FROM schedule sc
       JOIN page p ON p.id = sc.page_id
       JOIN book b ON b.id = sc.book_id
       LEFT JOIN style s ON s.id = p.style_id
       WHERE b.status = 'completed' AND sc.is_done = 1
         AND strftime('%Y-%m', b.completed_at) BETWEEN ? AND ?
       GROUP BY style_name ORDER BY page_count DESC`
    )
    .all(fromMonth, toMonth);
}

function completedBookCount(fromMonth, toMonth) {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-%m', completed_at) AS month, COUNT(*) AS cnt
       FROM book
       WHERE status = 'completed' AND completed_at IS NOT NULL
         AND strftime('%Y-%m', completed_at) BETWEEN ? AND ?
       GROUP BY month ORDER BY month`
    )
    .all(fromMonth, toMonth);
}

function avgPageHoursTrend(fromMonth, toMonth) {
  return getDb()
    .prepare(
      `SELECT strftime('%Y-%m', sc.date) AS month,
              AVG(sc.actual_hours) AS avg_hours,
              COUNT(*) AS samples
       FROM schedule sc
       WHERE sc.is_done = 1 AND sc.actual_hours IS NOT NULL
         AND strftime('%Y-%m', sc.date) BETWEEN ? AND ?
       GROUP BY month ORDER BY month`
    )
    .all(fromMonth, toMonth);
}

function summary(fromMonth, toMonth) {
  return {
    monthly_income: monthlyIncome(fromMonth, toMonth),
    average_price: averagePrice(fromMonth, toMonth),
    style_distribution: styleDistribution(fromMonth, toMonth),
    completed_book_count: completedBookCount(fromMonth, toMonth),
    avg_page_hours: avgPageHoursTrend(fromMonth, toMonth),
  };
}

module.exports = {
  monthlyIncome,
  averagePrice,
  styleDistribution,
  completedBookCount,
  avgPageHoursTrend,
  summary,
};
