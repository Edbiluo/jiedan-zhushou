export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.3.9',
    date: '2026-05-05',
    items: ['设置页新增版本更新记录，展示历史版本号与更新内容'],
  },
  {
    version: 'v0.3.8',
    date: '2026-05-05',
    items: [
      '稿费统计页：新增快捷日期段选择（近1天/3天/一周/一月，支持展开更多）',
      '稿费统计页：新增待入账金额统计卡片',
      '稿费统计页：新增已完成/待入账/总额金额对比图（含独立日期段选择）',
    ],
  },
  {
    version: 'v0.3.7',
    date: '2026-04-30',
    items: [
      '应用名称可在设置中自定义修改',
      '默认应用名称改为「小猪的接单小助手」',
    ],
  },
  {
    version: 'v0.3.6',
    date: '2026-04-23',
    items: [
      '修复发版流程：补充前端构建步骤',
    ],
  },
  {
    version: 'v0.3.5',
    date: '2026-04-22',
    items: [
      '修复白屏问题：恢复内容区滚动布局',
      '日历页周高度自适应优化',
      '本详情页大图预览增加关闭按钮和 ESC 快捷键',
    ],
  },
];
