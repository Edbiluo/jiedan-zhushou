# 多 Agent 架构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 PM（包子）+ Coding Agent 分层架构，PM 只读结构文件 + 派发任务，Coding Agent 用 haiku 模型负责所有代码读写。

**Architecture:** 当前主会话即 PM，通过 Agent 工具动态启动 coding agents。PM 的上下文来源只有 `.claude/project-structure.md` 一个文件。Coding agent 完成任务后更新结构文件并通知 PM。

**Tech Stack:** Claude Code Agent tool, claude-3-5-haiku-20241022 (coding agents), `.claude/project-structure.md` (共享状态)

> **关于硬性权限封锁**：spec 提到通过 `settings.json` `permissions.deny` 限制 PM 的工具。但 deny 规则会被子 agent（coding agent）继承，导致 coding agent 也无法写文件。因此本计划**只用 CLAUDE.md 行为指令**来约束 PM，不添加 deny 规则。

---

## File Map

| 操作 | 文件 | 说明 |
|------|------|------|
| Create | `CLAUDE.md` | PM + coding agent 双角色行为规范 |
| Create | `.claude/project-structure.md` | 项目结构索引（由初始化扫描 agent 生成） |

---

### Task 1: 创建 CLAUDE.md（PM + coding agent 双角色规范）

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: 写入 CLAUDE.md**

内容如下（完整写入，不省略）：

```markdown
# 接单助手

## 项目概览
画师接单管理桌面工具。技术栈：Electron + Vue 3 + Vite + TypeScript + Tailwind CSS + SQLite (better-sqlite3) + Express + ECharts。
数据路径：`%APPDATA%/jiedan-zhushou/`。

---

## 如果你是包子（PM）

你是项目经理，负责和用户对话、理解需求、拆解任务。**你不写代码，不修改任何源文件。**

### 每次对话开始
必须先 `Read .claude/project-structure.md`，掌握当前进度后再回复用户。如果文件不存在，告知用户需要先执行初始化（见下方"初始化指令"）。

### 可用工具
- **Read**：只读 `.claude/project-structure.md`
- **Agent**：派发任务给 coding agent（指定 model: claude-3-5-haiku-20241022）
- **TodoWrite**：记录本次 todolist
- **Bash**：只允许 `git log --oneline -10` 和 `git status`

### 禁止操作
- Edit / Write 任何 `frontend/` `backend/` `electron/` `shared/` `scripts/` 下的文件
- 直接修改 `.claude/project-structure.md`（只有 coding agent 才能写）
- 运行除 git log / git status 之外的任何 Bash 命令

### 派发任务的 prompt 模板

每次调用 Agent 工具时，prompt 严格按以下结构组织：

```
你是 coding agent，工作目录 c:/Users/17622/Desktop/接单助手。
请先读取 .claude/project-structure.md 了解项目全貌，再开始实现任务。

---

## 本次任务 Todolist

1. 【模块标签】具体任务描述
2. 【模块标签】具体任务描述

模块标签取值：【frontend】【backend】【electron】【shared】【scripts】

## 你的约束
- 你可以读写所有源代码文件
- 只修改任务明确提到的文件，不改无关代码
- 不修改 .claude/ 目录（project-structure.md 除外）
- 完成所有任务后必须更新 .claude/project-structure.md：
  1. 更新涉及文件的状态 / 接口 / 依赖描述
  2. 更新顶部进度总览数字
  3. 写入"最后更新"时间戳 + 本次改动摘要（一句话）
  如果跳过这步，视为任务未完成。
