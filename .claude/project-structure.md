# 项目结构 · 接单助手
更新时间: 2026-04-22

## 进度总览
- ✅ 完成: 47 个文件
- 🔄 进行中: 0 个文件
- 📋 待开发: 0 个文件
- 当前 sprint: 初始化完成

---

## electron/main.js
**状态**: ✅ 完成
**功能**: Electron 主进程，初始化数据库、启动 Express 后端服务、注册 IPC 通道、管理应用生命周期和自动更新
**对外接口**: createWindow, getUserDataDir, ensureImageDirs, scheduleDailyReminder, setupAutoUpdater, registerIpc, app:showUnreportedToday, updater:checkNow, updater:quitAndInstall, app:version, file:pickImage, file:pickImages, file:exportBackup, file:importBackup
**关键依赖**: electron, backend/db, backend/server, backend/services
**最后更新**: 2026-04-22 · 初始化扫描

## electron/preload.js
**状态**: ✅ 完成
**功能**: Electron 预加载脚本，通过 context bridge 安全暴露 IPC 和文件操作 API 到渲染进程
**对外接口**: showUnreportedToday, pickImage, pickImages, exportBackup, importBackup, getFilePath, getVersion, checkUpdateNow, quitAndInstall, onUpdaterState
**关键依赖**: electron
**最后更新**: 2026-04-22 · 初始化扫描

## backend/db.js
**状态**: ✅ 完成
**功能**: SQLite 数据库初始化、连接管理、数据库迁移（v1→v2→v3）
**对外接口**: initDb, getDb, getDbPath, closeDb, migrateToV2, migrateToV3, runMigrations
**关键依赖**: better-sqlite3, fs, path
**最后更新**: 2026-04-22 · 初始化扫描

## backend/server.js
**状态**: ✅ 完成
**功能**: Express 后端服务器，定义 RESTful API 路由（settings, styles, sizes, pages, books, schedules, inspirations, day_tasks, leaves, day_log, stats）
**对外接口**: startServer, stopServer, buildRouter, wrap (error handler)
**关键依赖**: express, fs, path, backend/services
**最后更新**: 2026-04-22 · 初始化扫描

## backend/schema.sql
**状态**: ✅ 完成
**功能**: SQLite 数据库 schema 定义（11 个表：settings, style, size, page, book, book_page, schedule, leave, day_log, day_work_hours, inspiration, day_task）及预置数据
**对外接口**: 数据库表定义、索引、预置款式/尺寸/设置
**关键依赖**: SQLite
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/backup.js
**状态**: ✅ 完成
**功能**: 数据库和图片备份导出/导入 ZIP 包管理
**对外接口**: exportTo, importFrom
**关键依赖**: adm-zip, fs, path, backend/db
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/books.js
**状态**: ✅ 完成
**功能**: 本（book）管理：CRUD、状态计算（完成/逾期/快截止/进行中）、排期生成、页面关联
**对外接口**: list, getById, create, update, remove, markComplete, updateBookPageNote, reorderPages, hydrate, isBookDone, generateScheduleRows
**关键依赖**: backend/db, backend/services/settings, dayjs
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/dayLog.js
**状态**: ✅ 完成
**功能**: 每日完成情况日志记录（notes、报告时间戳）
**对外接口**: report, isReported, get
**关键依赖**: backend/db
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/dayTasks.js
**状态**: ✅ 完成
**功能**: 日程临时任务管理（创作/剪辑两种类型，关联灵感图）
**对外接口**: listByDate, listRange, create, update, remove, hydrate
**关键依赖**: backend/db
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/index.js
**状态**: ✅ 完成
**功能**: 所有服务模块的统一导出入口
**对外接口**: pages, books, schedules, leaves, stats, settings, styles, sizes, dayLog, backup, inspirations, dayTasks
**关键依赖**: 各子服务模块
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/inspirations.js
**状态**: ✅ 完成
**功能**: 灵感库（图片收藏）管理：上传、缩略图生成、笔记标注、搜索
**对外接口**: list, getById, create, update, remove, saveImage, saveImageFromBytes, imageDir
**关键依赖**: backend/db, sharp, uuid, fs, path
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/leaves.js
**状态**: ✅ 完成
**功能**: 请假/休息日管理，按日期范围查询
**对外接口**: list, create, remove, isOnLeave
**关键依赖**: backend/db
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/pages.js
**状态**: ✅ 完成
**功能**: 画页库管理：上传、分类（款式/尺寸/是否封面）、估时、缩略图生成、元数据
**对外接口**: list, getById, create, update, remove, saveImageFromPath, saveImageFromBytes, imageDir
**关键依赖**: backend/db, sharp, uuid, fs, path
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/schedules.js
**状态**: ✅ 完成
**功能**: 排期管理：日排期查询、范围查询、按本查询、进度报告、用户干预拖动、本级标完成
**对外接口**: listByDate, listRange, listByBook, reportProgress, overrideMove, markBookDoneOnDate
**关键依赖**: backend/db, dayjs
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/settings.js
**状态**: ✅ 完成
**功能**: 应用设置键值对管理（提醒时间、截止日期阈值、主题、通知开关、schema 版本）
**对外接口**: getAll, get, set, update
**关键依赖**: backend/db
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/sizes.js
**状态**: ✅ 完成
**功能**: 尺寸规格管理（CRUD、预置保护）
**对外接口**: list, create, update, remove
**关键依赖**: backend/db
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/stats.js
**状态**: ✅ 完成
**功能**: 稿费统计聚合（月度收入、平均单价、款式分布、完成本数）
**对外接口**: monthlyIncome, averagePrice, styleDistribution, completedBookCount, summary
**关键依赖**: backend/db
**最后更新**: 2026-04-22 · 初始化扫描

