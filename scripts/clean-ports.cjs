#!/usr/bin/env node
/**
 * dev 启动前清理占用 dev 端口（3000/5173/5174）的残留进程。
 * 解决：tsx watch / vite 在 Ctrl-C 时偶尔残留子进程占端口，
 * 导致新一轮 `pnpm dev` 里 proxy 因 EADDRINUSE 静默崩溃（前端照常起、proxy 起不来）。
 * 跨平台：Windows 用 netstat+taskkill，POSIX 用 lsof+kill。
 */
const { execSync } = require('child_process');

const PORTS = [3000, 5173, 5174];
const isWin = process.platform === 'win32';

function killPid(pid) {
  try {
    if (isWin) execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    else execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

let freed = 0;
for (const port of PORTS) {
  let out = '';
  try {
    if (isWin) {
      out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', shell: true });
    } else {
      out = execSync(`lsof -ti tcp:${port} || true`, { encoding: 'utf8', shell: true });
    }
  } catch {
    continue; // 端口无人占用
  }
  const pids = new Set();
  if (isWin) {
    for (const line of out.split('\n')) {
      const m = line.match(/LISTENING\s+(\d+)/);
      if (m) pids.add(m[1]);
    }
  } else {
    for (const p of out.split('\n')) {
      const t = p.trim();
      if (t) pids.add(t);
    }
  }
  for (const pid of pids) {
    if (pid && /^\d+$/.test(pid) && killPid(pid)) {
      console.log(`[clean-ports] 释放 :${port}（已结束残留进程 PID ${pid}）`);
      freed++;
    }
  }
}

if (freed === 0) console.log('[clean-ports] 端口 3000/5173/5174 均无残留占用，无需清理');
else console.log(`[clean-ports] 共清理 ${freed} 个残留进程`);
