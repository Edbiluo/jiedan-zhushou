<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import dayjs from 'dayjs';
import { useStatsStore } from '@/stores/stats';
import { api } from '@/api';
import type { StatsSummary } from '@/types';

use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const stats = useStatsStore();

// ── 快捷日期按钮 ─────────────────────────────────────────────
const PRESETS_PRIMARY = [
  { label: '近1天', days: 1 },
  { label: '近3天', days: 3 },
  { label: '近一周', days: 7 },
  { label: '近一月', days: 30 },
];
const PRESETS_SECONDARY = [
  { label: '近3月', days: 90 },
  { label: '近半年', days: 180 },
  { label: '近一年', days: 365 },
  { label: '全部', days: -1 },
];

const expanded = ref(false);
const selectedPreset = ref('近一月');
const fromDate = ref(dayjs().subtract(29, 'day').format('YYYY-MM-DD'));
const toDate = ref(dayjs().format('YYYY-MM-DD'));

function selectPreset(label: string, days: number) {
  selectedPreset.value = label;
  if (days === -1) {
    fromDate.value = '2000-01-01';
  } else {
    fromDate.value = dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');
  }
  toDate.value = dayjs().format('YYYY-MM-DD');
}

async function load() {
  await stats.load(fromDate.value, toDate.value);
}
onMounted(load);
watch([fromDate, toDate], load);

// ── 主要统计卡片 ──────────────────────────────────────────────
const avgPrice = computed(() => stats.summary?.average_price?.avg_price || 0);
const totalBooks = computed(() => stats.summary?.average_price?.count || 0);
const pendingAmount = computed(() => stats.summary?.pending_income?.amount || 0);
const pendingCount = computed(() => stats.summary?.pending_income?.count || 0);
const totalAmount = computed(() => stats.summary?.total_amount?.amount || 0);
const totalAmountCount = computed(() => stats.summary?.total_amount?.count || 0);
const totalDeposit = computed(() => stats.summary?.total_deposit?.amount || 0);
const pendingReceivable = computed(() => stats.summary?.pending_receivable?.amount || 0);
const pendingReceivableCount = computed(() => stats.summary?.pending_receivable?.count || 0);

function fmtMoney(v: number | undefined | null) {
  return `¥${(v || 0).toLocaleString()}`;
}

// ── 主区域图表 ────────────────────────────────────────────────
const incomeOption = computed(() => {
  const rows = stats.summary?.monthly_income || [];
  return {
    title: { text: '月度收入（¥）', textStyle: { fontSize: 14, fontFamily: 'LXGW WenKai' } },
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: rows.map((r) => r.month) },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, data: rows.map((r) => r.income), itemStyle: { color: '#8FB8E8' }, areaStyle: { color: 'rgba(143,184,232,0.2)' } }],
  };
});

const bookCountOption = computed(() => {
  const rows = stats.summary?.completed_book_count || [];
  return {
    title: { text: '每月完成本数', textStyle: { fontSize: 14, fontFamily: 'LXGW WenKai' } },
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: rows.map((r) => r.month) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: rows.map((r) => r.cnt), itemStyle: { color: '#8FBE9E', borderRadius: [8, 8, 0, 0] } }],
  };
});

const styleOption = computed(() => {
  const rows = stats.summary?.style_distribution || [];
  return {
    title: { text: '款式占比', textStyle: { fontSize: 14, fontFamily: 'LXGW WenKai' } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: rows.map((r) => ({ name: r.style_name, value: r.page_count })),
      itemStyle: { borderRadius: 8, borderColor: '#FFFBF3', borderWidth: 2 },
      color: ['#8FB8E8', '#E4B77A', '#D98B92', '#8FBE9E', '#9CC1EA'],
    }],
  };
});

// ── 对比图（独立日期段） ───────────────────────────────────────
const CHART_PRESETS = [
  { label: '近一月', days: 30 },
  { label: '近三月', days: 90 },
  { label: '近半年', days: 180 },
  { label: '近一年', days: 365 },
  { label: '全部', days: -1 },
];

const chartPreset = ref('近一年');
const chartFromDate = ref(dayjs().subtract(364, 'day').format('YYYY-MM-DD'));
const chartToDate = ref(dayjs().format('YYYY-MM-DD'));
const chartSummary = ref<StatsSummary | null>(null);

function selectChartPreset(label: string, days: number) {
  chartPreset.value = label;
  if (days === -1) {
    chartFromDate.value = '2000-01-01';
  } else {
    chartFromDate.value = dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');
  }
  chartToDate.value = dayjs().format('YYYY-MM-DD');
}

async function loadChart() {
  chartSummary.value = await api.stats.summary(chartFromDate.value, chartToDate.value);
}
onMounted(loadChart);
watch([chartFromDate, chartToDate], loadChart);