## backend/services/styles.js
**状态**: ✅ 完成
**功能**: 款式分类管理（CRUD、预置保护）
**对外接口**: list, create, update, remove
**关键依赖**: backend/db
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/main.ts
**状态**: ✅ 完成
**功能**: Vue 3 应用入口，初始化 Pinia、Vue Router、全局样式
**对外接口**: 应用初始化
**关键依赖**: vue, pinia, vue-router
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/App.vue
**状态**: ✅ 完成
**功能**: 根组件，加载全局设置、检查未报告日志、展示日志提醒modal
**对外接口**: checkUnreportedToday
**关键依赖**: frontend/src/layouts/MainLayout.vue, frontend/src/components/ReminderModal.vue, frontend/src/stores/settings
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/types/index.ts
**状态**: ✅ 完成
**功能**: TypeScript 类型定义文件（Style, Size, Page, Book, Schedule, DayTask, Leave, DayLog, Inspiration, Settings, StatsSummary）
**对外接口**: 导出 20+ 个 TS 类型和接口
**关键依赖**: 无
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/api/client.ts
**状态**: ✅ 完成
**功能**: HTTP 客户端基础（fetch 封装、API 基础 URL 处理、通用 request 函数、http 辅助函数）
**对外接口**: request, http (get, post, put, del)
**关键依赖**: 无
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/api/index.ts
**状态**: ✅ 完成
**功能**: API 端点统一导出（settings, styles, sizes, pages, books, schedules, leaves, dayLog, dayTasks, inspirations, stats）
**对外接口**: api 对象包含所有 CRUD 操作
**关键依赖**: frontend/src/api/client
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/router/index.ts
**状态**: ✅ 完成
**功能**: Vue Router 配置（7 页面路由：日历、本管理、画页库、创作中心、稿费统计、设置）
**对外接口**: router 实例，默认重定向 / 到 /calendar
**关键依赖**: vue-router
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/utils/palette.ts
**状态**: ✅ 完成
**功能**: 马卡龙色板定义和色卡选择函数（10 种本级色卡、任务类型色、状态色）
**对外接口**: bookPalette, bookGradient, bookSolid, bookInk, MACARON_PALETTE, TASK_PALETTE, STATUS_PALETTE
**关键依赖**: 无
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/stores/books.ts
**状态**: ✅ 完成
**功能**: 本管理状态存储（Pinia），支持列表加载、单本加载、创建、更新、删除、标完成
**对外接口**: useBooksStore (state: list, current; actions: reload, load, create, update, remove, complete)
**关键依赖**: pinia, frontend/src/api
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/stores/dayTasks.ts
**状态**: ✅ 完成
**功能**: 日程任务状态存储（Pinia），按日期分组、范围查询、CRUD、更新本地缓存
**对外接口**: useDayTasksStore (state: byDate; actions: loadDay, loadRange, create, update, remove)
**关键依赖**: pinia, frontend/src/api
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/stores/inspirations.ts
**状态**: ✅ 完成
**功能**: 灵感库状态存储（Pinia），支持关键字搜索、CRUD、加载状态管理
**对外接口**: useInspirationsStore (state: list, loading, keyword; actions: reload, create, update, remove)
**关键依赖**: pinia, frontend/src/api
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/stores/pages.ts
**状态**: ✅ 完成
**功能**: 画页库状态存储（Pinia），多维度过滤（款式/尺寸/封面/关键字）、CRUD、加载状态
**对外接口**: usePagesStore (state: list, filter, loading; actions: reload, create, update, remove)
**关键依赖**: pinia, frontend/src/api
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/stores/schedule.ts
**状态**: ✅ 完成
**功能**: 排期日历状态存储（Pinia），按日期分组、请假管理、进度报告、拖动任务、按本标完成
**对外接口**: useScheduleStore (state: byDate, leaves; actions: loadRange, loadDay, isLeave, requestLeave, cancelLeave, reportProgress, move, markBookDoneOnDate)
**关键依赖**: pinia, frontend/src/api, dayjs
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/stores/settings.ts
**状态**: ✅ 完成
**功能**: 应用设置与枚举值状态存储（Pinia），加载全局设置、款式列表、尺寸列表、提供 getter
**对外接口**: useSettingsStore (state: settings, styles, sizes, loaded; actions: load, update, addStyle, removeStyle, addSize, removeSize)
**关键依赖**: pinia, frontend/src/api
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/stores/stats.ts
**状态**: ✅ 完成
**功能**: 稿费统计数据存储（Pinia），加载日期范围内的统计汇总
**对外接口**: useStatsStore (state: summary; actions: load)
**关键依赖**: pinia, frontend/src/api
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/layouts/MainLayout.vue
**状态**: ✅ 完成
**功能**: 主布局组件，左侧导航栏（6 个主导航）、顶部页面标题栏、右侧内容区路由视图、自动更新徽章
**对外接口**: 导出主布局组件，集成导航和路由出口
**关键依赖**: vue-router, frontend/src/components/UpdateBadge.vue
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/components/BookCard.vue
**状态**: ✅ 完成
**功能**: 本卡片组件，展示本基本信息、状态、截止日期、进度条等
**对外接口**: 接收 book prop，emit 删除/编辑/完成事件
**关键依赖**: frontend/src/utils/palette
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/components/Confetti.vue
**状态**: ✅ 完成
**功能**: 彩带动画效果组件，本标完成时展示庆祝动画
**对外接口**: expose trigger()，响应式显示/隐藏动画
**关键依赖**: canvas-confetti 库
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/components/PageCard.vue
**状态**: ✅ 完成
**功能**: 画页卡片组件，展示页缩略图、标题、样式/尺寸、是否封面、估时等元数据
**对外接口**: 接收 page prop，emit 选择/删除事件
**关键依赖**: frontend/src/utils/palette
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/components/PageEditModal.vue
**状态**: ✅ 完成
**功能**: 画页编辑 modal，支持修改标题、款式、尺寸、封面标记、估时、笔记
**对外接口**: v-model 双向绑定，emit 更新事件
**关键依赖**: frontend/src/stores/settings
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/components/ReminderModal.vue
**状态**: ✅ 完成
**功能**: 每日完成情况提醒 modal，输入当日笔记、报告完成情况
**对外接口**: v-model 控制显示隐藏，emit 保存事件
**关键依赖**: frontend/src/api
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/components/UpdateBadge.vue
**状态**: ✅ 完成
**功能**: 自动更新徽章组件，显示更新可用状态、下载进度、安装提示
**对外接口**: 接收更新器事件监听，展示更新状态
**关键依赖**: electronAPI (preload.js 暴露)
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/pages/BookDetail.vue
**状态**: ✅ 完成
**功能**: 本详情页，展示本信息、关联页面列表、支持编辑、页面重排、标完成
**对外接口**: 路由参数 id，支持编辑和删除操作
**关键依赖**: frontend/src/stores/books, frontend/src/components/PageEditModal.vue
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/pages/Books.vue
**状态**: ✅ 完成
**功能**: 本管理页面，列表展示、按状态过滤、创建新本、搜索、跳转详情
**对外接口**: 支持本 CRUD、状态过滤、创建对话框
**关键依赖**: frontend/src/stores/books, frontend/src/components/BookCard.vue
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/pages/Calendar.vue
**状态**: ✅ 完成
**功能**: 日历看板，月度日历网格、日排期展示、进度报告、请假申请、任务拖拽、快速完成
**对外接口**: 交互式日历、排期管理、请假/任务管理
**关键依赖**: frontend/src/stores/schedule, frontend/src/stores/dayTasks, dayjs
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/pages/Inspirations.vue
**状态**: ✅ 完成
**功能**: 创作中心，灵感库查看、搜索、上传、删除、关联日任务
**对外接口**: 支持灵感 CRUD、拖拽上传、关键字搜索
**关键依赖**: frontend/src/stores/inspirations, frontend/src/stores/dayTasks
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/pages/Pages.vue
**状态**: ✅ 完成
**功能**: 画页库，页面库管理、多维过滤（款式/尺寸/封面/关键字）、上传、删除、拖拽选择作为本的页
**对外接口**: 支持页 CRUD、过滤、多选、关联本
**关键依赖**: frontend/src/stores/pages, frontend/src/stores/settings
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/pages/Settings.vue
**状态**: ✅ 完成
**功能**: 应用设置页，修改提醒时间、截止阈值、主题、款式/尺寸增删、数据备份/恢复
**对外接口**: 支持全局设置更新、枚举值管理、备份导出/导入
**关键依赖**: frontend/src/stores/settings, electronAPI
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/src/pages/Stats.vue
**状态**: ✅ 完成
**功能**: 稿费统计页，月度收入图表、平均单价、款式分布、完成本数趋势、日期范围选择
**对外接口**: 支持日期范围查询、统计数据展示
**关键依赖**: frontend/src/stores/stats
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/vite.config.ts
**状态**: ✅ 完成
**功能**: Vite 前端构建配置，Vue 3 插件、路径别名、开发服务器、API 代理、构建输出
**对外接口**: Vite 配置对象
**关键依赖**: vite, @vitejs/plugin-vue
**最后更新**: 2026-04-22 · 初始化扫描

