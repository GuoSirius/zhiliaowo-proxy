// H5 导出 —— PNG 图片（Puppeteer 对静态 HTML 截图）
// 依赖 puppeteer + 本地 Chromium；若运行环境无 Chromium，抛出明确错误，不静默失败。
import puppeteer from 'puppeteer';
import { renderToHtml } from './html.js';
import type { H5Doc } from '@zhiliaowo/core';

export interface PngOptions {
  width?: number;
  scale?: number;
}

/**
 * 将 H5 文档渲染为 PNG 图片（Buffer）。
 * 失败（如 Chromium 缺失）时抛出带上下文的错误，由路由层转译为 502/500。
 */
export async function renderToPng(doc: H5Doc, opts: PngOptions = {}): Promise<Buffer> {
  const width = opts.width ?? 480;
  const scale = opts.scale ?? 2;
  const html = renderToHtml(doc);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (e) {
    throw new Error(`PNG 导出失败：无法启动浏览器（确认已安装 Chromium）。原因：${(e as Error).message}`);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 800, deviceScaleFactor: scale });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const root = await page.$('.h5-root');
    if (!root) throw new Error('PNG 导出失败：未找到 .h5-root 节点');
    const buf = await root.screenshot({ type: 'png' });
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  } finally {
    await browser.close();
  }
}
