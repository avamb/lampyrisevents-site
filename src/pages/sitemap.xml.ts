import type { APIRoute } from 'astro';
import { languages, siteUrl } from '../../site.config.ts';
import { loadSiteData } from '../lib/data-source.ts';
import { eventPath, pagePath, personalPages, pagePaths } from '../lib/routes.ts';

/** Sitemap: every page key in every language, plus the public events and tours of each language. */
export const GET: APIRoute = async () => {
  const paths = new Set<string>();
  for (const key of Object.keys(pagePaths)) {
    if (personalPages.includes(key) || key === 'payment-success' || key === 'payment-failed') continue;
    for (const l of languages) paths.add(pagePath(key, l.code));
  }
  for (const l of languages) {
    const data = await loadSiteData(l.code);
    for (const e of data.store.siteEvents()) paths.add(eventPath(e.slug, l.code));
    for (const s of data.series) paths.add(eventPath(s.slug, l.code));
  }
  const base = siteUrl.replace(/\/+$/, '');
  const urls = [...paths].sort().map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
