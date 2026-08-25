/**
 * commitlint 配置 —— 遵循 Conventional Commits 规范
 * 这里把"常规开发团队通用"的 type 显式列出来，便于团队统一认知与维护。
 *
 * type 取值与含义：
 *   feat     新功能
 *   fix      修复缺陷
 *   docs     文档变更（README、注释、CHANGELOG 等）
 *   style    代码格式调整（不影响逻辑，如缩进、分号、空格）
 *   refactor 重构（既不是新增功能也不是修复缺陷）
 *   perf     性能优化
 *   test     增加或修改测试
 *   build    构建系统 / 外部依赖变动（如 webpack、依赖版本管理）
 *   ci       CI 配置文件与脚本修改（如 GitHub Actions、husky）
 *   chore    其他不改动 src 或 test 的杂项（如配置、脚本工具）
 *   revert   回滚之前的某次提交
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
