<template>
  <div v-if="doc" class="ev">
    <div class="ev-bar">
      <button @click="$emit('back')">← 返回列表</button>
      <div class="ev-title">
        <input v-model="doc.title" placeholder="H5 标题" />
      </div>
      <div class="ev-actions">
        <button @click="save">保存</button>
        <button class="primary" @click="publish">发布</button>
        <button @click="exp('html')">导出 HTML</button>
        <button @click="exp('png')">导出 PNG</button>
        <button @click="exp('vue')">导出 Vue</button>
      </div>
    </div>

    <div v-if="msg" class="ev-msg">{{ msg }}</div>

    <div class="ev-body">
      <!-- 左：编排 -->
      <section class="ev-left">
        <div class="ev-meta">
          <label>品牌
            <select :value="doc.brandId" @change="onBrand">
              <option v-for="b in store.brands" :key="b.brandKey" :value="b.brandKey">{{ b.name }}</option>
            </select>
          </label>
          <label>周期
            <input v-model="doc.meta.period" placeholder="如 2026-05 月度" />
          </label>
          <label>作者
            <input v-model="doc.meta.author" placeholder="作者" />
          </label>
        </div>

        <div class="ev-palette">
          <span>添加区块：</span>
          <button v-for="t in BLOCK_TYPES" :key="t" @click="addBlock(t)">{{ t }}</button>
        </div>

        <div class="ev-blocks">
          <div v-for="(b, i) in doc.blocks" :key="b.id" class="ev-block">
            <div class="eb-bar">
              <span>#{{ i + 1 }} · {{ b.type }}</span>
              <span class="eb-move">
                <button :disabled="i === 0" @click="move(i, -1)">↑</button>
                <button :disabled="i === doc!.blocks.length - 1" @click="move(i, 1)">↓</button>
                <button class="danger" @click="removeBlock(i)">删除</button>
              </span>
            </div>
            <BlockEditor v-model="doc.blocks[i]" />
          </div>
          <p v-if="!doc.blocks.length" class="empty">尚未添加区块，从上方「添加区块」开始编排。</p>
        </div>
      </section>

      <!-- 右：实时预览 -->
      <section class="ev-right">
        <div class="ev-prev-title">实时预览</div>
        <iframe class="ev-preview" :srcdoc="previewHtml" title="preview"></iframe>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRaw } from 'vue';
import { renderDocToHtml, type BlockType, type BrandTheme } from '@zhiliaowo/core';
import { useH5Store } from '../stores/h5';
import { createBlock, BLOCK_TYPES, exportH5Url } from '../api/h5';
import BlockEditor from '../components/BlockEditor.vue';

defineEmits<{ back: [] }>();

const store = useH5Store();
const doc = computed(() => store.current);
const msg = ref('');

const previewHtml = computed(() => (doc.value ? renderDocToHtml(doc.value) : ''));

function flash(m: string) {
  msg.value = m;
  setTimeout(() => (msg.value = ''), 2500);
}

async function save() {
  await store.save();
  flash('已保存');
}
async function publish() {
  if (!doc.value) return;
  if (!doc.value.id) await store.save();
  await store.publish(doc.value.id);
  flash('已发布');
}
function exp(fmt: 'html' | 'png' | 'vue') {
  if (!doc.value?.id) {
    flash('请先保存再导出');
    return;
  }
  window.open(exportH5Url(doc.value.id, fmt), '_blank');
}

function onBrand(e: Event) {
  const key = (e.target as HTMLSelectElement).value;
  const brand = store.brands.find((b) => b.brandKey === key);
  if (brand && doc.value) {
    doc.value.brandId = key;
    doc.value.theme = structuredClone(toRaw(brand)) as BrandTheme;
  }
}

function addBlock(t: BlockType) {
  if (!doc.value) return;
  doc.value.blocks.push(createBlock(t) as any);
}
function move(i: number, dir: number) {
  if (!doc.value) return;
  const arr = doc.value.blocks;
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
function removeBlock(i: number) {
  if (!doc.value) return;
  doc.value.blocks.splice(i, 1);
}
</script>

<style scoped>
.ev {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.ev-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}
.ev-title {
  flex: 1;
}
.ev-title input {
  width: 100%;
  border: 1px solid transparent;
  font-size: 16px;
  font-weight: 700;
  padding: 6px 8px;
  border-radius: 8px;
}
.ev-title input:focus {
  border-color: #d1d5db;
  outline: none;
}
.ev-actions {
  display: flex;
  gap: 6px;
}
.ev-actions button {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}
.ev-actions button.primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.ev-msg {
  background: #ecfdf5;
  color: #047857;
  font-size: 13px;
  padding: 6px 16px;
}
.ev-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}
.ev-left {
  overflow-y: auto;
  padding: 16px;
  border-right: 1px solid #e5e7eb;
}
.ev-meta {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.ev-meta label {
  font-size: 12px;
  color: #374151;
  display: block;
}
.ev-meta select,
.ev-meta input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 13px;
  margin-top: 2px;
}
.ev-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: #6b7280;
}
.ev-palette button {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 11px;
}
.ev-block {
  margin-bottom: 12px;
}
.eb-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}
.eb-move button {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 6px;
  padding: 2px 7px;
  cursor: pointer;
  margin-left: 3px;
  font-size: 12px;
}
.eb-move button.danger {
  color: #e11d48;
  border-color: #fecdd3;
}
.empty {
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  padding: 20px;
}
.ev-right {
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
}
.ev-prev-title {
  font-size: 12px;
  color: #6b7280;
  padding: 8px 16px;
}
.ev-preview {
  flex: 1;
  border: none;
  background: #fff;
  margin: 0 16px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
</style>
