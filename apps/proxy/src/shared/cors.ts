/**
 * ALLOWED_ORIGINS 的每一项编译为“整串匹配”正则，支持三种写法：
 *  1. 精确串：  https://admin.example.com            —— 仅完全相等放行
 *  2. 通配符：  *.example.com / https://*.example.com —— * 匹配任意字符（含 .）
 *  3. 正则：    /^https:\/\/.*\.example\.com$/        —— 用户写 body，自动锚定 ^...$
 * 全部按整串匹配语义，避免子串误中。编译在启动时一次性完成，非法规则直接抛错（fail-fast）。
 */

function escapeRegex(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

export function compileOriginPatterns(entries: string[]): RegExp[] {
  return entries.map((raw, i) => {
    const e = raw.trim();
    try {
      if (e.startsWith('/') && e.endsWith('/') && e.length >= 2) {
        // 正则字面量：去掉两端 /，并强制整串锚定（去掉用户可能写的 ^ $ 避免重复）
        const body = e.slice(1, -1).replace(/^\^|\$$/g, '');
        return new RegExp(`^${body}$`);
      }
      if (e.includes('*')) {
        // 通配符：先转义正则元字符，再把 * 替换为 .*
        return new RegExp(`^${escapeRegex(e).replace(/\*/g, '.*')}$`);
      }
      // 精确串：完全相等
      return new RegExp(`^${escapeRegex(e)}$`);
    } catch (err) {
      throw new Error(
        `ALLOWED_ORIGINS 第 ${i + 1} 项 "${raw}" 不是合法的匹配规则：${(err as Error).message}`,
      );
    }
  });
}

export function isOriginAllowed(origin: string | undefined, patterns: RegExp[]): boolean {
  if (!origin) return false;
  return patterns.some((re) => re.test(origin));
}
