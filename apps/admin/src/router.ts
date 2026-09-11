import { createRouter, createWebHistory } from 'vue-router';
import AdminLayout from './layouts/AdminLayout.vue';
import PosterView from './views/PosterView.vue';
import SyncView from './views/SyncView.vue';
import ConfigView from './views/ConfigView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AdminLayout,
      redirect: '/poster',
      children: [
        { path: 'poster', name: 'poster', component: PosterView, meta: { title: '海报数据' } },
        { path: 'sync', name: 'sync', component: SyncView, meta: { title: '同步' } },
        { path: 'config', name: 'config', component: ConfigView, meta: { title: '品牌配置' } },
      ],
    },
  ],
});

export default router;
