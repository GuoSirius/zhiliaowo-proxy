// zhiliaowo-core — 纯函数 HTML 渲染器（无框架依赖）
// 作为「单一事实源」：后端导出（静态 HTML / PNG / Vue 单页）与 h5 展示降级共用。
// 视觉与 apps/h5 的 Vue 区块组件保持一致（同套 CSS 变量与类名）。
import type {
  H5Doc,
  BlockNode,
  BrandTheme,
  BrandHeaderProps,
  TitleBarProps,
  StatCardGroupProps,
  BarChartProps,
  QuarterGridProps,
  SummaryListProps,
  PaperListBlockProps,
  ArticleBlockProps,
  KeywordTagsProps,
  ProductCardProps,
  BrandFooterProps,
  PaperItem,
  PaperProduct,
} from './types';

/** HTML 转义，防 XSS */
function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 主题 → CSS 变量（内联到根节点 style） */
export function themeToCssVars(theme: BrandTheme): string {
  return [
    `--brand-primary:${theme.primary}`,
    `--brand-primary-dark:${theme.primaryDark}`,
    `--brand-gradient:${theme.gradient}`,
    `--brand-name:${theme.name}`,
    `--brand-slogan:${esc(theme.slogan)}`,
  ].join(';');
}

function imgTag(src: string, alt: string, cls = ''): string {
  if (!src) return '';
  return `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`;
}

// ---------- 各区块渲染 ----------

function renderBrandHeader(p: BrandHeaderProps, theme: BrandTheme): string {
  const logo = p.logoUrl || theme.logoUrl;
  const slogan = p.slogan || theme.slogan;
  return `
  <header class="blk-brand-header" style="background:var(--brand-gradient)">
    <div class="bh-logo">${logo ? imgTag(logo, theme.name, 'bh-logo-img') : `<span class="bh-initial">${esc((theme.name || 'Z').charAt(0))}</span>`}</div>
    <div class="bh-text">
      <div class="bh-name">${esc(theme.name)}</div>
      ${slogan ? `<div class="bh-slogan">${esc(slogan)}</div>` : ''}
    </div>
  </header>`;
}

function renderTitleBar(p: TitleBarProps): string {
  return `
  <section class="blk-titlebar">
    <h1 class="tb-title">${esc(p.title)}</h1>
    ${p.subtitle ? `<p class="tb-sub">${esc(p.subtitle)}</p>` : ''}
  </section>`;
}

function renderStatCardGroup(p: StatCardGroupProps): string {
  const cards = p.cards
    .map((c) => {
      const trend = typeof c.trend === 'number' && c.trend !== 0
        ? `<span class="sc-trend ${c.trend > 0 ? 'up' : 'down'}">${c.trend > 0 ? '▲' : '▼'} ${Math.abs(c.trend)}%</span>`
        : '';
      return `
      <div class="sc-card">
        <div class="sc-label">${esc(c.label)}</div>
        <div class="sc-value">${esc(c.value)}${c.unit ? `<span class="sc-unit">${esc(c.unit)}</span>` : ''}</div>
        ${trend}
      </div>`;
    })
    .join('');
  return `<section class="blk-statcards"><div class="sc-grid">${cards}</div></section>`;
}

function renderBarChart(p: BarChartProps): string {
  const max = Math.max(1, ...p.points.map((pt) => pt.value));
  const bars = p.points
    .map((pt) => {
      const h = Math.round((pt.value / max) * 100);
      return `
      <div class="bc-col">
        <div class="bc-bar-wrap"><div class="bc-bar" style="height:${h}%"></div></div>
        <div class="bc-val">${esc(pt.value)}</div>
        <div class="bc-name">${esc(pt.name)}</div>
      </div>`;
    })
    .join('');
  return `
  <section class="blk-barchart">
    <h2 class="bc-title">${esc(p.title)}</h2>
    <div class="bc-chart">${bars}</div>
  </section>`;
}

function renderQuarterGrid(p: QuarterGridProps): string {
  const cells = p.items
    .map((it) => `
      <div class="qg-cell">
        <div class="qg-value">${esc(it.value)}</div>
        <div class="qg-label">${esc(it.label)}</div>
      </div>`)
    .join('');
  return `<section class="blk-quartergrid"><div class="qg-grid">${cells}</div></section>`;
}

