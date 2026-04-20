# 接单助手 · 设计系统

**风格主题**：奶油蓝（Cream Blue）—— 温柔、现代、简洁，带一点点手写感。

## 基调原则

1. **留白优先** — 宽间距、大圆角，给心情留空间
2. **柔调不刺眼** — 低饱和度的蓝 + 奶油白，长时间看也舒服
3. **手写点缀** — 标题、关键数字用手写体，其他走简洁无衬线
4. **动效克制** — 仅关键时刻（完成、打开弹窗）加小动效，不干扰画画思路

## 文件索引

- [tokens/colors.md](tokens/colors.md) — 色板
- [tokens/typography.md](tokens/typography.md) — 字体
- [tokens/spacing.md](tokens/spacing.md) — 间距 & 圆角
- [components.md](components.md) — 核心组件规范
- [animations.md](animations.md) — 动效规范

## 主题切换

默认主题：**奶油蓝**（已实现）
预留主题槽位（后续可扩展）：
- 粉白（柔粉 + 米白）
- 暗色（护眼夜间）

主题通过切换 `<html>` 上的 CSS 变量根（data-theme 属性）实现，所有颜色均通过 `var(--color-xxx)` 引用。
