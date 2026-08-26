// dev 启动包装器：在 pnpm -r --parallel 下，pnpm 会给每个 dev 子进程一个
// “保持打开但不发数据”的 stdin 管道。tsx watch 会等待 stdin 输入（类似 nodemon
// 的键盘交互），结果卡死、永不执行 index.ts，表现为 proxy 3000 起不来但单独启动正常。
//
// 这里用 stdio: ['ignore', ...] 给 tsx 子进程一个 EOF 的 stdin，强制它直接运行；
// stdout/stderr 仍继承以透传热更新日志。跨 shell（cmd/PowerShell/git-bash）均稳健。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findTsxCli() {
  const candidates = [
    resolve(__dirname, 'node_modules/tsx/dist/cli.mjs'),
    resolve(__dirname, '../../node_modules/tsx/dist/cli.mjs'),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error('[dev.mjs] 找不到 tsx/dist/cli.mjs，请先安装 tsx');
}

const tsxCli = findTsxCli();

const child = spawn(
  process.execPath,
  [tsxCli, 'watch', 'index.ts'],
  {
    cwd: __dirname,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env,
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    try { process.kill(process.pid, signal); } catch { /* ignore */ }
  } else {
    process.exit(code ?? 0);
  }
});

// 透传 Ctrl-C / 终止信号，确保常驻的 Hono 服务随 dev 一起优雅退出
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    try { child.kill(sig); } catch { /* ignore */ }
  });
}
