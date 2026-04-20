# 字体系统

## 字族

| Token | 字族 | 用途 |
|---|---|---|
| `--font-hand` | `'LXGW WenKai', '站酷快乐体', cursive` | **手写体** — 标题、数字、按钮文案 |
| `--font-sans` | `'HarmonyOS Sans', 'Source Han Sans CN', 'PingFang SC', system-ui, sans-serif` | **正文** — 长文、表单、默认兜底 |

> 手写体优先使用 **霞鹜文楷 (LXGW WenKai)**，已免费开源，打包时随应用发布。
> 备选：站酷快乐体（需遵守使用条款）。

## 字阶

| 用途 | size | line-height | weight | 字体 |
|---|---|---|---|---|
| 主标题 H1 | 28px | 38px | 500 | hand |
| 次标题 H2 | 22px | 30px | 500 | hand |
| 区块标题 H3 | 18px | 26px | 500 | hand |
| 卡片标题 | 16px | 24px | 500 | hand |
| 正文 Body | 14px | 22px | 400 | sans |
| 小字 Caption | 12px | 18px | 400 | sans |
| 超小字 Hint | 10px | 16px | 400 | sans |

## 数字

涉及"日期、数量、金额"的数字优先用 **手写体**，让统计页有温度：

- 月收入卡片里的 `¥XXX`
- 本管理卡片里的"剩余 X 天"
- 统计页的汇总大数字

## 实践

```vue
<h1 class="font-hand text-brand-700">接单助手</h1>
<p class="font-sans text-ink-700 text-sm">正文内容使用无衬线字体。</p>
```
