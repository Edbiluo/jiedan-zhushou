# 色板

## 品牌色（Brand · 莫兰迪蓝）

| Token | HEX | 用途 |
|---|---|---|
| `--color-brand-50`  | #F2F7FD | 极浅背景、hover 底 |
| `--color-brand-100` | #DEEAF8 | tag / 选中浅底 |
| `--color-brand-200` | #BED6F1 | 分隔线、次级强调 |
| `--color-brand-300` | #9CC1EA | 次按钮 |
| `--color-brand-400` | **#8FB8E8** | **主色**（按钮、激活菜单、主行动） |
| `--color-brand-500` | #6EA1DF | hover 主色 |
| `--color-brand-600` | #5286C4 | 主标题、重点文字 |
| `--color-brand-700` | #3E6EA6 | 对比最强的文字（少用） |

## 奶油底色（Cream）

| Token | HEX | 用途 |
|---|---|---|
| `--color-bg` | **#FFFBF3** | **主背景**（几乎所有大块背景） |
| `--color-bg-soft` | #FBF3E1 | 区块分隔、侧栏底 |
| `--color-surface` | #FFFFFF | 卡片面 |
| `--color-surface-alt` | #F6F1E4 | 叠加区、辅助面 |

## 墨水色（Ink · 文字 & 中性）

| Token | HEX | 用途 |
|---|---|---|
| `--color-ink-900` | #2C3440 | 主要正文 |
| `--color-ink-700` | #4F5968 | 次正文 |
| `--color-ink-500` | #7C8594 | 辅助说明 |
| `--color-ink-300` | #B4BBC6 | 占位、禁用 |
| `--color-ink-100` | #E5E8EE | 边框、分隔 |

## 语义色（柔和版）

| Token | HEX | 用途 |
|---|---|---|
| `--color-success` | #8FBE9E | 完成状态 |
| `--color-warning` | #E4B77A | 快到交付 |
| `--color-danger`  | #D98B92 | 延期、删除 |
| `--color-info`    | #8FB8E8 | 信息（= brand-400） |

## 使用约定

- **优先用 token 变量**，不要直接写 HEX，方便后续主题切换
- 文字配色对比度按 WCAG AA：正文用 `ink-900` 或 `ink-700`
- 语义色自带柔和滤镜，不要再叠加饱和度
