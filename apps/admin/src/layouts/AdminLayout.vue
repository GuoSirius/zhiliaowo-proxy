<template>
  <div class="h-screen flex flex-col bg-gray-50 text-gray-800">
    <!-- 顶部通栏 -->
    <header class="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
      <h1 class="text-lg font-semibold mr-auto">知了窝 管理后台</h1>
      <label class="text-sm text-gray-500 flex items-center gap-1">
        站点
        <select v-model="app.site" class="input">
          <option v-for="s in app.sites" :key="s.key" :value="s.key">
            {{ s.label }}（{{ s.key }}）
          </option>
        </select>
      </label>
      <label class="text-sm text-gray-500 flex items-center gap-1">
        年份
        <input v-model.number="app.year" type="number" class="input w-24" />
      </label>
      <label class="text-sm text-gray-500 flex items-center gap-1">
        截止月
        <select v-model.number="app.endMonth" class="input">
          <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>
        </select>
      </label>
    </header>

    <div class="flex-1 flex min-h-0">
      <!-- 左侧菜单 -->
      <aside class="w-56 shrink-0 bg-white border-r border-gray-200 overflow-y-auto py-4">
        <nav class="flex flex-col">
          <RouterLink
            v-for="m in menus"
            :key="m.to"
            :to="m.to"
            class="px-6 py-3 text-sm border-l-2 -ml-px text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            active-class="border-blue-600 text-blue-600 font-medium bg-blue-50"
          >
            {{ m.label }}
          </RouterLink>
        </nav>
      </aside>

      <!-- 右侧内容区 -->
      <main class="flex-1 overflow-y-auto p-6">
        <div
          v-if="app.loadError"
          class="card mb-4 text-sm text-red-700 bg-red-50 border-red-200"
        >
          站点配置加载失败：{{ app.loadError }}
          <div class="mt-2 text-xs text-gray-600">
            请确认 proxy 已启动（当前基址 {{ proxyBase }}），且已更新到含
            <code>/api/v1/config/sites</code> 的版本。
          </div>
        </div>
        <div v-if="!app.site" class="text-sm text-gray-500">站点配置加载中…</div>
        <RouterView v-else />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { proxyBase } from '../api/client';

const app = useAppStore();

const menus = [
  { to: '/poster', label: '海报数据' },
  { to: '/sync', label: '同步' },
  { to: '/config', label: '品牌配置' },
];

onMounted(() => {
  app.loadConfig();
});
</script>
