# 核心组件规范

## Button

三档层级：primary / ghost / danger。

```html
<button class="btn-primary">主行动</button>
<button class="btn-ghost">次操作</button>
<button class="btn-danger">破坏性操作</button>
```

- 圆角 16px（`rounded-xl2`）
- 主按钮用 brand-400 底色 + 白字
- Ghost 用白底半透 + 墨色字
- `active:scale-95` 微缩反馈

## Card

通用容器：

```html
<div class="card">
  <h3 class="font-hand text-lg text-brand-700 mb-3">标题</h3>
  <p class="text-sm text-ink-700">内容</p>
</div>
```

- 白底 + `shadow-soft` + `p-5` + `rounded-xl2`
- hover 可微微上浮 `hover:-translate-y-1 hover:shadow-pop`

## Chip / Tag

状态类标签：

| class | 用途 |
|---|---|
| `.chip`        | 默认（奶油底 + 墨字） |
| `.chip-brand`  | 品牌强调 |
| `.chip-warn`   | 警告（快到交付） |
| `.chip-danger` | 危险（延期） |
| `.chip-done`   | 完成 |

## Input

```html
<input class="input" placeholder="..." />
<select class="input">...</select>
<textarea class="input" rows="3" />
```

- 圆角 16px，focus 时加 brand-100 光环

## Sidebar Item

导航菜单项 `.sidebar-item`：
- 普通态：奶油底悬浮
- 激活态：brand-400 底 + 白字

## 页面结构

```
┌──────────┬──────────────────────────┐
│ 侧栏     │ 顶栏 (页面标题)          │
│ (220px)  ├──────────────────────────┤
│          │ 主内容 (padding 32px)     │
│          │                          │
└──────────┴──────────────────────────┘
```

## 空态 (Empty State)

统一格式：

```html
<div class="text-center py-20 text-ink-500 font-hand">
  还没有画页，点上面按钮上传一张试试吧 ✿
</div>
```

用 `✿ ☕ 🎨` 等柔和表情，不用严肃的感叹号或❗。

## 弹窗 (Modal)

- 蒙层：`bg-ink-900/30 backdrop-blur-sm`
- 容器：`card` + `animate-pop`
- 宽度：窄 `max-w-md` / 中 `w-[520px]` / 宽 `w-[780px]`

## 表单提示

- 错误：直接 alert 即可（小应用，不过度设计）
- 成功：右下角 toast 弹 2 秒（见 Settings.vue）
