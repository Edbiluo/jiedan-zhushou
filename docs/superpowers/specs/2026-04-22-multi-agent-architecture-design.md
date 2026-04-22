# 多 Agent 架构设计 · 接单助手

**日期**: 2026-04-22  
**状态**: 待实现

---

## 背景

原有架构中 5 个 teammate 基本不活跃，所有代码由 team-lead 单独完成，token 消耗高且协作无效。新架构目标：PM 专注对话与任务拆解，coding agents 专注代码实现，通过廉价模型降低整体 token 开销。

---

## 整体架构

```
用户
  ↓ 对话
包子（PM · 当前主会话 · 高端模型）
  ├── 只读 .claude/project-structure.md
  ├── 生成 todolist
  └── 调用 Agent 工具 → coding agent（claude-3-5-haiku-20241022）
                             ├── 读写源代码文件
                             ├── 完成后更新 project-structure.md
                             └── 返回完成摘要给包子
```

**核心原则**：
- 包子不写任何源代码，只读结构文件 + 派发任务
- Coding agent 使用 haiku 模型，负责所有文件读写
- `.claude/project-structure.md` 是唯一共享状态，PM 通过它掌握全局进度

---

## 项目结构文件格式

**路径**: `.claude/project-structure.md`

### 文件头（全局进度表）

```markdown
# 项目结构 · 接单助手
更新时间: YYYY-MM-DD HH:MM

## 进度总览
- ✅ 完成: N 个文件
- 🔄 进行中: N 个文件
- 📋 待开发: N 个文件
- 当前 sprint: [描述]
```

### 每个文件条目

```markdown
## path/to/file.js
**状态**: ✅ 完成 | 🔄 进行中 | 📋 待开发
**功能**: 一句话描述文件的职责
**对外接口**: 暴露的函数/组件/API 端点列表
**关键依赖**: 直接依赖的其他文件
**最后更新**: YYYY-MM-DD · 改动摘要
```

---

## 结构文件同步机制

**维护责任**: coding agent 是唯一有写权限的角色，每次完成任务后必须更新结构文件。

**强制执行**: coding agent 的每个 prompt 末尾包含以下指令：

```
任务完成后，必须执行最后一步：
1. 更新 .claude/project-structure.md 中涉及文件的状态/接口/依赖描述
2. 更新顶部进度总览的数字
3. 写入"最后更新"时间戳 + 本次改动摘要
如果跳过这一步，视为任务未完成。
```

**包子的验证**: 收到 coding agent 返回摘要后，检查结构文件的"最后更新"时间戳是否刷新。若未刷新，重新派发任务并追加指令"补全结构文件更新"。

**文件内容约束**: 结构文件只记录稳定事实（已完成的接口、依赖），不记录临时中间状态。

---

## 包子 → Coding Agent 交接协议

包子调用 `Agent` 工具时传入的 prompt 结构：

```
[.claude/project-structure.md 完整内容]

---

## 本次任务 Todolist

1. 【frontend】具体任务描述
2. 【backend】具体任务描述
3. ...

## 约束
- 只读写源代码，不修改 .claude/ 目录（project-structure.md 除外）
- 完成所有任务后更新 .claude/project-structure.md
- 返回：每条 todo 的完成状态 + 结构文件已更新确认
```

**任务标注规范**: 每条 todo 标注模块 `【frontend】【backend】【electron】【shared】`，coding agent 自行判断涉及哪些文件。

**串行派发**: 每次只派一个 coding agent，避免多 agent 并发写结构文件冲突。

---

## 包子的 CLAUDE.md 配置

项目根目录 `CLAUDE.md` 定义包子的行为边界（行为指令层）。硬性工具封锁需在 `.claude/settings.json` 的 `permissions.deny` 中配置（见实现计划）。

```markdown
# 包子 PM 规范

## 角色
项目经理。负责和用户对话、理解需求、拆解任务。不写代码，不修改任何源文件。

## 每次对话开始
必须先 Read .claude/project-structure.md，掌握当前进度后再回复用户。

## 可用工具
- Read：只读 .claude/project-structure.md
- Agent：派发任务给 coding agent（model: claude-3-5-haiku-20241022）
- TodoWrite：记录本次 todolist

## 禁止操作
- Edit / Write 任何源代码文件
- Bash（仅允许 git log / git status 查询进度）
- 直接修改 frontend/ backend/ electron/ 下的任何文件

## 派发任务
将结构文件全文 + todolist + 约束一起传入 Agent prompt。
收到返回后检查结构文件时间戳，若未更新则重新派发。
```

---

## 初始化流程

现有项目已有 66 个文件，需要一次性扫描录入结构文件：

1. **用户在当前会话**对包子说"初始化项目结构文件"，包子调用 Agent 工具启动一个一次性扫描 agent
2. 扫描 agent（haiku）读取所有源文件，生成完整的 `.claude/project-structure.md`
3. 包子读取生成结果并展示摘要给用户
4. 用户确认内容无误后，正式启用新架构

---

## 模型配置

| 角色 | 模型 | 用途 |
|------|------|------|
| 包子（PM） | 当前会话模型（高端） | 对话、理解需求、任务拆解 |
| Coding agent | claude-3-5-haiku-20241022 | 文件读写、代码实现 |
