export default {
  repo: 'https://github.com/GuoSirius/zhiliaowo-proxy',
  // 与 commitlint 的 11 类 type 对齐：以 type 名为 key 的对象（changelogen 0.6 格式）
  // 每个 type 一个语义分组，标题用「emoji + 中文 (英文)」
  types: {
    feat: { title: '🚀 新功能 (Features)', semver: 'minor' },
    fix: { title: '🐛 缺陷修复 (Bug Fixes)', semver: 'patch' },
    perf: { title: '⚡ 性能优化 (Performance)', semver: 'patch' },
    refactor: { title: '♻️ 代码重构 (Refactors)', semver: 'patch' },
    docs: { title: '📚 文档 (Documentation)', semver: 'patch' },
    test: { title: '🧪 测试 (Tests)', semver: 'patch' },
    build: { title: '🔧 构建 (Build)', semver: 'patch' },
    ci: { title: '⚙️ 持续集成 (CI)', semver: 'patch' },
    chore: { title: '📦 杂项维护 (Chores)', semver: 'patch' },
    style: { title: '🎨 代码格式 (Style)', semver: 'patch' },
    revert: { title: '⏪ 回滚 (Reverts)', semver: 'patch' },
  },
  output: 'CHANGELOG.md',
}
