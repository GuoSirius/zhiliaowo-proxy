import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  // 统一从仓库根 .env 读取（端口 / API base 等集中管理）
  const rootEnv = fileURLToPath(new URL('../..', import.meta.url));
  const env = loadEnv(mode, rootEnv, '');
  const proxyPort = Number(env.DEV_PORT_PROXY ?? 3000);
  const adminPort = Number(env.DEV_PORT_ADMIN ?? 5173);

  return {
    envDir: rootEnv,
    plugins: [vue(), UnoCSS()],
    resolve: {
      alias: {
        // 共享层：直接指向 workspace 内 packages/core 源码，免 pnpm install 即可热更
        '@zhiliaowo/core': fileURLToPath(new URL('../../packages/core/src', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: adminPort,
      proxy: {
        // 管理后台 API 代理到 zhiliaowo-proxy（端口由 DEV_PORT_PROXY 统一管理）
        '/api': `http://localhost:${proxyPort}`,
      },
    },
  };
});