const comparisonOption = computed(() => {
  const rows = chartSummary.value?.monthly_comparison || [];
  const months = rows.map((r) => r.month);
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const month = params[0]?.axisValue || '';
        const lines = params.map((p: any) => `${p.marker}${p.seriesName}：¥${(p.value || 0).toLocaleString()}`);
        return [month, ...lines].join('<br/>');
      },
    },
    legend: { data: ['已完成', '待入账', '总额'], top: 4 },
    grid: { left: 56, right: 20, top: 36, bottom: 30 },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `¥${v.toLocaleString()}` } },
    series: [
      {
        name: '已完成',
        type: 'bar',
        stack: 'total',
        data: rows.map((r) => r.completed_amount),
        itemStyle: { color: '#86EFAC' },
      },
      {
        name: '待入账',
        type: 'bar',
        stack: 'total',
        data: rows.map((r) => r.pending_amount),
        itemStyle: { color: '#FCA5A5' },
      },
      {
        name: '总额',
        type: 'line',
        data: rows.map((r) => r.total_amount),
        itemStyle: { color: '#818CF8' },
        lineStyle: { width: 2, color: '#818CF8' },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  };
});
</script>

<template>
  <div class="space-y-4">
    <!-- 快捷日期按钮 -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="p in PRESETS_PRIMARY"
        :key="p.label"
        @click="selectPreset(p.label, p.days)"
        :class="[
          'px-3 py-1 rounded-full text-sm border transition-colors',
          selectedPreset === p.label
            ? 'bg-pink-300 border-pink-300 text-white font-medium'
            : 'bg-white border-gray-300 text-gray-600 hover:border-pink-300 hover:text-pink-500'
        ]"
      >{{ p.label }}</button>

      <template v-if="expanded">
        <button
          v-for="p in PRESETS_SECONDARY"
          :key="p.label"
          @click="selectPreset(p.label, p.days)"
          :class="[
            'px-3 py-1 rounded-full text-sm border transition-colors',
            selectedPreset === p.label
              ? 'bg-pink-300 border-pink-300 text-white font-medium'
              : 'bg-white border-gray-300 text-gray-600 hover:border-pink-300 hover:text-pink-500'
          ]"
        >{{ p.label }}</button>
      </template>

      <button
        @click="expanded = !expanded"
        class="px-2 py-1 rounded-full text-sm border border-gray-300 text-gray-400 hover:text-gray-600 transition-colors"
      >{{ expanded ? '收起 ▲' : '更多 ▼' }}</button>
    </div>

    <!-- 汇总卡片 -->
    <div class="card grid grid-cols-4 text-center gap-4">
      <div>
        <div class="text-2xl text-brand-700">{{ totalBooks }}</div>
        <div class="text-xs text-ink-500">完成本数</div>
      </div>
      <div>
        <div class="text-2xl text-brand-700">{{ fmtMoney(avgPrice) }}</div>
        <div class="text-xs text-ink-500">件均价</div>
      </div>
      <div>
        <div class="text-2xl text-amber-500">{{ fmtMoney(pendingAmount) }}</div>
        <div class="text-xs text-ink-500">待入账（{{ pendingCount }}件）</div>
      </div>
      <div>
        <div class="text-2xl text-brand-700">✿</div>
        <div class="text-xs text-ink-500">加油画画</div>
      </div>
    </div>

    <!-- 金额汇总卡片（第二行） -->
    <div class="card grid grid-cols-3 text-center gap-4">
      <div>
        <div class="text-2xl text-brand-700">{{ fmtMoney(totalAmount) }}</div>
        <div class="text-xs text-ink-500">总金额（{{ totalAmountCount }}本）</div>
      </div>
      <div>
        <div class="text-2xl text-green-600">{{ fmtMoney(totalDeposit) }}</div>
        <div class="text-xs text-ink-500">总定金</div>
      </div>
      <div>
        <div class="text-2xl text-rose-500">{{ fmtMoney(pendingReceivable) }}</div>
        <div class="text-xs text-ink-500">待收金额（{{ pendingReceivableCount }}本）</div>
      </div>
    </div>

    <!-- 月度收入 + 完成本数 -->
    <div class="grid grid-cols-2 gap-4">
      <div class="card"><v-chart :option="incomeOption" autoresize style="height:280px" /></div>
      <div class="card"><v-chart :option="bookCountOption" autoresize style="height:280px" /></div>
    </div>

    <!-- 款式占比 -->
    <div class="card"><v-chart :option="styleOption" autoresize style="height:280px" /></div>

    <!-- 金额对比图 -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-ink-700">金额对比</span>
        <div class="flex gap-1.5">
          <button
            v-for="p in CHART_PRESETS"
            :key="p.label"
            @click="selectChartPreset(p.label, p.days)"
            :class="[
              'px-2.5 py-0.5 rounded-full text-xs border transition-colors',
              chartPreset === p.label
                ? 'bg-violet-400 border-violet-400 text-white font-medium'
                : 'bg-white border-gray-300 text-gray-500 hover:border-violet-300 hover:text-violet-500'
            ]"
          >{{ p.label }}</button>
        </div>
      </div>
      <v-chart :option="comparisonOption" autoresize style="height:300px" />
    </div>
  </div>
</template>