## frontend/tailwind.config.js
**状态**: ✅ 完成
**功能**: Tailwind CSS 配置（主题颜色扩展）
**对外接口**: Tailwind 主题配置
**关键依赖**: tailwindcss
**最后更新**: 2026-04-22 · 初始化扫描

## scripts/dev-electron.js
**状态**: ✅ 完成
**功能**: 开发环境 Electron 启动脚本，等待前端就绪后启动 Electron 进程、清理 Claude 沙箱环境变量
**对外接口**: 独立运行脚本
**关键依赖**: child_process, electron
**最后更新**: 2026-04-22 · 初始化扫描

## scripts/publish-release.js
**状态**: ✅ 完成
**功能**: GitHub 发布脚本，清理代理环境变量、调用 electron-builder 构建并发布 Windows 安装包
**对外接口**: 独立运行脚本，读 .env.local 和系统环境
**关键依赖**: child_process, fs, path
**最后更新**: 2026-04-22 · 初始化扫描

## package.json
**状态**: ✅ 完成
**功能**: 项目元数据和依赖配置（名称 jiedan-zhushou、版本 0.3.1、npm scripts、electron-builder 配置、GitHub 发布配置）
**对外接口**: npm 脚本（dev, build, dev:frontend, dev:electron 等）
**关键依赖**: adm-zip, better-sqlite3, dayjs, electron-updater, express, sharp, uuid 及开发依赖
**最后更新**: 2026-04-22 · 初始化扫描
