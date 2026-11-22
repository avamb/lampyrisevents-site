// Prints the numbers used in docs/export_report_ru.md. Usage: node tools/report-stats.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const J = (f) => JSON.parse(readFileSync(`data/export/${f}.json`, 'utf8'));
const ev = J('events'), past = J('past'), tours = J('tours'), pr = J('promoters'), man = J('media-manifest'), pg = J('pages'), str = J('strings');
const all = [...ev.groups, ...past.groups];
const posts = (g) => [g.original, ...Object.values(g.translations)];
const byLang = {};
for (const g of all) for (const r of posts(g)) { const l = r === g.original ? g.language : Object.keys(g.translations).find((k) => g.translations[k] === r); byLang[l] = (byLang[l] || 0) + 1; }
const sitemapEv = [...readFileSync('data/export/sitemap/past-event.xml', 'utf8').matchAll(/<loc>([^<]+)/g)].length;
const sitemapPg = [...readFileSync('data/export/sitemap/page.xml', 'utf8').matchAll(/<loc>([^<]+)/g)].length;
const evIds = new Set(all.flatMap((g) => posts(g).map((r) => r.id)));
const sitemapUrls = new Set([...readFileSync('data/export/sitemap/past-event.xml', 'utf8').matchAll(/<loc>([^<]+)/g)].map((m) => decodeURI(m[1])));
const notInSitemap = all.flatMap((g) => posts(g)).filter((r) => !sitemapUrls.has(decodeURI(r.url)));
const orphan = all.flatMap((g) => Object.entries(g.translations).filter(([, r]) => /-\d+$/.test(r.slug_decoded)).map(([l, r]) => `${l}:${r.slug_decoded}`));
const draft = all.flatMap(posts).filter((r) => r.status !== 'publish').length;
const tourCities = tours.groups.map((t) => ({ id: t.original.id, name: t.original.name.slice(0, 40), state: t.state, tr: Object.keys(t.translations), children: (t.city_events[t.original.id] || []).length }));
const futureTr = ev.groups.map((g) => ({ id: g.original.id, city: g.original.city, tour: g.original.is_tour, langs: ['en', ...Object.keys(g.translations)].join(',') }));
const noDesc = all.filter((g) => !g.original.description_html).length;
const sameAsEn = {}; for (const g of all) for (const [l, r] of Object.entries(g.translations)) if (r.description_html && r.description_html === g.original.description_html) sameAsEn[l] = (sameAsEn[l] || 0) + 1;
const pagesDir = readdirSync('content/pages').filter((d) => d.length === 2);
const files = pagesDir.reduce((n, d) => n + readdirSync(`content/pages/${d}`).filter((f) => f.endsWith('.html')).length, 0);
console.log(JSON.stringify({
  upcoming_groups: ev.groups.length, upcoming_posts: ev.counts.posts, upcoming_translations: ev.counts.translations, upcoming_tours: ev.counts.tours,
  past_groups: past.groups.length, past_posts: past.counts.posts, past_translations: past.counts.translations,
  all_groups: all.length, all_posts: evIds.size, drafts: draft, byLang,
  tours: tours.counts, tourCities, futureTr,
  promoters: pr.counts, media_urls: man.count, media_by_kind: man.items.reduce((a, i) => ((a[i.kind] = (a[i.kind] || 0) + 1), a), {}),
  sitemap_events: sitemapEv, sitemap_pages: sitemapPg, event_posts_not_in_sitemap: notInSitemap.map((r) => `${r.id}:${r.status}:${r.slug_decoded}`).slice(0, 30), n_not_in_sitemap: notInSitemap.length,
  orphan_slugs: orphan, noDesc, descSameAsEnglish: sameAsEn,
  wpml_strings: str.counts, pages_inventory: pg.counts, page_files: files,
  sessions: ev.groups.reduce((n, g) => n + g.sessions.length, 0),
  ticket_offices: ev.groups.flatMap((g) => g.sessions.flatMap((s) => s.ticket_offices)).map((u) => new URL(u).hostname),
}, null, 1));
