<template>
  <div class="json-field">
    <label>{{ label }}</label>
    <textarea v-model="text" rows="6" spellcheck="false" @blur="tryApply"></textarea>
    <div class="jf-actions">
      <button type="button" @click="tryApply">应用</button>
      <span v-if="err" class="jf-err">JSON 错误：{{ err }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ label: string; value: unknown }>();
const emit = defineEmits<{ apply: [value: any] }>();

const text = ref(JSON.stringify(props.value, null, 2));
const err = ref('');

watch(
  () => props.value,
  (v) => {
    text.value = JSON.stringify(v, null, 2);
    err.value = '';
  },
);

function tryApply() {
  try {
    const v = JSON.parse(text.value);
    err.value = '';
    emit('apply', v);
  } catch (e) {
    err.value = (e as Error).message;
  }
}
</script>

<style scoped>
.json-field {
  margin: 6px 0;
}
label {
  display: block;
  font-size: 12px;
  color: #374151;
  margin-bottom: 2px;
}
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.jf-actions {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
button {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
}
.jf-err {
  color: #e11d48;
  font-size: 11px;
}
</style>
