# 排期算法说明 v3

## 方案名
**First-Fit-Decreasing + EDF（画页级整块打包）**

每个画页 `estimated_hours` 作为不可分割 job，每天 `cap_d` 作为 bin，按 EDF 顺序
把画页一张一张塞进"第一个装得下"的日子。替代 v2 的 "EDF + water-filling" 实现。

## 为什么放弃可抢占 LP（water-filling）？
v2 的 water-filling 把每本书总工时按"最均匀"切到窗口每一天，数学上是凸 LP 的 KKT 闭式解，
L2 意义上最均匀。但真实交付后用户反馈：**每天 0.15h 的碎片让人感觉"没排期"**——明明
画一页只要 2 小时却要跨 10 天，`estimated_hours` 这个核心指标完全被平均化淹没。

可抢占模型在工时粒度远小于日容量时才美观，本场景单页通常 1~8h、日容量 8h，属于**同
数量级整数装箱**，根本不需要连续松弛。用户真正要的是"今天完整画完 3 张封面、明天
画 4 张内页"，而不是每天被均匀摊成 0.X 小时碎片。

## FFD 的近似比
经典 Bin-Packing 的 First-Fit-Decreasing 上界：`11/9·OPT + 6/9`（Dósa 2007），
通俗近似比 ~4/3 OPT。在本场景更有利：EDF 把"哪些 job 进哪段时间"先定好，FFD 仅在
每段内决定"哪一天装哪页"，最多比 OPT 多占 1~2 个 bin（1~2 天）。

由于 deadline 是软上限（超出触发 overrun 标红而非拒绝），实际 UX 感知上 FFD 的
次优性几乎不可见，但视觉上"每日完整画页数量"的收益是巨大的。

## 算法四段
1. **加载与容量初始化** — leave=0；day_work_hours[d] 覆盖；否则 default 8h。
2. **锁定扣减** — 把 `is_user_override=1` **或** `is_done=1` 的 schedule 行留着不动，
   且其 `planned_hours` 从对应日容量扣除。
3. **全局排序画页**（EDF + 稳定次序）：
   ```
   key = (book.deadline ASC, book.id ASC,
          page.is_cover DESC, bp.sort_order ASC, page.id ASC)
   ```
4. **逐页 First-Fit 分配**，剩余工时 R_p，deadline D_p：
   - 先在 `[today, D_p]` 找第一个 `cap_d >= R_p` 的日子 → 整块放入；
   - 否则切片：从 today 起逐日塞 `min(R_p_remain, cap_d)`；
   - 窗口总容量 < R_p → 硬塞 deadline 当天作为 overrun。

## 完成机制（v3 新增语义）
- **没填当日进度 = 默认完成** → 不会写 `is_done=1`，下次重排可自由调整该画页排期。
- **用户主动标"未完成"** → 删除该画页当天的 `is_done=1` schedule（由 service 层处理），
  触发 `regenerateAll()` 把这张画页的剩余工时重新塞回未完成池。
- **`is_done=1` 的行永远不动** → 这是 v2 没有的不变式。确保"今天画完了一页、明天新增
  一本书触发全局重排"时，今天完成的工时不会被重新洗牌。

## Fallback 场景
- **单页 > 窗口内任何单日容量**（例如 12h 的画页、每天 8h）→ 触发**切片 fallback**：
  按天消费容量，例如 8h + 4h 跨两天。
- **窗口总容量 < R_p**（例如 deadline 3 天后、每天 8h、但这一页 30h）→ 窗口填满后
  残余塞 deadline 当天，产生 **overrun**。`books.js/computeStatus` 标红。
- **deadline 已过期**（今日 > deadline）→ 直接把整张画页塞到 deadline 当天作为 overrun。

## 关键不变式
- **I1**：`is_user_override=1` 的行永不删/改，且 `planned_hours` 从容量扣除。
- **I2**：`is_done=1` 的行永不删/改，且 `planned_hours` 从容量扣除。**(v3 新增)**
- **I3**：对每个画页，`Σ locked.planned_hours + Σ 新 planned_hours = estimated_hours`
  （除非 overrun 时最后一块塞在 deadline 当天）。
- **I4**：画页优先整块放在一天；放不下才切（FFD 的 first-fit 规则）。
- **I5**：同本书内封面优先，再按 `bp.sort_order`；多本按 EDF `(deadline ASC, id ASC)` 公平。

## 复杂度
`O(P · D)` worst case，P=总画页数、D=规划天数。实际 P<500、D<180 → 毫秒级。

## 测试场景建议
1. **每日整块** — 3 张 2h 画页 + 每天 8h → 今天一天排完 3 页、日工时 6h（剩 2h 空闲）。
2. **EDF 切换** — 书 A deadline=D+3（3×4h），书 B deadline=D+10（5×6h）→ 前 2 天排 A 的
   3 张（4+4+4 跨三天各 4h 填不满 8h，剩余容量 FFD 后会被 B 占用）。
3. **锁定共存** — 某画页昨天标了 `is_done=1` 占 5h → 对应日容量扣 5h、该画页从未完成
   池移除、其它画页绕开该日。
4. **用户覆盖** — 用户拖拽某画页到 D+2 占 4h（`is_user_override=1`）→ 同样扣容量 + 不重排。
5. **Override + Done 同画页**（部分完成）— 某页 estimated=8h，用户覆盖 3h 在 D+1 又标 done
   2h 在 D+2 → 剩余 3h 进入 FFD 池，会找第一个能装 3h 的日子整块放。
6. **切片 fallback** — 1 张 12h 画页，deadline 7 天后，default 8h → 今天 8h + 明天 4h。
7. **Overrun** — 1 张 30h 画页，deadline 3 天后 → 每天 8h 塞满、deadline 当天塞 6+x overrun。
8. **请假穿插** — 10 天内 2 天请假 → 画页跳过请假日找下一个能装下的日子。

## 与 v2 的差别
| 维度 | v2 (Water-filling) | v3 (FFD + EDF) |
|------|-------------------|----------------|
| 分配粒度 | 连续工时（0.15h 碎片常见） | 整张画页（默认不切） |
| 目标函数 | L2 最均匀 | 每日完整画页数量最大化 |
| estimated_hours 作用 | 被平均化稀释 | 核心打包单位 |
| 锁定条件 | 只 is_user_override | is_user_override **或** is_done |
| 切片时机 | 总是切 | 仅当单页 > 单日容量 |
| 近似比 | LP 最优 | 4/3 OPT |

## 调用兼容性
- `regenerate(bookId, opts)` → 转发到 `regenerateAll(opts)`
- `regenerateAll(opts)` → 主入口
- `recomputeForLeaveChange(date)` → 转发到 `regenerateAll({ keepOverride: true })`
- `suggestForBook(bookId)` → 保持不变

`backend/services/books.js` / `schedules.js` / `leaves.js` 调用点零修改。

## 已知权衡
- **FFD 非最优**：极少数情况下会比 water-filling 多占 1~2 天（例如两张 5h 画页 + 1 天 8h 容量，
  FFD 会拆到两天、而 LP 会"5+3 + 2"切成两天，视觉上其实 FFD 更好）。
- **Overrun 不会自动拒绝新增**：窗口容量不够仍会写入 deadline 当天，交由前端红色高亮提示
  用户介入（不主动拒单，保留用户决策权）。
- **多本共享容量的"饥饿"**：极端下一本 deadline 极近的大书会把多天容量吃光，后面 deadline
  稍晚的书需要等它排完才有位置——这正是 EDF 的语义，符合期望。
