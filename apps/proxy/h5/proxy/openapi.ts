// H5 模块 → 知了窝开放平台代理（复用 proxy 既有 ZhiliaowoClient + 缓存抽象）
// 入参用「知了窝标准品牌名」（= theme.brandKey），内部反查 site 配置后调用。
import { getClient } from '../../lib/client.js';
import { resolveBrandByName } from '../../config/brands.js';

function client() {
  return getClient();
}

export function proxyStatistics(brand: string) {
  return client().statistics(resolveBrandByName(brand));
}
export function proxyCiteStat(brand: string, sku: string) {
  return client().citeStat(resolveBrandByName(brand), sku);
}
export function proxyPaperSum(brand: string) {
  return client().paperSum(resolveBrandByName(brand));
}
export function proxyPaperYear(brand: string) {
  return client().paperYear(resolveBrandByName(brand));
}
export function proxyGoodsCiteNum(brand: string, query: Record<string, string> = {}) {
  return client().goodsCiteNum(resolveBrandByName(brand), query);
}
export function proxyBrandPapers(brand: string, query: Record<string, string> = {}) {
  return client().brandPapers(resolveBrandByName(brand), query);
}
export function proxyProductPapers(brand: string, sku: string, query: Record<string, string> = {}) {
  return client().productPapers(resolveBrandByName(brand), sku, query);
}
