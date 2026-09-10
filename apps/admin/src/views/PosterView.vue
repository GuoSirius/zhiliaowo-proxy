<template>
  <section>
    <div v-if="loading" class="text-sm text-gray-500 py-8">加载中…</div>
    <div v-else-if="error" class="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
      加载海报数据失败：{{ error }}
    </div>

    <div v-else-if="data" class="space-y-6">
      <!-- 板块 1 研究概述 -->
      <div class="card">
        <h2 class="card-title">板块 1 · 研究概述</h2>
        <p class="text-sm text-gray-600">
          区间 {{ data.range.year }} 年 {{ data.range.startMonth }}–{{ data.range.endMonth }} 月，
          共 <b class="text-gray-900">{{ fmtNum(data.summary.totalPapers) }}</b> 篇
        </p>
        <div v-if="data.summary.featuredJournals.length" class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="j in data.summary.featuredJournals"
            :key="j.journal"
            class="rounded-full bg-blue-50 text-blue-700 text-xs px-3 py-1"
          >
            {{ j.journal }} · {{ fmtNum(j.count) }}
          </span>
        </div>
      </div>

      <!-- 板块 2 核心数据 -->
      <div class="card">
        <h2 class="card-title">板块 2 · 核心数据（同比）</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div v-for="m in metrics" :key="m.label" class="rounded border border-gray-200 p-3">
            <div class="text-xs text-gray-500">{{ m.label }}</div>
            <div class="text-xl font-semibold text-gray-900 mt-1">{{ fmtNum(m.m.value) }}</div>
            <div class="text-xs mt-1">
              <span class="text-gray-500">去年 {{ fmtNum(m.m.prevValue) }}</span>
              <span :class="rateClass(m.m.rate)" class="ml-1 font-medium">{{ fmtRate(m.m.rate) }}</span>
            </div>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span class="text-gray-500">累计篇数</span> <b>{{ fmtNum(data.core.cumulative.totalPapers) }}</b></div>
          <div><span class="text-gray-500">累计 IF</span> <b>{{ fmtNum(data.core.cumulative.totalIf) }}</b></div>
          <div><span class="text-gray-500">累计最高 IF</span> <b>{{ fmtNum(data.core.cumulative.maxIf) }}</b></div>
          <div><span class="text-gray-500">累计平均 IF</span> <b>{{ fmtNum(data.core.cumulative.avgIf) }}</b></div>
        </div>
      </div>

      <!-- 板块 3 趋势 -->
      <div class="card">
        <h2 class="card-title">板块 3 · 趋势（decadeMode: {{ data.trend.decadeMode }}）</h2>
        <div class="space-y-1">
          <div v-for="d in data.trend.decade" :key="d.year" class="flex items-center gap-3 text-sm">
            <span class="w-12 text-gray-500">{{ d.year }}</span>
            <div class="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
              <div class="h-full bg-blue-500" :style="{ width: Math.max(d.percent, d.count > 0 ? 2 : 0) + '%' }" />
            </div>
            <span class="w-24 text-right" :class="d.hasData ? 'text-gray-800' : 'text-gray-400'">
              {{ d.hasData ? fmtNum(d.count) : '无数据' }}
            </span>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="q in data.trend.quarters"
            :key="`${q.year}-${q.quarter}`"
            class="rounded border border-gray-200 px-3 py-1 text-xs"
          >
            {{ q.year }} {{ q.label }} · {{ fmtNum(q.count) }}
          </span>
        </div>
      </div>

      <!-- 板块 4 研究热点 -->
      <div class="card">
        <h2 class="card-title">
          板块 4 · 研究热点 Top10
          <span class="text-xs font-normal text-gray-500">
            （已分类 {{ fmtNum(data.hotspots.totalClassified) }} / 总 {{ fmtNum(data.hotspots.totalPapers) }}；AI 兜底 {{ data.hotspots.aiFallback ? '开' : '关' }}）
          </span>
        </h2>
        <table v-if="data.hotspots.topHotspots.length" class="tbl">
          <thead>
            <tr><th class="w-12">#</th><th>关键词</th><th class="w-24">次数</th><th class="w-24">去年</th><th class="w-24">增长率</th><th class="w-24">最高 IF</th></tr>
          </thead>
          <tbody>
            <tr v-for="(h, i) in data.hotspots.topHotspots" :key="h.cn">
              <td class="text-gray-400">{{ i + 1 }}</td>
              <td>{{ h.cn }}</td>
              <td>{{ fmtNum(h.count) }}</td>
              <td class="text-gray-500">{{ fmtNum(h.prevCount) }}</td>
              <td :class="rateClass(h.growthRate)">{{ fmtRate(h.growthRate) }}</td>
              <td>{{ fmtNum(h.maxIf) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-sm text-gray-500">无热点数据</p>
      </div>

      <!-- 板块 5 产品引用 -->
      <div class="card">
        <h2 class="card-title">
          板块 5 · 产品引用 Top{{ data.products.items.length }}
          <span class="text-xs font-normal text-gray-500">
            （涉及产品 {{ fmtNum(data.products.totalProducts) }}；同比基线 {{ data.products.hasYoY ? '有' : '无' }}）
          </span>
        </h2>
        <table v-if="data.products.items.length" class="tbl">
          <thead>
            <tr><th class="w-12">#</th><th>SPU</th><th>产品名</th><th>分类</th><th class="w-20">引用数</th><th class="w-24">增长率</th></tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in data.products.items" :key="p.spu">
              <td class="text-gray-400">{{ i + 1 }}</td>
              <td class="font-mono text-xs">{{ p.spu }}</td>
              <td>{{ p.productName ?? p.label ?? '—' }}</td>
              <td class="text-gray-500">{{ p.productCategory ?? '—' }}</td>
              <td>{{ fmtNum(p.count) }}</td>
              <td :class="rateClass(p.growthRate)">{{ fmtRate(p.growthRate) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-sm text-gray-500">无产品数据</p>
      </div>

      <!-- 板块 6 小结 -->
      <div class="card">
        <h2 class="card-title">
          板块 6 · 小结
          <span class="text-xs font-normal text-gray-500">（AI {{ data.conclusion.aiEnabled ? '已启用' : '未启用' }}）</span>
        </h2>
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">Top 期刊（按最高 IF）</h3>
            <ul class="text-sm space-y-1">
              <li v-for="j in data.conclusion.topJournals" :key="j.journal" class="flex justify-between gap-3">
                <span class="truncate">{{ j.journal }}</span>
                <span class="text-gray-500 shrink-0">IF {{ fmtNum(j.maxIf) }} · {{ fmtNum(j.count) }} 篇</span>
              </li>
              <li v-if="!data.conclusion.topJournals.length" class="text-gray-500">—</li>
            </ul>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">重点单位</h3>
            <ul class="text-sm space-y-1">
              <li v-for="ins in data.conclusion.institutions" :key="ins.name" class="flex justify-between gap-3">
                <span class="truncate">{{ ins.name }}</span>
                <span class="text-gray-400 shrink-0 text-xs">{{ ins.source }}</span>
              </li>
              <li v-if="!data.conclusion.institutions.length" class="text-gray-500">—</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { getOverview, type Overview } from '../api/report';
import { fmtNum, fmtRate, rateClass } from '../utils';

const props = defineProps<{ site: string; year: number; endMonth: number }>();

const data = ref<Overview | null>(null);
const error = ref('');
const loading = ref(false);

async function load() {
  if (!props.site) return;
  loading.value = true;
  error.value = '';
  try {
    data.value = await getOverview(props.site, props.year, props.endMonth);
  } catch (e) {
    error.value = (e as Error).message;
    data.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => [props.site, props.year, props.endMonth], load);

const metrics = computed(() => {
  const c = data.value?.core;
  if (!c) return [];
  return [
    { label: '文献总数', m: c.totalPapers },
    { label: '影响因子总和', m: c.totalIf },
    { label: 'IF≥10 篇数', m: c.ifGe10 },
    { label: '平均影响因子', m: c.avgIf },
    { label: '最高影响因子', m: c.maxIf },
  ];
});
</script>