function renderSummaryList(p: SummaryListProps): string {
  const items = p.items
    .map((it) => `
      <li class="sl-item"><span class="sl-icon">${esc(it.icon || '•')}</span><span class="sl-text">${esc(it.text)}</span></li>`)
    .join('');
  return `<section class="blk-summarylist"><ul class="sl-list">${items}</ul></section>`;
}

function renderPaperItemRow(paper: PaperItem): string {
  const year = (paper.pubTime || '').slice(0, 4);
  return `
  <li class="pl-item">
    <div class="pl-journal">${esc(paper.journal)}</div>
    <div class="pl-title">${esc(paper.title)}</div>
    <div class="pl-meta">
      <span class="pl-factor">IF ${esc(paper.factor)}</span>
      ${year ? `<span class="pl-year">${esc(year)}</span>` : ''}
      ${paper.authors ? `<span class="pl-authors">${esc(paper.authors)}</span>` : ''}
    </div>
  </li>`;
}

function renderPaperListBlock(p: PaperListBlockProps): string {
  const papers = (p.max ? p.papers.slice(0, p.max) : p.papers).map(renderPaperItemRow).join('');
  return `<section class="blk-paperlist"><ul class="pl-list">${papers}</ul></section>`;
}

function renderArticleBlock(p: ArticleBlockProps): string {
  const paper = p.paper;
  const keywords = (paper.cnFields || []).map((k) => `<span class="kt-tag">${esc(k)}</span>`).join('');
  const products = (paper.products || [])
    .map((pr: PaperProduct) => `
      <div class="pd-card">
        <div class="pd-name">${esc(pr.goodsLabel)}</div>
        ${pr.application ? `<div class="pd-app">${esc(pr.application)}</div>` : ''}
        ${pr.target ? `<div class="pd-target">靶点：${esc(pr.target)}</div>` : ''}
      </div>`)
    .join('');
  const pics = (paper.products || [])
    .flatMap((pr) => pr.paperProductPictureList || [])
    .map((pic) => `
      <figure class="exp-fig">
        ${imgTag(pic.picUrl, pic.description, 'exp-img')}
        <figcaption>${esc(pic.description)}</figcaption>
      </figure>`)
    .join('');
  return `
  <section class="blk-article">
    ${paper.feature ? `<div class="ar-cover">${imgTag(paper.feature, 'cover', 'ar-cover-img')}</div>` : ''}
    <h2 class="ar-title">${esc(paper.title)}</h2>
    <div class="ar-meta">
      <span class="ar-journal">${esc(paper.journal)}</span>
      <span class="ar-factor">IF ${esc(paper.factor)}</span>
      ${paper.authors ? `<span class="ar-authors">${esc(paper.authors)}</span>` : ''}
    </div>
    ${p.abstract ? `<p class="ar-abstract">${esc(p.abstract)}</p>` : ''}
    ${keywords ? `<div class="ar-keywords">${keywords}</div>` : ''}
    ${products ? `<div class="ar-products"><h3>推荐产品</h3><div class="pd-grid">${products}</div></div>` : ''}
    ${pics ? `<div class="ar-pics"><h3>实验图</h3><div class="exp-grid">${pics}</div></div>` : ''}
  </section>`;
}

function renderKeywordTags(p: KeywordTagsProps): string {
  const tags = p.tags.map((t) => `<span class="kt-tag">${esc(t)}</span>`).join('');
  return `<section class="blk-keywordtags"><div class="kt-grid">${tags}</div></section>`;
}

function renderProductCard(p: ProductCardProps): string {
  const cards = (p.products || [])
    .map((pr) => `
      <div class="pd-card">
        <div class="pd-name">${esc(pr.goodsLabel)}</div>
        ${pr.goodsSpu ? `<div class="pd-spu">${esc(pr.goodsSpu)}</div>` : ''}
        ${pr.application ? `<div class="pd-app">${esc(pr.application)}</div>` : ''}
        ${pr.target ? `<div class="pd-target">靶点：${esc(pr.target)}</div>` : ''}
        ${pr.goodsUrl ? `<a class="pd-link" href="${esc(pr.goodsUrl)}" target="_blank" rel="noopener">查看商品</a>` : ''}
      </div>`)
    .join('');
  return `<section class="blk-productcard"><div class="pd-grid">${cards}</div></section>`;
}

