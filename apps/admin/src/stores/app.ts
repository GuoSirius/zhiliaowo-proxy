import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getSitesConfig, type BrandConf, type SiteConf } from '../api/report';

// 全局共享状态：站点/品牌只读配置 + 顶部通栏筛选条件（站点/年份/截止月）。
// 原 App.vue 的 props 下沉到这里，路由各页面统一读取，避免逐层透传。
export const useAppStore = defineStore('app', () => {
  const sites = ref<SiteConf[]>([]);
  const brands = ref<BrandConf[]>([]);
  const loadError = ref('');
  const loaded = ref(false);

  // 顶部通栏筛选
  const site = ref('');
  const year = ref(new Date().getFullYear());
  const endMonth = ref(12);

  async function loadConfig() {
    if (loaded.value) return;
    try {
      const cfg = await getSitesConfig();
      sites.value = cfg.sites ?? [];
      brands.value = cfg.brands ?? [];
      if (sites.value.length > 0) site.value = sites.value[0].key;
      loaded.value = true;
    } catch (e) {
      loadError.value = (e as Error).message;
    }
  }

  const currentSite = computed<SiteConf | null>(
    () => sites.value.find((s) => s.key === site.value) ?? null,
  );

  return { sites, brands, loadError, loaded, site, year, endMonth, loadConfig, currentSite };
});
