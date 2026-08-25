<template>
  <template v-for="b in blocks" :key="b.id">
    <header
      v-if="b.type === 'BrandHeader'"
      class="blk-brand-header"
      :style="{ background: 'var(--brand-gradient)' }"
    >
      <div class="bh-logo">
        <img
          v-if="logoOf(b)"
          class="bh-logo-img"
          :src="logoOf(b)"
          :alt="theme.name"
          referrerpolicy="no-referrer"
          onerror="this.style.display='none'"
        />
        <span v-else class="bh-initial">{{ theme.name.charAt(0) }}</span>
      </div>
      <div class="bh-text">
        <div class="bh-name">{{ theme.name }}</div>
        <div v-if="sloganOf(b)" class="bh-slogan">{{ sloganOf(b) }}</div>
      </div>
    </header>

    <section v-else-if="b.type === 'TitleBar'" class="blk-titlebar">
      <h1 class="tb-title">{{ b.props.title }}</h1>
      <p v-if="b.props.subtitle" class="tb-sub">{{ b.props.subtitle }}</p>
    </section>

    <section v-else-if="b.type === 'StatCardGroup'" class="blk-statcards">
      <div class="sc-grid">
        <div v-for="c in b.props.cards" :key="c.label" class="sc-card">
          <div class="sc-label">{{ c.label }}</div>
          <div class="sc-value">
            {{ c.value }}<span v-if="c.unit" class="sc-unit">{{ c.unit }}</span>
          </div>
          <span
            v-if="c.trend"
            class="sc-trend"
            :class="c.trend > 0 ? 'up' : 'down'"
            >{{ c.trend > 0 ? '▲' : '▼' }} {{ Math.abs(c.trend) }}%</span
          >
        </div>
      </div>
    </section>

    <section v-else-if="b.type === 'BarChart'" class="blk-barchart">
      <h2 class="bc-title">{{ b.props.title }}</h2>
      <div class="bc-chart">
        <div v-for="pt in b.props.points" :key="pt.name" class="bc-col">
          <div class="bc-bar-wrap">
            <div class="bc-bar" :style="{ height: (pt.value / maxBar) * 100 + '%' }"></div>
          </div>
          <div class="bc-val">{{ pt.value }}</div>
          <div class="bc-name">{{ pt.name }}</div>
        </div>
      </div>
    </section>

    <section v-else-if="b.type === 'QuarterGrid'" class="blk-quartergrid">
      <div class="qg-grid">
        <div v-for="it in b.props.items" :key="it.label" class="qg-cell">
          <div class="qg-value">{{ it.value }}</div>
          <div class="qg-label">{{ it.label }}</div>
        </div>
      </div>
    </section>

    <section v-else-if="b.type === 'SummaryList'" class="blk-summarylist">
      <ul class="sl-list">
        <li v-for="it in b.props.items" :key="it.text" class="sl-item">
          <span class="sl-icon">{{ it.icon || '•' }}</span>
          <span class="sl-text">{{ it.text }}</span>
        </li>
      </ul>
    </section>

    <section v-else-if="b.type === 'PaperListBlock'" class="blk-paperlist">
      <ul class="pl-list">
        <li v-for="p in papersOf(b)" :key="p.id" class="pl-item">
          <div class="pl-journal">{{ p.journal }}</div>
          <div class="pl-title">{{ p.title }}</div>
          <div class="pl-meta">
            <span class="pl-factor">IF {{ p.factor }}</span>
            <span v-if="p.pubTime" class="pl-year">{{ String(p.pubTime).slice(0, 4) }}</span>
            <span v-if="p.authors" class="pl-authors">{{ p.authors }}</span>
          </div>
        </li>
      </ul>
    </section>

    <section v-else-if="b.type === 'ArticleBlock'" class="blk-article">
      <div v-if="b.props.paper.feature" class="ar-cover">
        <img
          class="ar-cover-img"
          :src="b.props.paper.feature"
          referrerpolicy="no-referrer"
          onerror="this.style.display='none'"
        />
      </div>
      <h2 class="ar-title">{{ b.props.paper.title }}</h2>
      <div class="ar-meta">
        <span class="ar-journal">{{ b.props.paper.journal }}</span>
        <span class="ar-factor">IF {{ b.props.paper.factor }}</span>
        <span v-if="b.props.paper.authors" class="ar-authors">{{ b.props.paper.authors }}</span>
      </div>
      <p v-if="b.props.abstract" class="ar-abstract">{{ b.props.abstract }}</p>
      <div
        v-if="b.props.paper.cnFields && b.props.paper.cnFields.length"
        class="ar-keywords"
      >
        <span v-for="k in b.props.paper.cnFields" :key="k" class="kt-tag">{{ k }}</span>
      </div>
      <div
        v-if="b.props.paper.products && b.props.paper.products.length"
        class="ar-products"
      >
        <h3>推荐产品</h3>
        <div class="pd-grid">
          <div v-for="pr in b.props.paper.products" :key="pr.goodsLabel" class="pd-card">
            <div class="pd-name">{{ pr.goodsLabel }}</div>
            <div v-if="pr.application" class="pd-app">{{ pr.application }}</div>
            <div v-if="pr.target" class="pd-target">靶点：{{ pr.target }}</div>
          </div>
        </div>
      </div>
      <div v-if="expPicsOf(b).length" class="ar-pics">
        <h3>实验图</h3>
        <div class="exp-grid">
          <figure v-for="pic in expPicsOf(b)" :key="pic.id" class="exp-fig">
            <img
              class="exp-img"
              :src="pic.picUrl"
              :alt="pic.description"
              referrerpolicy="no-referrer"
              onerror="this.style.display='none'"
            />
            <figcaption>{{ pic.description }}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section v-else-if="b.type === 'KeywordTags'" class="blk-keywordtags">
      <div class="kt-grid">
        <span v-for="t in b.props.tags" :key="t" class="kt-tag">{{ t }}</span>
      </div>
    </section>

    <section v-else-if="b.type === 'ProductCard'" class="blk-productcard">
      <div class="pd-grid">
        <div v-for="pr in b.props.products" :key="pr.goodsLabel" class="pd-card">
          <div class="pd-name">{{ pr.goodsLabel }}</div>
          <div v-if="pr.goodsSpu" class="pd-spu">{{ pr.goodsSpu }}</div>
          <div v-if="pr.application" class="pd-app">{{ pr.application }}</div>
          <div v-if="pr.target" class="pd-target">靶点：{{ pr.target }}</div>
          <a
            v-if="pr.goodsUrl"
            class="pd-link"
            :href="pr.goodsUrl"
            target="_blank"
            rel="noopener"
            >查看商品</a
          >
        </div>
      </div>
    </section>

    <footer
      v-else-if="b.type === 'BrandFooter'"
      class="blk-brand-footer"
      :style="{ background: 'var(--brand-primary-dark)' }"
    >
      <div class="bf-qr">
        <img
          v-if="qrOf(b)"
          class="bf-qr-img"
          :src="qrOf(b)"
          referrerpolicy="no-referrer"
          onerror="this.style.display='none'"
        />
      </div>
      <div class="bf-info">
        <div class="bf-name">{{ theme.name }}</div>
        <div v-for="l in footerLinesOf(b)" :key="l" class="bf-line">{{ l }}</div>
      </div>
    </footer>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BrandTheme, BrandHeaderProps, TitleBarProps, StatCardGroupProps, BarChartProps, QuarterGridProps, SummaryListProps, PaperListBlockProps, ArticleBlockProps, KeywordTagsProps, ProductCardProps, BrandFooterProps } from '@zhiliaowo/core';

