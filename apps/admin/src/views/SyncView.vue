<template>
  <section class="space-y-6">
    <div class="card">
      <h2 class="card-title">同步状态（{{ brand || site || '—' }}）</h2>
      <div v-if="loading" class="text-sm text-gray-500 py-6">加载中…</div>
      <div v-else-if="error" class="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
        {{ error }}
      </div>
      <table v-else-if="states.length" class="tbl">
        <thead>
          <tr>
            <th class="w-20">年份</th>
            <th class="w-24">状态</th>
            <th class="w-28">上游总数</th>
            <th class="w-28">本地篇数</th>
            <th>最后同步</th>
            <th class="w-24">耗时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in states" :key="s.year">
            <td class="font-medium">{{ s.year }}</td>
            <td>
              <span class="rounded-full text-xs px-2 py-0.5" :class="statusClass(s.status)">
                {{ s.status ?? '—' }}
              </span>
            </td>
            <td>{{ fmtNum(s.total_count) }}</td>
            <td>{{ fmtNum(s.localPapers) }}</td>
            <td class="text-gray-500">{{ fmtTime(s.last_synced_at) }}</td>
            <td class="text-gray-500">{{ fmtDuration(s.duration_ms) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-sm text-gray-500">该品牌暂无同步记录</p>
      <button class="btn mt-3" :disabled="loading" @click="load">刷新</button>
    </div>

    <div class="card">
      <h2 class="card-title">触发同步</h2>
      <p class="text-xs text-gray-500 mb-3">
        需要 proxy 配置 <code>ADMIN_TOKEN</code> 并在此填写一致的值；未配置时接口返回 503（fail-closed）。
        同一 brand:year 重复触发会复用进行中的同步，不会二次打上游。
      </p>
      <div class="flex flex-wrap items-end gap-3">
        <label class="text-sm">
          <span class="block text-gray-500 mb-1">年份</span>
          <input v-model.number="year" type="number" class="input w-28" />
        </label>
        <label class="text-sm">
          <span class="block text-gray-500 mb-1">管理令牌</span>
          <input v-model="token" type="password" class="input w-64" placeholder="ADMIN_TOKEN" />
        </label>
        <label class="text-sm flex items-center gap-2 pb-2">
          <input v-model="force" type="checkbox" />
          <span>强制全量重拉</span>
        </label>
        <button class="btn btn-primary" :disabled="running || !site" @click="run">
          {{ running ? '同步中…' : '开始同步' }}
        </button>
      </div>
      <div v-if="runError" class="mt-3 rounded bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
        {{ runError }}
      </div>
      <div v-if="result" class="mt-3 rounded bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm">
        同步完成<span v-if="result.deduplicated">（复用了进行中的同步）</span>
        <pre class="mt-2 text-xs overflow-auto">{{ JSON.stringify(result.result, null, 2) }}</pre>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { getMeta, refresh, type RefreshResp, type SyncState } from '../api/report';
import { useAppStore } from '../stores/app';
import { fmtDuration, fmtNum, fmtTime } from '../utils';

const app = useAppStore();
const { site } = storeToRefs(app);

const TOKEN_KEY = 'zlw_admin_token';

const states = ref<SyncState[]>([]);
const brand = ref('');
const loading = ref(false);
const error = ref('');

// 同步触发年份：默认取顶部通栏年份，独立维护（与海报筛选年解耦）
const year = ref(app.year);
const force = ref(false);
const token = ref(localStorage.getItem(TOKEN_KEY) ?? '');
const running = ref(false);
const runError = ref('');
const result = ref<RefreshResp | null>(null);

async function load() {
  if (!site.value) return;
  loading.value = true;
  error.value = '';
  try {
    const meta = await getMeta(site.value);
    states.value = meta.syncStates ?? [];
    brand.value = meta.brand;
  } catch (e) {
    error.value = (e as Error).message;
    states.value = [];
  } finally {
    loading.value = false;
  }
}

async function run() {
  if (!site.value) return;
  runError.value = '';
  result.value = null;
  running.value = true;
  try {
    localStorage.setItem(TOKEN_KEY, token.value);
    result.value = await refresh(site.value, year.value, force.value, token.value);
    await load();
  } catch (e) {
    runError.value = (e as Error).message;
  } finally {
    running.value = false;
  }
}

function statusClass(status: string | null): string {
  if (status === 'done') return 'bg-green-100 text-green-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'running') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

onMounted(load);
watch(() => site.value, load);
watch(
  () => app.year,
  (y) => (year.value = y),
);
</script>
