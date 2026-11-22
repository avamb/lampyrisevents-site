export const GENERIC_PAGES: string[];
export const EXTRA_PAGES: Record<string, string>;
export function buildPagePaths(
  index: { key: string; lang: string; path: string; title?: string }[],
  languages: { code: string; prefix: string }[],
): Record<string, Record<string, string>>;
export function buildPageTitles(index: { key: string; lang: string; title?: string }[]): Record<string, Record<string, string>>;
