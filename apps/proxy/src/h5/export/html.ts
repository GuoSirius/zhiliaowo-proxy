// H5 导出 —— 静态 HTML（自包含，含内联样式 + 主题变量）
// 直接复用 core 的纯函数渲染器（单一事实源），不在此处另起一套。
import { renderDocToHtml, type H5Doc } from '@zhiliaowo/core';

/** 渲染为自包含 HTML 字符串（用于下载 / PNG 截图底稿 / 分享页降级） */
export function renderToHtml(doc: H5Doc): string {
  return renderDocToHtml(doc);
}
