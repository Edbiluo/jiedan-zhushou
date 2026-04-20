# 动效规范

## 原则

- **节制** — 只在关键时刻使用，不让动效喧宾夺主
- **自然曲线** — 优先 `cubic-bezier(.2,.8,.2,1)`，避免线性
- **快** — 绝大多数动效 ≤ 300ms

## 动效清单

### 1. 元素出现 (rise)
用途：页面切换、列表元素初次展示。

```css
@keyframes rise {
  0%   { transform: translateY(4px); opacity: 0; }
  100% { transform: translateY(0);  opacity: 1; }
}
.animate-rise { animation: rise .3s ease-out; }
```

### 2. 弹出 (pop)
用途：弹窗、新增元素。

```css
@keyframes pop {
  0%   { transform: scale(0.9); opacity: 0; }
  60%  { transform: scale(1.04); }
  100% { transform: scale(1); opacity: 1; }
}
.animate-pop { animation: pop .35s cubic-bezier(.2,.8,.2,1); }
```

### 3. 悬浮上浮
卡片 hover：

```html
<div class="card transition hover:-translate-y-1 hover:shadow-pop">
```

### 4. 按钮按压
```css
.btn { transition: all .2s; }
.btn:active { transform: scale(0.95); }
```

### 5. 完成撒花 (Confetti)
用途：**标记本完成**、**所有画页完成**。

- 60 个小方块从页面顶端随机落下
- 颜色从 brand + 语义色调色盘随机
- 持续 2.4s，自动回收

见 `frontend/src/components/Confetti.vue`。

### 6. 页面切换淡入
```css
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
```

### 7. 加载呼吸（可选）
```css
@keyframes breath {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

## 禁忌

- ❌ 全页面旋转 / 翻转动画
- ❌ 超过 500ms 的动效（除非特殊叙事）
- ❌ 鼠标跟随粒子（性能差、打扰）
- ❌ 每次 hover 都放烟花（杀伤力过强）