function renderBrandFooter(p: BrandFooterProps, theme: BrandTheme): string {
  const qr = p.qrUrl || theme.qrUrl;
  const c = p.contact || theme.contact || {};
  const lines = [
    c.phone && `电话：${esc(c.phone)}`,
    c.email && `邮箱：${esc(c.email)}`,
    c.wechat && `微信：${esc(c.wechat)}`,
    c.address && `地址：${esc(c.address)}`,
  ].filter(Boolean);
  return `
  <footer class="blk-brand-footer" style="background:var(--brand-primary-dark)">
    <div class="bf-qr">${qr ? imgTag(qr, 'qr', 'bf-qr-img') : ''}</div>
    <div class="bf-info">
      <div class="bf-name">${esc(theme.name)}</div>
      ${lines.map((l) => `<div class="bf-line">${l}</div>`).join('')}
    </div>
  </footer>`;
}

function renderBlock(node: BlockNode, theme: BrandTheme): string {
  if (node.visible === false) return '';
  switch (node.type) {
    case 'BrandHeader': return renderBrandHeader(node.props as BrandHeaderProps, theme);
    case 'TitleBar': return renderTitleBar(node.props as TitleBarProps);
    case 'StatCardGroup': return renderStatCardGroup(node.props as StatCardGroupProps);
    case 'BarChart': return renderBarChart(node.props as BarChartProps);
    case 'QuarterGrid': return renderQuarterGrid(node.props as QuarterGridProps);
    case 'SummaryList': return renderSummaryList(node.props as SummaryListProps);
    case 'PaperListBlock': return renderPaperListBlock(node.props as PaperListBlockProps);
    case 'ArticleBlock': return renderArticleBlock(node.props as ArticleBlockProps);
    case 'KeywordTags': return renderKeywordTags(node.props as KeywordTagsProps);
    case 'ProductCard': return renderProductCard(node.props as ProductCardProps);
    case 'BrandFooter': return renderBrandFooter(node.props as BrandFooterProps, theme);
    default: return '';
  }
}

