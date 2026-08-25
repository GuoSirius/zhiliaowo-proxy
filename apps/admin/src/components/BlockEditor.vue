<template>
  <div class="blk-editor">
    <div class="be-head">
      <span class="be-type">{{ block.type }}</span>
      <label class="be-vis">
        <input type="checkbox" v-model="block.visible" /> 显示
      </label>
    </div>

    <!-- BrandHeader -->
    <template v-if="block.type === 'BrandHeader'">
      <label>Logo URL<input v-model="block.props.logoUrl" /></label>
      <label>Slogan<input v-model="block.props.slogan" /></label>
    </template>

    <!-- TitleBar -->
    <template v-else-if="block.type === 'TitleBar'">
      <label>标题<input v-model="block.props.title" /></label>
      <label>副标题<input v-model="block.props.subtitle" /></label>
    </template>

    <!-- StatCardGroup -->
    <template v-else-if="block.type === 'StatCardGroup'">
      <div v-for="(c, i) in block.props.cards" :key="i" class="be-row">
        <input v-model="c.label" placeholder="标签" />
        <input type="number" v-model.number="c.value" placeholder="数值" />
        <input v-model="c.unit" placeholder="单位" />
        <input type="number" v-model.number="c.trend" placeholder="趋势%" />
        <button @click="block.props.cards.splice(i, 1)">×</button>
      </div>
      <button @click="block.props.cards.push({ label: '指标', value: 0, unit: '', trend: 0 })">+ 卡片</button>
    </template>

    <!-- BarChart -->
    <template v-else-if="block.type === 'BarChart'">
      <label>标题<input v-model="block.props.title" /></label>
      <div v-for="(p, i) in block.props.points" :key="i" class="be-row">
        <input v-model="p.name" placeholder="名称" />
        <input type="number" v-model.number="p.value" placeholder="数值" />
        <button @click="block.props.points.splice(i, 1)">×</button>
      </div>
      <button @click="block.props.points.push({ name: '新项', value: 0 })">+ 数据点</button>
    </template>

    <!-- QuarterGrid -->
    <template v-else-if="block.type === 'QuarterGrid'">
      <div v-for="(it, i) in block.props.items" :key="i" class="be-row">
        <input v-model="it.label" placeholder="标签" />
        <input type="number" v-model.number="it.value" placeholder="数值" />
        <button @click="block.props.items.splice(i, 1)">×</button>
      </div>
      <button @click="block.props.items.push({ label: '新项', value: 0 })">+ 项</button>
    </template>

    <!-- SummaryList -->
    <template v-else-if="block.type === 'SummaryList'">
      <div v-for="(it, i) in block.props.items" :key="i" class="be-row">
        <input v-model="it.icon" placeholder="图标" />
        <input v-model="it.text" placeholder="文字" />
        <button @click="block.props.items.splice(i, 1)">×</button>
      </div>
      <button @click="block.props.items.push({ icon: '•', text: '新要点' })">+ 要点</button>
    </template>

    <!-- KeywordTags -->
    <template v-else-if="block.type === 'KeywordTags'">
      <label>标签（逗号分隔）<input v-model="tagsText" @blur="applyTags" /></label>
    </template>

    <!-- JSON 编辑型：Article / PaperList / ProductCard / BrandFooter.contact -->
    <template v-else-if="block.type === 'ArticleBlock'">
      <label>摘要<textarea v-model="block.props.abstract" rows="3"></textarea></label>
      <JsonField label="文献对象 paper" :value="block.props.paper" @apply="(v) => (block.props.paper = v)" />
    </template>
    <template v-else-if="block.type === 'PaperListBlock'">
      <label>最多展示<input type="number" v-model.number="block.props.max" /></label>
      <JsonField label="文献数组 papers" :value="block.props.papers" @apply="(v) => (block.props.papers = v)" />
    </template>
    <template v-else-if="block.type === 'ProductCard'">
      <JsonField label="产品数组 products" :value="block.props.products" @apply="(v) => (block.props.products = v)" />
    </template>
    <template v-else-if="block.type === 'BrandFooter'">
      <label>二维码 URL<input v-model="block.props.qrUrl" /></label>
      <JsonField label="联系方式 contact" :value="block.props.contact" @apply="(v) => (block.props.contact = v)" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import JsonField from './JsonField.vue';

// 区块 props 结构随 type 变化，整体以 any 承载，由各分支自行约束字段
const block = defineModel<any>({ required: true });

const tagsText = ref((block.value.props.tags || []).join(', '));
watch(
  () => block.value.props.tags,
  (t) => (tagsText.value = (t || []).join(', ')),
);
function applyTags() {
  block.value.props.tags = tagsText.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
</script>

<style scoped>
.blk-editor {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
}
.be-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.be-type {
  font-weight: 700;
  font-size: 13px;
  color: #2563eb;
}
.be-vis {
  font-size: 12px;
  color: #6b7280;
}
label {
  display: block;
  font-size: 12px;
  color: #374151;
  margin: 6px 0;
}
input,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 13px;
  margin-top: 2px;
}
.be-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 4px 0;
}
.be-row input {
  flex: 1;
  margin-top: 0;
}
button {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}
</style>
