# 接单助手 API 契约

Base URL：`http://localhost:3899/api`

所有响应统一格式：

```json
{ "ok": true,  "data": <any> }
{ "ok": false, "error": "错误消息" }
```

日期统一 `YYYY-MM-DD`，时间 `YYYY-MM-DD HH:mm:ss`。

---

## Settings

| Method | Path | 说明 |
|---|---|---|
| GET | /settings | 拿全部设置 KV |
| PUT | /settings | 批量更新 `{ key: value, ... }` |

预置键：`default_daily_hours` / `reminder_time` / `near_deadline_days` / `theme` / `notification_enabled` / `schema_version`

## Styles（款式）

| Method | Path | Body | 说明 |
|---|---|---|---|
| GET | /styles | — | 列出所有款式 |
| POST | /styles | `{ name, sort_order? }` | 新建（非预置） |
| PUT | /styles/:id | `{ name?, sort_order? }` | 编辑 |
| DELETE | /styles/:id | — | 删除（预置不可删） |

## Sizes（尺寸）
同上，path 改为 `/sizes`。

## Pages（画页）

```
GET /pages?style_id=&size_id=&is_cover=&keyword=
GET /pages/:id
POST /pages
  body: { title, src_path, style_id?, size_id?, is_cover?, estimated_hours?, note? }
PUT /pages/:id
  body: { title?, style_id?, size_id?, is_cover?, estimated_hours?, note? }
DELETE /pages/:id
```

画页分类约束：`is_cover=true` 时忽略 `style_id/size_id`。

## Books（本）

```
GET /books?status=
GET /books/:id
POST /books
  body: { title, unit_price, deadline, page_ids: number[], note? }
PUT /books/:id
  body: { title?, unit_price?, deadline?, page_ids?, note? }  // 改 page_ids 或 deadline 会触发重排
DELETE /books/:id
POST /books/:id/complete    // 手动标记本完成（所有 schedule 置 is_done=1）
```

状态 `status` 枚举：`in_progress | near_deadline | overdue | completed`（服务端每次读取自动重算）。

## Schedules（排期）

```
GET /schedules/date/:date         // 某天的排期
GET /schedules/range?start=&end=  // 日历视图
GET /schedules/book/:id           // 某本的全程排期
POST /schedules/:id/progress { actual_hours?, is_done?, note? }
POST /schedules/:id/move { date: "YYYY-MM-DD" }   // 用户拖拽覆盖
POST /schedules/recompute/book/:id
POST /schedules/recompute/all     // 每日触发（晚上），按进度重排后续
```

## Leaves（请假）

```
GET /leaves?start=&end=
POST /leaves  { date, reason? }   // 请假后自动触发重排
DELETE /leaves/:date
```

## Day Log / Daily Hours（每日进度 & 工时）

```
GET /day-log/:date              // 今日是否已填报
POST /day-log/:date { notes? }  // 填报（22:00 提醒对应动作）
GET /day-hours/:date
PUT /day-hours/:date { hours }  // 日历上手动调整今天/某天可用工时
```

## Stats（统计）

```
GET /stats/summary?from=YYYY-MM&to=YYYY-MM
// 返回：
{
  monthly_income: [{ month, income, book_count }],
  average_price: { count, avg_price },
  style_distribution: [{ style_name, page_count }],
  completed_book_count: [{ month, cnt }],
  avg_page_hours: [{ month, avg_hours, samples }]
}
```

## Health

```
GET /health → { ok: true, version: "0.1.0" }
```

---

## IPC（Electron 专属，preload 暴露在 `window.electronAPI`）

| API | 说明 |
|---|---|
| `showUnreportedToday()` | 启动时弹窗提醒用 |
| `pickImage()` | 打开系统文件选择，返回原图路径 |
| `exportBackup()` | 选保存位置导出 zip（含 db+images） |
| `importBackup()` | 选 zip 导入覆盖 |

前端上传画页流程：`pickImage()` → 拿到 src_path → `POST /pages { src_path, ... }`。