export const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;background:#f2f3f5;color:#1f2329}
.h5-root{max-width:480px;margin:0 auto;background:#fff;min-height:100vh;overflow:hidden}
.blk-brand-header{display:flex;align-items:center;gap:12px;padding:22px 18px;color:#fff}
.bh-logo-img{width:46px;height:46px;border-radius:10px;object-fit:contain;background:#fff}
.bh-initial{width:46px;height:46px;border-radius:10px;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700}
.bh-name{font-size:18px;font-weight:700}
.bh-slogan{font-size:12px;opacity:.9;margin-top:2px}
.blk-titlebar{padding:20px 18px 8px}
.tb-title{font-size:22px;font-weight:800;color:#1f2329}
.tb-sub{font-size:13px;color:#6b7280;margin-top:6px}
.blk-statcards{padding:12px 14px}
.sc-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.sc-card{background:linear-gradient(160deg,#fff,#fafafa);border:1px solid #eef0f2;border-radius:14px;padding:14px;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.sc-label{font-size:12px;color:#6b7280}
.sc-value{font-size:24px;font-weight:800;color:var(--brand-primary);margin-top:4px}
.sc-unit{font-size:13px;font-weight:600;margin-left:2px}
.sc-trend{position:absolute;top:10px;right:10px;font-size:11px}
.sc-trend.up{color:#e11d48}.sc-trend.down{color:#0ea5a4}
.blk-barchart{padding:16px 14px}
.bc-title{font-size:16px;font-weight:700;margin-bottom:12px}
.bc-chart{display:flex;align-items:flex-end;gap:8px;height:160px;padding:0 4px}
.bc-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.bc-bar-wrap{flex:1;width:100%;display:flex;align-items:flex-end}
.bc-bar{width:100%;background:var(--brand-gradient);border-radius:6px 6px 0 0;min-height:4px;transition:height .3s}
.bc-val{font-size:11px;font-weight:700;margin-top:4px}
.bc-name{font-size:11px;color:#6b7280;margin-top:2px;text-align:center}
.blk-quartergrid{padding:12px 14px}
.qg-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.qg-cell{background:#f8fafc;border:1px solid #eef0f2;border-radius:12px;padding:14px;text-align:center}
.qg-value{font-size:22px;font-weight:800;color:var(--brand-primary)}
.qg-label{font-size:12px;color:#6b7280;margin-top:4px}
.blk-summarylist{padding:12px 18px}
.sl-list{list-style:none}
.sl-item{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f0f1f3;align-items:flex-start}
.sl-icon{color:var(--brand-primary);font-weight:700;flex-shrink:0}
.sl-text{font-size:14px;line-height:1.5}
.blk-paperlist{padding:12px 14px}
.pl-list{list-style:none}
.pl-item{background:#f8fafc;border:1px solid #eef0f2;border-radius:12px;padding:12px;margin-bottom:10px}
.pl-journal{font-size:11px;color:var(--brand-primary);font-weight:700}
.pl-title{font-size:14px;font-weight:600;margin:4px 0;line-height:1.4}
.pl-meta{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;color:#6b7280}
.pl-factor{color:#e11d48;font-weight:700}
.blk-article{padding:16px 14px}
.ar-cover{margin-bottom:12px}
.ar-cover-img{width:100%;border-radius:12px;object-fit:cover;max-height:220px}
.ar-title{font-size:18px;font-weight:800;line-height:1.4}
.ar-meta{display:flex;flex-wrap:wrap;gap:8px;font-size:12px;color:#6b7280;margin:8px 0}
.ar-factor{color:#e11d48;font-weight:700}
.ar-abstract{font-size:13px;line-height:1.6;color:#374151;background:#f8fafc;border-radius:10px;padding:12px}
.ar-keywords{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
.kt-tag{background:color-mix(in srgb,var(--brand-primary) 12%,#fff);color:var(--brand-primary);font-size:12px;padding:4px 10px;border-radius:999px}
.ar-products,.ar-pics{margin-top:14px}
.ar-products h3,.ar-pics h3{font-size:14px;font-weight:700;margin-bottom:8px}
.pd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.pd-card{background:#f8fafc;border:1px solid #eef0f2;border-radius:12px;padding:12px}
.pd-name{font-size:13px;font-weight:700;color:var(--brand-primary)}
.pd-spu,.pd-app,.pd-target{font-size:11px;color:#6b7280;margin-top:3px}
.pd-link{display:inline-block;margin-top:6px;font-size:12px;color:#fff;background:var(--brand-primary);padding:4px 10px;border-radius:8px;text-decoration:none}
.exp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.exp-fig{margin:0}
.exp-img{width:100%;border-radius:8px;border:1px solid #eef0f2}
.exp-fig figcaption{font-size:11px;color:#6b7280;margin-top:4px;line-height:1.3}
.blk-keywordtags{padding:12px 14px}
.kt-grid{display:flex;flex-wrap:wrap;gap:6px}
.blk-productcard{padding:12px 14px}
.blk-brand-footer{display:flex;gap:14px;align-items:center;padding:20px 18px;color:#fff;margin-top:12px}
.bf-qr-img{width:72px;height:72px;border-radius:8px;background:#fff;object-fit:contain}
.bf-name{font-size:15px;font-weight:700}
.bf-line{font-size:12px;opacity:.9;margin-top:3px}
`;

/** 渲染整篇 H5 为自包含 HTML（含内联样式 + 主题变量） */
export function renderDocToHtml(doc: H5Doc): string {
  const blocksHtml = doc.blocks
    .filter((b) => b.visible !== false)
    .map((b) => renderBlock(b, doc.theme))
    .join('\n');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(doc.title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="h5-root" style="${themeToCssVars(doc.theme)}">
${blocksHtml}
</div>
</body>
</html>`;
}
