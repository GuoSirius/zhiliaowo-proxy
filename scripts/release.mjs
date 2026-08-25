#!/usr/bin/env node
/**
 * 交互式发布脚本：npm run release
 *
 * 流程：
 *  1. 门禁：依次跑类型检查(typecheck) 与 测试(test)，任一失败即中止
 *  2. 未提交检测：若有未提交文件，提示输入提交信息并二次确认后先提交
 *  3. 发版选择：↑/↓ 切换 patch / minor / major，每次切换实时显示
 *     本次新版本号 + 该版本将包含的变更(changelog 预览)
 *  4. 确认后自动：bump 版本号 → 更新 CHANGELOG.md → 提交 → 打 tag → 推送
 *
 * 纯 Node 内置能力实现（无第三方依赖），交互部分用 raw mode 处理方向键。
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const RELEASE_TYPES = [
  { type: 'patch', label: 'patch  (修复 / 补丁)' },
  { type: 'minor', label: 'minor  (新功能，向下兼容)' },
  { type: 'major', label: 'major  (破坏性变更)' },
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

async function confirm(question) {
  const a = (await ask(question)).trim().toLowerCase();
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

/** 取上次 tag 到 HEAD 的提交，无 tag 则取全部 */
function getCommits() {
  let range = '';
  try {
    const lastTag = sh('git describe --tags --abbrev=0');
    if (lastTag) range = `${lastTag}..HEAD`;
  } catch {
    /* 无 tag */
  }
  const out = sh(`git log ${range} --pretty=format:%s`);
  return out ? out.split('\n') : [];
}

function groupCommits(lines) {
  const g = { feat: [], fix: [], chore: [], other: [] };
  const choreTypes = ['chore', 'docs', 'refactor', 'test', 'style', 'perf', 'build', 'ci'];
  for (const raw of lines) {
    const s = raw.trim();
    if (!s) continue;
    const m = s.match(/^(\w+)(\([^)]*\))?(!)?:\s*(.*)$/);
    const t = m ? m[1].toLowerCase() : 'other';
    if (t === 'feat') g.feat.push(s);
    else if (t === 'fix') g.fix.push(s);
    else if (choreTypes.includes(t)) g.chore.push(s);
    else g.other.push(s);
  }
  return g;
}

function renderChangelog(g) {
  const block = (icon, title, items) =>
    items.length ? `${icon} ${title}\n` + items.map((i) => `    - ${i}`).join('\n') + '\n' : '';
  const body =
    block('🚀', 'Enhancements', g.feat) +
    block('🩹', 'Fixes', g.fix) +
    block('💡', 'Others', [...g.chore, ...g.other]);
  return body || '    (无提交记录)';
}

/** 渲染可选发版类型列表（高亮当前项） + 当前/新版本 + changelog 预览 */
function renderScreen(currentVersion, selectedType, groups) {
  const lines = [];
  lines.push(`当前版本: v${currentVersion}`);
  lines.push('');
  lines.push('↑/↓ 切换发版类型,  Enter 确认,  Ctrl+C 取消');
  lines.push('');
  for (const opt of RELEASE_TYPES) {
    const nv = bump(currentVersion, opt.type);
    const mark = opt.type === selectedType ? '●' : ' ';
    lines.push(`${mark} ${opt.label.padEnd(28)} →  v${nv}`);
  }
  lines.push('');
  lines.push(`—— 选择 v${bump(currentVersion, selectedType)} 将包含的变更 ——`);
  lines.push(renderChangelog(groups));
  return lines.join('\n');
}

/** 方向键选择发版类型，每次切换重绘屏幕 */
function selectRelease(currentVersion, groups) {
  return new Promise((resolve, reject) => {
    let idx = 0;
    const draw = () => {
      const screen = renderScreen(currentVersion, RELEASE_TYPES[idx].type, groups);
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
        process.stdout.write('\n\n已取消发布。\n');
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

// ---------- CHANGELOG 更新 ----------

function updateChangelog(version, groups) {
  const date = new Date().toISOString().slice(0, 10);
  const entry = `\n## v${version} (${date})\n\n${renderChangelog(groups)}\n`;
  let content = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : '';
  if (!content) {
    content = '# Changelog\n' + entry;
  } else {
    const nl = content.indexOf('\n');
    const head = content.slice(0, nl);
    const rest = content.slice(nl);
    content = head + entry + rest;
  }
  writeFileSync('CHANGELOG.md', content);
}

// ---------- 主流程 ----------

async function main() {
  // 1. 门禁
  run('npm run typecheck');
  run('npm test');

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
    if (!(await confirm(`确认用 "${msg}" 提交并继续发布？(y/N) `))) {
      console.error('已取消。');
      process.exit(1);
    }
    run('git add -A');
    execSync(`git commit -m ${JSON.stringify(msg)}`, { stdio: 'inherit' });
  }

  // 3. 发版选择
  const pkg = readPkg();
  const currentVersion = pkg.version;
  const groups = groupCommits(getCommits());
  let selected;
  try {
    selected = await selectRelease(currentVersion, groups);
  } catch {
    process.exit(1);
  }

  const newVersion = bump(currentVersion, selected);
  process.stdout.write(`\n\n确认发布 v${newVersion}\n`);

  // 4. 自动发布
  const pkgNow = readPkg();
  pkgNow.version = newVersion;
  writeFileSync('package.json', JSON.stringify(pkgNow, null, 2) + '\n');
  updateChangelog(newVersion, groups);

  run('git add package.json CHANGELOG.md');
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
