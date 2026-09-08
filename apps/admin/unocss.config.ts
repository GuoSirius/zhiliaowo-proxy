// 管理后台（@zhiliaowo/admin）UnoCSS 配置
// 注：preset 故意内联而未抽到 packages/core 共享：core 没装 unocss，
//   抽过去会触发 core 的 tsc 编译报 "Cannot find module 'unocss'"。
// 改 preset 时仅需维护本文件（原 apps/h5 展示页已移除，无第二处需同步）。
import { defineConfig, presetAttributify, presetTypography, presetUno } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(), // 工具类（Tailwind/Windi 风格）
    presetAttributify(), // 属性化模式：<div m="2" text="red" />
    presetTypography(), // 排版预设（prose 类）
  ],
  // 暂不开启 presetIcons：catalog 未装 @iconify-json/* 图标数据集
});