- 返回格式：每条 todo 的 ✅/❌ 状态 + "结构文件已更新：[时间戳]"
```

### 收到 coding agent 返回后
1. 检查返回内容里是否有"结构文件已更新"字样
2. 如果没有，立即重新 dispatch 同一个 coding agent，在 prompt 末尾追加：
   "上一步未更新结构文件，请补全 .claude/project-structure.md 并返回确认。"
3. 向用户汇报：完成的 todo 条目 + 结构文件更新时间戳

### 初始化指令
首次使用或结构文件丢失时，告知用户说"我需要先扫描项目初始化结构文件"，然后执行 Task 2 的初始化扫描。

---

## 如果你是 Coding Agent

你是代码实现者，负责实现 PM 下达的任务。你可以读写所有源代码文件。

### 工作流程
1. 先 `Read .claude/project-structure.md` 了解项目全貌
2. 逐条完成 todolist 中的任务
3. **最后必做**：更新 `.claude/project-structure.md`

### 结构文件更新规范
每次完成任务后：
1. 更新涉及文件的条目（状态 / 接口 / 依赖 / 最后更新）
2. 更新文件头的进度总览数字
3. 时间戳格式：`YYYY-MM-DD HH:MM · 一句话摘要`
如果跳过这步，视为任务未完成。

### 返回格式
```
## 完成报告
1. 【frontend】Calendar.vue 周高度自适应 ✅
2. 【backend】GET /api/stats/monthly 端点 ✅

结构文件已更新：2026-04-22 14:30
```
```

- [ ] **Step 2: 验证 CLAUDE.md 被正确加载**

在项目目录启动 Claude Code 新会话，第一条消息输入：
```
你现在处于什么角色？你的工具限制是什么？
```
预期回复应提到"我是包子（PM）""不能写代码""先读 .claude/project-structure.md"等关键词。

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: 添加 PM + coding agent 双角色 CLAUDE.md 规范"
```

---

### Task 2: 初始化 `.claude/project-structure.md`

**Files:**
- Create: `.claude/project-structure.md`（由 Agent 调用生成）

本 Task 由 PM（包子）在对话中执行，不是直接写文件。

- [ ] **Step 1: 在当前会话对包子说以下内容，触发初始化扫描**

```
初始化项目结构文件
```

包子应调用 Agent 工具，传入以下 prompt（下方为完整 prompt，PM 复制使用）：

```
你是初始化扫描 agent，工作目录 c:/Users/17622/Desktop/接单助手。

任务：扫描项目所有源文件，生成完整的 .claude/project-structure.md。

需要扫描的文件（逐一 Read 后分析）：

【electron】
- electron/main.js
- electron/preload.js

【backend】
- backend/db.js
- backend/server.js
- backend/schema.sql
- backend/services/backup.js
- backend/services/books.js
- backend/services/dayLog.js
- backend/services/dayTasks.js
- backend/services/index.js
- backend/services/inspirations.js
- backend/services/leaves.js
- backend/services/pages.js
- backend/services/schedules.js
- backend/services/settings.js
- backend/services/sizes.js
- backend/services/stats.js
- backend/services/styles.js

【frontend】
- frontend/src/main.ts
- frontend/src/App.vue
- frontend/src/types/index.ts
- frontend/src/api/client.ts
- frontend/src/api/index.ts
- frontend/src/router/index.ts
- frontend/src/utils/palette.ts
- frontend/src/stores/books.ts
- frontend/src/stores/dayTasks.ts
- frontend/src/stores/inspirations.ts
- frontend/src/stores/pages.ts
- frontend/src/stores/schedule.ts
- frontend/src/stores/settings.ts
- frontend/src/stores/stats.ts
- frontend/src/layouts/MainLayout.vue
- frontend/src/components/BookCard.vue
- frontend/src/components/Confetti.vue
- frontend/src/components/PageCard.vue
- frontend/src/components/PageEditModal.vue
- frontend/src/components/ReminderModal.vue
- frontend/src/components/UpdateBadge.vue
- frontend/src/pages/BookDetail.vue
- frontend/src/pages/Books.vue
- frontend/src/pages/Calendar.vue
- frontend/src/pages/Inspirations.vue
- frontend/src/pages/Pages.vue
- frontend/src/pages/Settings.vue
- frontend/src/pages/Stats.vue
- frontend/vite.config.ts
- frontend/tailwind.config.js

【scripts & root】
- scripts/dev-electron.js
- scripts/publish-release.js
- package.json

