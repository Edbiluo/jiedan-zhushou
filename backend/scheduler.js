const dayjs = require('dayjs');
const { getDb } = require('./db');

/**
 * 排期算法 v3 —— First-Fit-Decreasing + EDF（画页级整块打包）
 * ============================================================
 * 为什么换算法？
 *   v2 用 "EDF + water-filling" 把每本书的总工时按小时粒度均匀撒到窗口里，结果每一页被
 *   切成 0.15h/0.3h 之类的碎片分散到十几天。用户看日历时感觉"没排期"——明明画一页只要
 *   2 小时却跨了 10 天。用户要的是：**每天完整画完若干张画页**，estimated_hours 真正作为
 *   "这一页要占满这一天多少小时"的核心指标。
 *
 *   于是把调度目标从"均匀分布"改成"整块装箱"：每个画页视为一个不可分割的 job（h_p =
 *   estimated_hours），每天是一个容量为 cap_d 的 bin，在 EDF 顺序下用 First-Fit 把画页
 *   放入 [today, deadline_p] 中第一个装得下的 bin。这是经典 Bin-Packing 的变体。
 *
 * 为什么不用可抢占 LP？
 *   LP 最优解（water-filling）是连续松弛，碎片太多用户体验差。本场景的 job 粒度（~1~8h）
 *   与 bin 容量（~8h）同数量级，整数装箱完全可行，近似比可控。
 *
 * FFD 的近似比？
 *   First-Fit-Decreasing 在经典 bin-packing 上有 11/9·OPT + 6/9 的上界（Dósa 2007），
 *   通俗近似比约 4/3 OPT。在本场景更有利：EDF 已把"哪些 job 进哪段时间"定了，每段
 *   再 First-Fit 顶多多用 1~2 个 bin（也即多占 1~2 天），但因为 deadline 是软上限而非硬
 *   约束（超过会 overrun 标红），真正用户感知的只是"看起来顺眼"。
 *
 * 新算法（画页为主单位）：
 *   Step 0. 加载 active books、画页、locked schedule（is_user_override=1 或 is_done=1）。
 *           初始化 [today..maxDeadline] 日容量数组：leave→0；day_work_hours[d] 覆盖；
 *           否则 default 8h。从容量里扣除 locked 行的 planned_hours。
 *
 *   Step 1. 计算每画页已 locked 工时 C_p = Σ(locked 行 planned_hours)，剩余 R_p =
 *           estimated_hours - C_p。过滤 R_p > 0 的画页。
 *
 *   Step 2. 全局排序画页：
 *             key = (book.deadline ASC, book.id ASC, page.is_cover DESC,
 *                    bp.sort_order ASC, page.id ASC)
 *           这天然融合了 EDF（book.deadline ASC）和同本书内"封页优先 + 用户排序"。
 *
 *   Step 3. 对每个画页 p（剩余 R_p，deadline D_p）：
 *             a. 在 [today, D_p] 找第一个 cap_d >= R_p 的 d*（First-Fit）。
 *             b. 找到 → 写 schedule(d*, book, page, R_p)；cap[d*] -= R_p。
 *             c. 找不到 → 切片 fallback：从 today 起逐日塞 min(R_p_remain, cap[d])，
 *                直到塞完或窗口耗尽。
 *             d. 窗口耗尽仍有残余 → 硬塞 deadline 当天作为 overrun。
 *
 *   Step 4. 事务性：DELETE FROM schedule WHERE is_user_override=0 AND is_done=0；
 *           INSERT 所有新行。
 *
 * 何时 fallback 到切片？
 *   当画页 estimated_hours > 该画页窗口内任何单日剩余容量时。例如一张 12h 的封面，
 *   deadline 3 天后，每天 default 8h → 没有单日装得下 12h，就按 8h + 4h 切成两天。
 *
 * 何时 overrun（硬塞 deadline）？
 *   当 [today, deadline_p] 窗口的总剩余容量 < R_p 时，把最后的残余塞进 deadline 当天，
 *   books.js/computeStatus 会把 status 标红（overdue/near_deadline），UI 自然高亮。
 *
 * 关键不变式：
 *   (I1) is_user_override=1 的 schedule 行永不删/改，且 planned_hours 从容量扣除。
 *   (I2) is_done=1 的 schedule 行永不删/改，且 planned_hours 从容量扣除（v3 新增约束）。
 *        语义：用户填过当日进度被算"完成"，再次重排不应动它。没填进度=默认完成=不会
 *        写 is_done=1，下次重排可自由调整（所以默认完成的日子不会被锁）。
 *        只有用户主动标"未完成"触发的重排才会把某页打回未完成池。
 *   (I3) 对每个画页，Σ(locked planned_hours) + Σ(新写 planned_hours) = estimated_hours，
 *        除非触发 overrun（此时总和 = estimated_hours，但最后一块塞在 deadline 当天）。
 *   (I4) 画页优先整块放在一天；放不下才切（Step 3b 优先于 3c）。
 *   (I5) 同本书内封面优先，再按 bp.sort_order；多本按 EDF (deadline ASC, id ASC) 公平。
 *
 * 复杂度：
 *   O(P · D) worst case，P=总画页数、D=规划天数。实际 P<500、D<180 → 毫秒级。
 *
 * 签名兼容：
 *   regenerate(bookId, opts) → regenerateAll(opts)（单本触发全局重排，和 v2 一致）
 *   recomputeForLeaveChange(date) → regenerateAll()
 *   suggestForBook(bookId) 保持不变
 */

