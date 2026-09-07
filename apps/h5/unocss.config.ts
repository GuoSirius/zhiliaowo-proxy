// H5 端（@zhiliaowo/h5）UnoCSS 配置
// 注：preset 故意内联而未抽到 packages/core 共享：core 没装 unocss，
//   抽过去会触发 core 的 tsc 编译报 "Cannot find module 'unocss'"。
// 改 preset 时 apps/admin 与 apps/h5 保持同步。
import { defineConfig, presetAttributify, presetTypography, presetUno } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetTypography(),
  ],
  // 暂不开启 presetIcons：catalog 未装 @iconify-json/* 图标数据集
});