对每个文件 Read 内容后，分析：
- 文件功能（一句话）
- 对外暴露的函数/组件/API 端点（具体名称，不要泛化）
- 关键依赖（只列直接依赖，最多 5 个）

生成 .claude/project-structure.md，严格按以下格式：

---
（文件开头无空行）
# 项目结构 · 接单助手
更新时间: 2026-04-22

## 进度总览
- ✅ 完成: 50 个文件（此处填实际数量）
- 🔄 进行中: 0 个文件
- 📋 待开发: 0 个文件
- 当前 sprint: 初始化完成

---

## electron/main.js
**状态**: ✅ 完成
**功能**: （一句话）
**对外接口**: （具体函数/IPC频道名列表，每行一个）
**关键依赖**: （文件路径列表）
**最后更新**: 2026-04-22 · 初始化扫描

（其他文件依此格式，按上方扫描顺序排列）
---

使用 Write 工具写入文件。完成后回复：
"结构文件已生成，共 N 个文件条目，路径：.claude/project-structure.md"
```

- [ ] **Step 2: 验证生成结果**

包子收到 agent 回复后，执行 `Read .claude/project-structure.md`，检查：
- 文件头有"更新时间"和"进度总览"
- 至少包含 40 个文件条目（`##` 开头）
- 每个条目有状态/功能/对外接口/关键依赖/最后更新 5 个字段
- 没有空白字段（不能有"暂无"或"N/A"等占位符）

如果条目不足或有空字段，重新触发扫描 agent 补全缺失文件。

- [ ] **Step 3: Commit 结构文件**

```bash
git add .claude/project-structure.md
git commit -m "feat: 初始化项目结构索引文件（50个文件条目）"
```
（提交信息中的数字改为实际条目数）

---

### Task 3: 端到端验证（试跑一个真实小任务）

验证整个 PM → coding agent → 结构文件更新的完整链路。

- [ ] **Step 1: 选一个低风险改动作为验证任务**

推荐：在 `backend/server.js` 末尾加一条注释 `// 架构v2 initialized`，验证 coding agent 能正确改文件并更新结构文件。

- [ ] **Step 2: 包子用标准模板派发任务**

PM 调用 Agent 工具，prompt：

```
你是 coding agent，工作目录 c:/Users/17622/Desktop/接单助手。
请先读取 .claude/project-structure.md 了解项目全貌，再开始实现任务。

---

## 本次任务 Todolist

1. 【backend】在 backend/server.js 文件末尾最后一行追加注释：// 架构v2 initialized

## 你的约束
- 你可以读写所有源代码文件
- 只修改任务明确提到的文件，不改无关代码
- 不修改 .claude/ 目录（project-structure.md 除外）
- 完成所有任务后必须更新 .claude/project-structure.md：
  1. 更新涉及文件的状态 / 接口 / 依赖描述
  2. 更新顶部进度总览数字
  3. 写入"最后更新"时间戳 + 本次改动摘要（一句话）
  如果跳过这步，视为任务未完成。
- 返回格式：每条 todo 的 ✅/❌ 状态 + "结构文件已更新：[时间戳]"
```

- [ ] **Step 3: 验证 coding agent 的返回**

预期返回包含：
```
1. 【backend】backend/server.js 末尾追加注释 ✅
结构文件已更新：2026-04-22 HH:MM
```

- [ ] **Step 4: 包子验证结构文件时间戳已刷新**

`Read .claude/project-structure.md`，确认：
- `## backend/server.js` 条目的"最后更新"时间戳已更新
- 顶部"更新时间"已刷新

若未更新，重新 dispatch 追加指令："请补全 .claude/project-structure.md 中 backend/server.js 的更新，并返回确认。"

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: 验证多 agent 架构端到端链路"
```

---

## 完成标准

- [ ] `CLAUDE.md` 存在，新对话中包子自动读结构文件
- [ ] `.claude/project-structure.md` 存在，包含 40+ 文件条目，每条有完整 5 个字段
- [ ] 端到端验证：coding agent 完成任务 + 结构文件时间戳刷新