const DEFAULT_DAILY_HOURS = 8;
const EPSILON = 1e-6;

// ---------- 基础查询 ----------

function getDailyHoursFor(dateStr, dwhMap, defaultHours) {
  if (Object.prototype.hasOwnProperty.call(dwhMap, dateStr)) return dwhMap[dateStr];
  return defaultHours;
}

function loadDailyHoursMap() {
  const rows = getDb().prepare('SELECT date, hours FROM day_work_hours').all();
  const m = {};
  for (const r of rows) m[r.date] = r.hours;
  return m;
}

function loadLeaveSet() {
  const rows = getDb().prepare('SELECT date FROM leave').all();
  return new Set(rows.map((r) => r.date));
}

function loadDefaultHours() {
  const def = getDb()
    .prepare("SELECT value FROM settings WHERE key = 'default_daily_hours'")
    .get();
  return def ? parseFloat(def.value) : DEFAULT_DAILY_HOURS;
}

// ---------- 主入口：全局重调度 ----------

function regenerateAll({ keepOverride = true } = {}) {
  const db = getDb();
  const dwhMap = loadDailyHoursMap();
  const leaveSet = loadLeaveSet();
  const defaultHours = loadDefaultHours();
  const today = dayjs().format('YYYY-MM-DD');

  // ---- 加载所有待排 book（未完成）----
  const books = db
    .prepare(
      `SELECT * FROM book WHERE status != 'completed' ORDER BY deadline ASC, id ASC`
    )
    .all();
  if (!books.length) return { ok: true, reason: 'no active books', books: 0 };

  // ---- 时间轴：today ~ max(deadline)（若已过期也仍延到 today）----
  let maxDeadline = today;
  for (const b of books) {
    if (dayjs(b.deadline).isAfter(dayjs(maxDeadline))) maxDeadline = b.deadline;
  }

  const dateList = [];
  {
    let cur = dayjs(today);
    const end = dayjs(maxDeadline);
    while (cur.isBefore(end) || cur.isSame(end, 'day')) {
      dateList.push(cur.format('YYYY-MM-DD'));
      cur = cur.add(1, 'day');
    }
  }
  if (!dateList.length) return { ok: true, reason: 'empty date range', books: books.length };

  const dateIndex = new Map(dateList.map((d, i) => [d, i]));

  // ---- 初始化每日容量 ----
  // 基础容量：leave 日 = 0；其它 = day_work_hours[d] ?? default
  const capacity = dateList.map((d) => {
    if (leaveSet.has(d)) return 0;
    const h = getDailyHoursFor(d, dwhMap, defaultHours);
    return h > 0 ? h : 0;
  });

  // ---- 预加载 locked schedule 行：is_user_override=1 或 is_done=1 都保留，且扣容量 ----
  // 注意：即使 keepOverride=false，is_done=1 也必须保留（用户已标记完成的工作不应被重排）。
  let lockedRows = [];
  if (keepOverride) {
    lockedRows = db
      .prepare('SELECT * FROM schedule WHERE is_user_override = 1 OR is_done = 1')
      .all();
  } else {
    lockedRows = db.prepare('SELECT * FROM schedule WHERE is_done = 1').all();
  }
  const lockedHoursByPage = new Map(); // page_id -> covered hours
  for (const r of lockedRows) {
    const idx = dateIndex.get(r.date);
    if (idx != null) {
      capacity[idx] = Math.max(0, capacity[idx] - (r.planned_hours || 0));
    }
    lockedHoursByPage.set(
      r.page_id,
      (lockedHoursByPage.get(r.page_id) || 0) + (r.planned_hours || 0)
    );
  }

  // ---- 扁平化：加载所有 active book 的画页到全局列表 ----
  // 使用一条 JOIN 查询获得 (book, page, bp.sort_order) 三元组，然后全局排序。
  const bookIds = books.map((b) => b.id);
  const placeholders = bookIds.map(() => '?').join(',');
  const rawPages = bookIds.length
    ? db
        .prepare(
          `SELECT
             b.id          AS book_id,
             b.deadline    AS deadline,
             p.id          AS page_id,
             p.is_cover    AS is_cover,
             p.estimated_hours AS estimated_hours,
             bp.sort_order AS bp_sort
           FROM book b
           JOIN book_page bp ON bp.book_id = b.id
           JOIN page p       ON p.id = bp.page_id
           WHERE b.id IN (${placeholders})`
        )
        .all(...bookIds)
    : [];

  // 过滤：deadline 已过期的 book 仍纳入（overrun 路径处理）；remain > 0 才规划。
  const plannable = [];
  for (const row of rawPages) {
    const est = row.estimated_hours || 1;
    const covered = lockedHoursByPage.get(row.page_id) || 0;
    const remain = Math.max(0, est - covered);
    if (remain <= EPSILON) continue;
    plannable.push({
      book_id: row.book_id,
      deadline: row.deadline,
      page_id: row.page_id,
      is_cover: row.is_cover ? 1 : 0,
      sort_order: row.bp_sort || 0,
      remain_hours: remain,
    });
  }

  // ---- 全局排序：EDF + 同书内封面优先 + sort_order + page_id 稳定 ----
  plannable.sort((a, b) => {
    if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
    if (a.book_id !== b.book_id) return a.book_id - b.book_id;
    if (a.is_cover !== b.is_cover) return b.is_cover - a.is_cover; // cover 先
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.page_id - b.page_id;
  });

  const writes = []; // {date, book_id, page_id, hours}
  const todayIdx = dateIndex.get(today) ?? 0;

  // ---- FFD 主循环：逐画页分配 ----
  for (const p of plannable) {
    const endIdx = dateIndex.get(p.deadline);
    if (endIdx == null || endIdx < todayIdx) {
      // deadline 已过：直接 overrun 到 deadline 当天（若超出时间轴范围则塞 today——极端兜底）
      const targetDate = endIdx != null ? dateList[endIdx] : dateList[todayIdx];
      writes.push({
        date: targetDate,
        book_id: p.book_id,
        page_id: p.page_id,
        hours: p.remain_hours,
      });
      continue;
    }

    const R = p.remain_hours;

    // Step 3a：First-Fit — 找窗口内第一个能整块装下的日子
    let placedIdx = -1;
    for (let i = todayIdx; i <= endIdx; i++) {
      if (capacity[i] + EPSILON >= R) {
        placedIdx = i;
        break;
      }
    }

    if (placedIdx >= 0) {
      // 整块放入
      capacity[placedIdx] -= R;
      if (capacity[placedIdx] < 0) capacity[placedIdx] = 0;
      writes.push({
        date: dateList[placedIdx],
        book_id: p.book_id,
        page_id: p.page_id,
        hours: R,
      });
      continue;
    }

    // Step 3c：切片 fallback — 画页本身 > 任何单日剩余容量
    let remain = R;
    for (let i = todayIdx; i <= endIdx && remain > EPSILON; i++) {
      if (capacity[i] <= EPSILON) continue;
      const take = Math.min(capacity[i], remain);
      capacity[i] -= take;
      remain -= take;
      writes.push({
        date: dateList[i],
        book_id: p.book_id,
        page_id: p.page_id,
        hours: take,
      });
    }

    // Step 3d：窗口总容量 < R → 硬塞 deadline 当天作为 overrun
    if (remain > EPSILON) {
      writes.push({
        date: dateList[endIdx],
        book_id: p.book_id,
        page_id: p.page_id,
        hours: remain,
      });
    }
  }

  // ---- 事务性写入 ----
  // 删除所有非 locked 行（is_user_override=0 AND is_done=0），再批量插入。
  const tx = db.transaction(() => {
    db.prepare(
      'DELETE FROM schedule WHERE is_user_override = 0 AND is_done = 0'
    ).run();
    const ins = db.prepare(
      `INSERT INTO schedule (date, book_id, page_id, planned_hours, is_user_override)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(date, book_id, page_id) DO UPDATE SET
         planned_hours = planned_hours + excluded.planned_hours`
    );
    for (const w of writes) {
      if (w.hours <= EPSILON) continue;
      const rounded = Math.round(w.hours * 100) / 100;
      if (rounded <= 0) continue;
      ins.run(w.date, w.book_id, w.page_id, rounded);
    }
  });
  tx();

  return { ok: true, books: books.length, rows: writes.length };
}

// ---------- 兼容签名：regenerate(bookId) / recomputeForLeaveChange(date) ----------
// 单本触发全局重排（毫秒级代价），保证多本间的容量竞争始终一致。

function regenerate(_bookId, opts = {}) {
  return regenerateAll(opts);
}

function recomputeForLeaveChange(_date) {
  return regenerateAll({ keepOverride: true });
}

function suggestForBook(bookId) {
  const rows = getDb()
    .prepare(
      `SELECT s.*, p.title AS page_title, p.is_cover, p.thumb_path
       FROM schedule s JOIN page p ON p.id = s.page_id
       WHERE s.book_id = ? ORDER BY s.date, s.id`
    )
    .all(bookId);
  return rows;
}

module.exports = {
  regenerate,
  regenerateAll,
  recomputeForLeaveChange,
  suggestForBook,
};
