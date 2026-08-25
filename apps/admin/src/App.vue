<template>
  <ListView v-if="view === 'list'" @edit="openEdit" @create="openCreate" />
  <EditorView v-else @back="closeEditor" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useH5Store } from './stores/h5';
import ListView from './views/ListView.vue';
import EditorView from './views/EditorView.vue';

const store = useH5Store();
const view = ref<'list' | 'editor'>('list');

async function openEdit(id: string) {
  await store.loadDoc(id);
  view.value = 'editor';
}
function openCreate() {
  store.newDoc();
  view.value = 'editor';
}
async function closeEditor() {
  view.value = 'list';
  await store.loadList();
}
</script>