// 区块结构随 type 变化，整体以 any[] 承载，由各分支按 props 类型自行处理
const props = defineProps<{ blocks: any[]; theme: BrandTheme }>();

const maxBar = computed(() => {
  const vals = props.blocks
    .filter((b) => b.type === 'BarChart')
    .flatMap((b) => (b.props as BarChartProps).points.map((p) => p.value));
  return Math.max(1, ...vals);
});

function logoOf(b: any): string {
  return (b.props as BrandHeaderProps).logoUrl || props.theme.logoUrl;
}
function sloganOf(b: any): string {
  return (b.props as BrandHeaderProps).slogan || props.theme.slogan;
}
function qrOf(b: any): string {
  return (b.props as BrandFooterProps).qrUrl || props.theme.qrUrl;
}
function papersOf(b: any) {
  const p = b.props as PaperListBlockProps;
  return p.max ? p.papers.slice(0, p.max) : p.papers;
}
function expPicsOf(b: any) {
  const p = (b.props as ArticleBlockProps).paper;
  return (p.products || []).flatMap((pr) => pr.paperProductPictureList || []);
}
function footerLinesOf(b: any): string[] {
  const c = (b.props as BrandFooterProps).contact || props.theme.contact || {};
  return [
    c.phone && '电话：' + c.phone,
    c.email && '邮箱：' + c.email,
    c.wechat && '微信：' + c.wechat,
    c.address && '地址：' + c.address,
  ].filter(Boolean) as string[];
}
</script>
