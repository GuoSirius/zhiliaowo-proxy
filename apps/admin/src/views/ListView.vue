<template>
  <div class="lv">
    <div class="lv-bar">
      <h2>H5 文档</h2>
      <button class="primary" @click="$emit('create')">+ 新建</button>
    </div>

    <div class="lv-filters">
      <select v-model="statusFilter" @change="reload">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="published">已发布</option>
      </select>
      <input v-model="kw" placeholder="搜索标题" @input="reload" />
    </div>

    <table v-if="store.list.length">
      <thead>
        <tr>
          <th>标题</th>
          <th>品牌</th>
          <th>状态</th>
          <th>更新时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in store.list" :key="d.id">
          <td>{{ d.title }}</td>
          <td>{{ d.brandId }}</td>
          <td>
            <span :class="['badge', d.status]">{{ d.status === 'published' ? '已发布' : '草稿' }}</span>
          </td>
          <td>{{ d.updatedAt.slice(0, 19).replace('T', ' ') }}</td>
          <td class="ops">
            <button @click="$emit('edit', d.id)">编辑</button>
            <button @click="store.duplicate(d.id)">复制</button>
            <button v-if="d.status !== 'published'" @click="store.publish(d.id)">发布</button>
            <button @click="exp(d.id, 'html')">HTML</button>
            <button @click="exp(d.id, 'png')">PNG</button>
            <button @click="exp(d.id, 'vue')">Vue</button>
            <button class="danger" @click="del(d.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无文档，点击「新建」开始。</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useH5Store } from '../stores/h5';
import { exportH5Url } from '../api/h5';

defineEmits<{ edit: [id: string]; create: [] }>();

const store = useH5Store();
const statusFilter = ref('');
const kw = ref('');

async function reload() {
  await store.loadList({
    ...(statusFilter.value ? { status: statusFilter.value } : {}),
    ...(kw.value ? { keyword: kw.value } : {}),
  });
}

function exp(id: string, fmt: 'html' | 'png' | 'vue') {
  window.open(exportH5Url(id, fmt), '_blank');
}

async function del(id: string) {
  if (!confirm('确认删除该文档？')) return;
  await store.remove(id);
}

onMounted(async () => {
  await store.loadBrands();
  await reload();
});
</script>

<style scoped>
.lv {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}
.lv-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.lv-bar h2 {
  margin: 0;
  font-size: 20px;
}
.lv-filters {
  display: flex;
  gap: 10px;
  margin: 14px 0;
}
.lv-filters select,
.lv-filters input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
}
.lv-filters input {
  flex: 1;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
th,
td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f1f3;
}
th {
  background: #f8fafc;
  color: #6b7280;
  font-weight: 600;
}
.ops {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
button {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 6px;
  padding: 4px 9px;
  cursor: pointer;
  font-size: 12px;
}
button.primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
button.danger {
  color: #e11d48;
  border-color: #fecdd3;
}
.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}
.badge.draft {
  background: #f1f5f9;
  color: #64748b;
}
.badge.published {
  background: #dcfce7;
  color: #15803d;
}
.empty {
  text-align: center;
  color: #9ca3af;
  padding: 40px;
}
</style>
