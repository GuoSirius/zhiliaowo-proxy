/**
 * pm2 部署配置（配合宝塔 Windows 面板）
 * 环境变量（appId 等敏感信息）由系统/面板注入，勿在此硬编码。
 */
module.exports = {
  apps: [
    {
      name: 'zhiliaowo-proxy',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
