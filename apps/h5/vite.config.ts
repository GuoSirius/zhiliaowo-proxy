import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite';
import { fileURLToPath, URL } from 'node:url';

// base 用相对路径，方便 proxy 经 /h5/:id 静态托管或独立部署
export default defineConfig(({ mode }) => {
  // 统一从仓库根 .env 读取（端口 / API base 等集中管理）
  const rootEnv = fileURLToPath(new URL('../..', import.meta.url));
  const env = loadEnv(mode, rootEnv, '');
  const h5Port = Number(env.DEV_PORT_H5 ?? 5174);

  return {
    envDir: rootEnv,
    base: './',
    plugins: [vue(), UnoCSS()],
    resolve: {
      alias: {
        '@zhiliaowo/core': fileURLToPath(new URL('../../packages/core/src', import.meta.url)),
      },
    },
    server: { port: h5Port },
  };
});
