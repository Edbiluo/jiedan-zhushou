# 接单助手

给接单画师用的桌面接单管理工具。

## 功能

- 📅 接单日历看板 — 每日排期一览
- 🖼️ 画页库 — 上传画页并标记款式/尺寸/时长
- 📖 本管理 — 以"本"为粒度创建订单、自动排期、手动调整
- 🌙 每日进度提醒 — 22:00 提醒当日进度填写
- 💰 稿费统计 — 月收入、件均价、款式占比、单页耗时趋势
- ⚙️ 设置 — 款式/尺寸维护、主题切换、备份导入导出

## 技术栈

- Electron + Vue 3 + Vite + TypeScript
- SQLite (better-sqlite3) 本地存储
- Express 内嵌后端
- ECharts 图表
- Tailwind CSS + 自研组件

## 开发

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build:win
```

产物：`release/接单助手-setup-x.x.x.exe`（安装版）+ `release/接单助手-portable-x.x.x.exe`（便携版）

## 数据

- 数据库：`%APPDATA%/jiedan-zhushou/app.db`
- 图片：`%APPDATA%/jiedan-zhushou/images/`
- 首次启动自动初始化
- 支持手动导出 / 导入（设置页）
