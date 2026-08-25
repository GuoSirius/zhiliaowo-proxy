// 管理后台 —— H5 Pinia store
import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  getH5,
  listH5,
  createH5,
  updateH5,
  deleteH5,
  duplicateH5,
  publishH5,
  listBrands,
  type H5Summary,
} from '../api/h5';
import type { H5Doc, BrandTheme } from '@zhiliaowo/core';

function defaultTheme(): BrandTheme {
  return {
    brandKey: 'default',
    name: '默认品牌',
    logoUrl: '',
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
    slogan: '',
    contact: {},
    qrUrl: '',
  };
}

export const useH5Store = defineStore('h5', () => {
  const list = ref<H5Summary[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const current = ref<H5Doc | null>(null);
  const brands = ref<BrandTheme[]>([]);
  const loading = ref(false);

  async function loadList(q: Record<string, string> = {}) {
    loading.value = true;
    try {
      const res = await listH5({ page: String(page.value), pageSize: String(pageSize.value), ...q });
      list.value = res.items;
      total.value = res.total;
    } finally {
      loading.value = false;
    }
  }

  async function loadDoc(id: string) {
    current.value = await getH5(id);
  }

  async function loadBrands() {
    brands.value = await listBrands();
  }

  function newDoc(): H5Doc {
    const brand = brands.value[0];
    const theme: BrandTheme = brand ? structuredClone(brand) : defaultTheme();
    const doc: H5Doc = {
      id: '',
      title: '未命名 H5',
      templateId: '',
      brandId: brand?.brandKey || '',
      status: 'draft',
      blocks: [],
      theme,
      meta: {},
      createdAt: '',
      updatedAt: '',
    };
    current.value = doc;
    return doc;
  }

  async function save() {
    if (!current.value) return;
    if (current.value.id) {
      current.value = await updateH5(current.value.id, current.value);
    } else {
      const { id: _id, createdAt: _c, updatedAt: _u, ...input } = current.value;
      current.value = await createH5(input);
    }
  }

  async function remove(id: string) {
    await deleteH5(id);
    await loadList();
  }

  async function duplicate(id: string) {
    const d = await duplicateH5(id);
    await loadList();
    return d;
  }

  async function publish(id: string) {
    const d = await publishH5(id);
    if (current.value?.id === id) current.value = d;
    await loadList();
  }

  return {
    list,
    total,
    page,
    pageSize,
    current,
    brands,
    loading,
    loadList,
    loadDoc,
    loadBrands,
    newDoc,
    save,
    remove,
    duplicate,
    publish,
  };
});
