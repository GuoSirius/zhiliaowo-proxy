<template>
  <div v-if="doc" class="h5-root" :style="cssVars">
    <BlockRenderer :blocks="doc.blocks" :theme="doc.theme" />
  </div>
  <div v-else-if="error" class="h5-state">
    <p>加载失败：{{ error }}</p>
    <p class="hint">请确认链接携带正确的 <code>?id=</code> 且代理服务已启动。</p>
  </div>
  <div v-else class="h5-state"><p>加载中…</p></div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { BASE_CSS, type H5Doc, type BrandTheme } from '@zhiliaowo/core';
import BlockRenderer from './blocks/BlockRenderer.vue';
import { fetchH5 } from './api';

// 注入 core 共享样式（单一事实源，避免重复维护一套 CSS）
if (typeof document !== 'undefined' && !document.getElementById('h5-base-css')) {
  const s = document.createElement('style');
  s.id = 'h5-base-css';
  s.textContent = BASE_CSS;
  document.head.appendChild(s);
}

const doc = ref<H5Doc | null>(null);
const error = ref('');

function themeToCssVars(t: BrandTheme): string {
  return [
    `--brand-primary:${t.primary}`,
    `--brand-primary-dark:${t.primaryDark}`,
    `--brand-gradient:${t.gradient}`,
    `--brand-name:${t.name}`,
    `--brand-slogan:${t.slogan}`,
  ].join(';');
}
const cssVars = computed(() => (doc.value ? themeToCssVars(doc.value.theme) : ''));

function resolveId(): string {
  const u = new URLSearchParams(location.search);
  return u.get('id') || location.pathname.split('/').filter(Boolean).pop() || '';
}

onMounted(async () => {
  const id = resolveId();
  if (!id) {
    error.value = '缺少文档 id';
    return;
  }
  try {
    const d = await fetchH5(id);
    if (!d) error.value = `未找到文档 ${id}`;
    else doc.value = d;
  } catch (e) {
    error.value = (e as Error).message;
  }
});
</script>

<style>
.h5-state {
  max-width: 480px;
  margin: 40px auto;
  padding: 24px;
  text-align: center;
  color: #6b7280;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.h5-state .hint {
  font-size: 13px;
  margin-top: 8px;
}
.h5-state code {
  background: #f1f2f4;
  padding: 1px 6px;
  border-radius: 4px;
}
</style>
