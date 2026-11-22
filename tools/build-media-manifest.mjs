// Collects every media URL referenced by the JSON exports into data/export/media-manifest.json.
// Usage: node tools/build-media-manifest.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const files = ['events', 'past', 'tours'];
const urls = new Map(); // url -> {url, kind, refs:[post ids]}
const add = (url, kind, ref) => {
  if (!url || typeof url !== 'string') return;
  const e = urls.get(url) || { url, kind, refs: [] };
  if (!e.refs.includes(ref)) e.refs.push(ref);
  urls.set(url, e);
};
const walkMedia = (rec, ref) => {
  for (const a of rec.media.poster) add(a.url, 'poster', ref);
  for (const a of rec.media.gallery) add(a.url, 'gallery', ref);
  if (rec.media.featured) add(rec.media.featured.url, 'featured', ref);
  for (const a of rec.media.organizer_logo) add(a.url, 'organizer_logo', ref);
  for (const [k, v] of Object.entries(rec.lops)) if (/gallery/.test(k) && Array.isArray(v)) for (const a of v) if (a && a.url) add(a.url, k.startsWith('lops_report') ? 'report' : 'gallery', ref);
  for (const m of (rec.description_html || '').matchAll(/(?:src|href)=["']([^"']+\/wp-content\/uploads\/[^"']+)["']/g)) add(m[1], 'inline', ref);
};
for (const f of files) {
  const j = JSON.parse(readFileSync(`data/export/${f}.json`, 'utf8'));
  for (const g of j.groups) for (const r of [g.original, ...Object.values(g.translations)]) walkMedia(r, r.id);
}
const list = [...urls.values()].sort((a, b) => a.url.localeCompare(b.url));
writeFileSync('data/export/media-manifest.json', JSON.stringify({ generated: new Date().toISOString(), count: list.length, items: list }, null, 2));
console.log('media urls:', list.length);
