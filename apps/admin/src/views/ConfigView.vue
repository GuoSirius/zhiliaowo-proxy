<template>
  <section class="space-y-6">
    <div class="card">
      <h2 class="card-title">站点配置（SITES）</h2>
      <p class="text-xs text-gray-500 mb-3">
        配置定义在 <code>apps/proxy/src/config/brands.ts</code>（代码即配置）。本页只读，修改需改代码并重新部署；
        appId 属密钥，此处只显示「是否已配置」，不返回明文。
      </p>
      <table v-if="sites.length" class="tbl">
        <thead>
          <tr>
            <th class="w-28">site key</th>
            <th>展示名</th>
            <th class="w-28">brand</th>
            <th class="w-28">brandKey</th>
            <th class="w-20">语言</th>
            <th class="w-32">库前缀</th>
            <th class="w-56">appId 环境变量</th>
            <th class="w-24">已配置</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sites" :key="s.key">
            <td class="font-mono text-xs">{{ s.key }}</td>
            <td>{{ s.label }}</td>
            <td>{{ s.brand }}</td>
            <td class="text-gray-500">{{ s.brandKey }}</td>
            <td>{{ s.locale }}</td>
            <td class="font-mono text-xs">{{ s.dbPrefix }}</td>
            <td class="font-mono text-xs text-gray-500">{{ s.appIdEnv }}</td>
            <td>
              <span :class="s.appIdConfigured ? 'text-green-600' : 'text-red-600'">
                {{ s.appIdConfigured ? '是' : '否' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-sm text-gray-500">暂无数据</p>
    </div>

    <div class="card">
      <h2 class="card-title">品牌配置（BRANDS）</h2>
      <p class="text-xs text-gray-500 mb-3">
        品牌级数据（文献 / 统计 / 聚合）按品牌共享，与语言无关；站点层再叠加 locale 与 dbPrefix。
      </p>
      <table v-if="brands.length" class="tbl">
        <thead>
          <tr><th class="w-32">key</th><th>展示名</th><th class="w-32">brand</th><th class="w-56">appId 环境变量</th></tr>
        </thead>
        <tbody>
          <tr v-for="b in brands" :key="b.key">
            <td class="font-mono text-xs">{{ b.key }}</td>
            <td>{{ b.label }}</td>
            <td>{{ b.brand }}</td>
            <td class="font-mono text-xs text-gray-500">{{ b.appIdEnv }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-sm text-gray-500">暂无数据</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/app';
import type { BrandConf, SiteConf } from '../api/report';

const app = useAppStore();
const { sites, brands } = storeToRefs(app);
</script>
