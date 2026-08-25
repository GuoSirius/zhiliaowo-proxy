export default {
  repo: 'https://github.com/GuoSirius/zhiliaowo-proxy',
  types: [
    { types: ['feat'], title: '🚀 Enhancements' },
    { types: ['fix'], title: '🩹 Fixes' },
    { types: ['chore', 'docs', 'refactor', 'test'], title: '💡 Others' },
  ],
  // 不使用 jiti 时也能跑；生成 CHANGELOG.md 后追加而非覆盖
  output: 'CHANGELOG.md',
}
