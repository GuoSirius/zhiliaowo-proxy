#!/usr/bin/env node
/**
 * 交互式发布脚本：npm run release
 *
 * 流程：
 *  1. 门禁：依次跑类型检查(typecheck) 与 测试(test)，任一失败即中止
 *  2. 未提交检测：若有未提交文件，提示输入提交信息并二次确认后先提交
 *  3. 发版选择：↑/↓ 切换 patch / minor / major，每次切换实时显示
 *     本次新版本号（紧凑界面，不打印 changelog 以免干扰类型选择）
 *  4. 确认后自动：bump 版本号 → 交 changelogen 更新 CHANGELOG.md →
 *     提交 → 打 tag → 推送
 *
 * 纯 Node 内置能力实现（无第三方依赖），交互部分用 raw mode 处理方向键。
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// ---------- 终端样式（纯 ANSI，无第三方依赖） ----------
const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const C = USE_COLOR
  ? {
      reset: '\x1B[0m',
      bold: '\x1B[1m',
      dim: '\x1B[2m',
      green: '\x1B[32m',
      blue: '\x1B[34m',
      yellow: '\x1B[33m',
      cyan: '\x1B[36m',
      white: '\x1B[97m',
      bgBlue: '\x1B[44m',
    }
  : new Proxy({}, { get: () => '' });

// 显示宽度（宽字符按 2 计，用于终端对齐）
function isWide(ch) {
  const cp = ch.codePointAt(0);
  return (
    cp >= 0x1100 &&
    (cp <= 0x115f ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe4f) ||
      (cp >= 0xff00 && cp <= 0xffef))
  );
}
function dispLen(s) {
  let n = 0;
  for (const ch of s) n += isWide(ch) ? 2 : 1;
  return n;
}
function padDisp(s, width) {
  return s + ' '.repeat(Math.max(0, width - dispLen(s)));
}

const RELEASE_TYPES = [
  { type: 'patch', label: 'patch', desc: '修复 / 补丁', color: C.green },
  { type: 'minor', label: 'minor', desc: '新功能（向下兼容）', color: C.blue },
  { type: 'major', label: 'major', desc: '破坏性变更', color: C.yellow },
];

// ---------- 基础工具 ----------

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.error(`\n✖ 步骤失败，已中止：${cmd}`);
    process.exit(1);
  }
}

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function ask(question) {
  const rl = createInterface({ input, output });
  return rl.question(question).finally(() => rl.close());
}

async function confirm(question, defaultYes = false) {
  const a = (await ask(question)).trim().toLowerCase();
  if (a === '') return defaultYes;
  return a === 'y' || a === 'yes';
}

// ---------- 版本与变更计算 ----------

function readPkg() {
  return JSON.parse(readFileSync('package.json', 'utf8'));
}

function bump(version, type) {
  const [maj, min, pat] = version.split('.').map(Number);
  if (type === 'major') return `${maj + 1}.0.0`;
  if (type === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

/** 发版时把所有 workspace 包的 version 与根包对齐，避免各包版本漂移 */
const WORKSPACE_PKGS = [
  'apps/proxy/package.json',
  'apps/admin/package.json',
  'apps/h5/package.json',
  'packages/core/package.json',
];

function syncVersions(version) {
  for (const rel of WORKSPACE_PKGS) {
    const p = JSON.parse(readFileSync(rel, 'utf8'));
    p.version = version;
    writeFileSync(rel, JSON.stringify(p, null, 2) + '\n');
    console.log(`  • ${rel} → ${version}`);
  }
}

/** 渲染可选发版类型列表（高亮当前项） + 当前/新版本。
 * 紧凑界面：不打印 changelog，避免干扰类型选择。 */
const PAD = 2; // 统一缩进
const SELECT_W = 42; // 选项主体补齐到的显示宽度，使版本号右对齐
const RULE_W = 52; // 上下分隔线宽度（= SELECT_W + 版本号宽度）

