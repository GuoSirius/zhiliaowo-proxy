<template>
  <div class="min-h-screen bg-gray-50 text-gray-800">
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center gap-4">
      <h1 class="text-lg font-semibold mr-auto">知了窝 管理后台</h1>
      <label class="text-sm text-gray-500 flex items-center gap-1">
        站点
        <select v-model="site" class="input">
          <option v-for="s in sites" :key="s.key" :value="s.key">{{ s.label }}（{{ s.key }}）</option>
        </select>
      </label>
      <label class="text-sm text-gray-500 flex items-center gap-1">
        年份
        <input v-model.number="year" type="number" class="input w-24" />
      </label>
      <label class="text-sm text-gray-500 flex items-center gap-1">
        截止月
        <select v-model.number="endMonth" class="input">
          <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>
        </select>
      </label>
    </header>

    <nav class="bg-white border-b border-gray-200 px-6 flex gap-1">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="px-4 py-2 text-sm border-b-2 -mb-px"
        :class="
          active === t.key
            ? 'border-blue-600 text-blue-600 font-medium'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="active = t.key"
      >
        {{ t.label }}
      </button>
    </nav>

    <main class="p-6">
      <div v-if="loadError" class="card mb-4 text-sm text-red-700 bg-red-50 border-red-200">
        站点配置加载失败：{{ loadError }}
        <div class="mt-2 text-xs text-gray-600">
          请确认 proxy 已启动（当前基址 {{ proxyBase }}），且已更新到含
          <code>/api/v1/config/sites</code> 的版本。
        </div>
      </div>

      <div v-if="!site" class="text-sm text-gray-500">站点配置加载中…</div>

      <template v-else>
        <PosterView v-if="active === 'poster'" :site="site" :year="year" :end-month="endMonth" />
        <SyncView v-else-if="active === 'sync'" :site="site" :year="year" />
        <ConfigView v-else :sites="sites" :brands="brands" />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getSitesConfig, type BrandConf, type SiteConf } from './api/report';
import { proxyBase } from './api/client';
import PosterView from './views/PosterView.vue';
import SyncView from './views/SyncView.vue';
import ConfigView from './views/ConfigView.vue';

const tabs = [
  { key: 'poster', label: '海报数据' },
  { key: 'sync', label: '同步' },
  { key: 'config', label: '品牌配置' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const active = ref<TabKey>('poster');
const sites = ref<SiteConf[]>([]);
const brands = ref<BrandConf[]>([]);
const loadError = ref('');

const site = ref('');
const year = ref(new Date().getFullYear());
const endMonth = ref(12);

onMounted(async () => {
  try {
    const cfg = await getSitesConfig();
    sites.value = cfg.sites ?? [];
    brands.value = cfg.brands ?? [];
    if (sites.value.length > 0) site.value = sites.value[0].key;
  } catch (e) {
    loadError.value = (e as Error).message;
  }
});
</script>
