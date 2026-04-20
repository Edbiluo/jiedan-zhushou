<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import dayjs from 'dayjs';
import { useStatsStore } from '@/stores/stats';

use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const stats = useStatsStore();
const from = ref(dayjs().subtract(11, 'month').format('YYYY-MM'));
const to = ref(dayjs().format('YYYY-MM'));

async function load() {
  await stats.load(from.value, to.value);
}
onMounted(load);
watch([from, to], load);

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

const hoursOption = computed(() => {
  const rows = stats.summary?.avg_page_hours || [];
  return {
    title: { text: '单页平均耗时（h）', textStyle: { fontSize: 14, fontFamily: 'LXGW WenKai' } },
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: rows.map((r) => r.month) },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, data: rows.map((r) => Math.round((r.avg_hours || 0) * 100) / 100), itemStyle: { color: '#E4B77A' } }],
  };
});

const avgPrice = computed(() => stats.summary?.average_price?.avg_price || 0);
const totalBooks = computed(() => stats.summary?.average_price?.count || 0);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <label class="text-sm font-hand">从</label>
      <input v-model="from" type="month" class="input !w-40" />
      <label class="text-sm font-hand">到</label>
      <input v-model="to" type="month" class="input !w-40" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="card col-span-2 grid grid-cols-3 text-center gap-4">
        <div><div class="text-2xl font-hand text-brand-700">{{ totalBooks }}</div><div class="text-xs text-ink-500 font-hand">完成本数</div></div>
        <div><div class="text-2xl font-hand text-brand-700">¥{{ avgPrice }}</div><div class="text-xs text-ink-500 font-hand">件均价</div></div>
        <div><div class="text-2xl font-hand text-brand-700">✿</div><div class="text-xs text-ink-500 font-hand">加油画画</div></div>
      </div>
      <div class="card"><v-chart :option="incomeOption" autoresize style="height:280px" /></div>
      <div class="card"><v-chart :option="bookCountOption" autoresize style="height:280px" /></div>
      <div class="card"><v-chart :option="styleOption" autoresize style="height:280px" /></div>
      <div class="card"><v-chart :option="hoursOption" autoresize style="height:280px" /></div>
    </div>
  </div>
</template>