function renderScreen(currentVersion, selectedType) {
  const pad = ' '.repeat(PAD);
  const lines = [];
  lines.push('');
  lines.push(`${pad}${C.bold}${C.cyan}当前版本  ${C.white}v${currentVersion}${C.reset}`);
  lines.push('');
  lines.push(pad + C.dim + '─'.repeat(RULE_W) + C.reset);
  for (const opt of RELEASE_TYPES) {
    const nv = bump(currentVersion, opt.type);
    const sel = opt.type === selectedType;
    const arrow = sel ? '▶' : ' ';
    if (sel) {
      const body = `${arrow} ${opt.label}  ${opt.desc}`;
      const row = padDisp(body, SELECT_W) + ` → ${C.white}v${nv}`;
      lines.push(pad + C.bgBlue + C.bold + row + C.reset);
    } else {
      const body = `${arrow} ${C.bold}${opt.color}${opt.label}${C.reset}  ${C.dim}${opt.desc}${C.reset}`;
      lines.push(pad + padDisp(body, SELECT_W) + ` ${C.dim}→ v${nv}${C.reset}`);
    }
  }
  lines.push(pad + C.dim + '─'.repeat(RULE_W) + C.reset);
  lines.push('');
  lines.push(`${pad}${C.dim}↑/↓ 切换      Enter 确认      Ctrl+C 取消${C.reset}`);
  return lines.join('\n');
}

/** 方向键选择发版类型，每次切换重绘屏幕 */
function selectRelease(currentVersion) {
  return new Promise((resolve, reject) => {
    let idx = 0;
    const draw = () => {
      const screen = renderScreen(currentVersion, RELEASE_TYPES[idx].type);
      process.stdout.write('\x1B[2J\x1B[3J\x1B[H' + screen);
    };
    const onData = (buf) => {
      const k = buf.toString();
      if (k === '\x1B[A') idx = (idx - 1 + RELEASE_TYPES.length) % RELEASE_TYPES.length;
      else if (k === '\x1B[B') idx = (idx + 1) % RELEASE_TYPES.length;
      else if (k === '\r' || k === '\n') {
        cleanup();
        resolve(RELEASE_TYPES[idx].type);
        return;
      } else if (k === '\x03') {
        cleanup();
        process.stdout.write(`\n\n${C.dim}已取消发布。${C.reset}\n`);
        reject(new Error('cancelled'));
        return;
      } else {
        return;
      }
      draw();
    };
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener('data', onData);
      process.stdin.pause();
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
    draw();
  });
}

// ---------- 主流程 ----------

async function main() {
  // 1. 门禁（monorepo：所有 workspace 跑类型检查与测试）
  run('pnpm -r typecheck');
  run('pnpm -r test');

  // 2. 未提交检测
  const status = sh('git status --porcelain');
  if (status) {
    console.log('\n⚠ 发现未提交的文件：');
    console.log(status);
    const msg = (await ask('请输入提交信息（约定式，如 "feat: ..."）：')).trim();
    if (!msg) {
      console.error('提交信息为空，已取消。');
      process.exit(1);
    }
    if (!(await confirm(`确认用 "${msg}" 提交并继续发布？(Y/n) `, true))) {
      console.error('已取消。');
      process.exit(1);
    }
    run('git add -A');
    execSync(`git commit -m ${JSON.stringify(msg)}`, { stdio: 'inherit' });
  }

  // 3. 发版选择
  const pkg = readPkg();
  const currentVersion = pkg.version;
  let selected;
  try {
    selected = await selectRelease(currentVersion);
  } catch {
    process.exit(1);
  }

  const newVersion = bump(currentVersion, selected);
  process.stdout.write(`\n\n${C.bold}${C.green}✔ 确认发布 ${C.white}v${newVersion}${C.reset}\n`);

  // 4. 自动发布：changelogen 按选定类型 bump 根包版本号 + 增量写中文 CHANGELOG（与 changelog.config.js 对齐）
  run(`pnpm exec changelogen --${selected} --bump`);
  //    再把所有 workspace 包（proxy/admin/h5/core）的 version 同步为同一新版本，保证发布一致
  syncVersions(newVersion);

  run(`git add package.json CHANGELOG.md ${WORKSPACE_PKGS.join(' ')}`);
  execSync(`git commit -m ${JSON.stringify(`chore(release): v${newVersion}`)}`, { stdio: 'inherit' });
  run(`git tag v${newVersion}`);

  const branch = sh('git rev-parse --abbrev-ref HEAD');
  run(`git push origin ${branch}`);
  run('git push origin --tags');

  console.log(`\n✅ 已发布 v${newVersion} 并推送 (branch=${branch})`);
}

main().catch((e) => {
  console.error(e?.message ? `\n✖ ${e.message}` : e);
  process.exit(1);
});
