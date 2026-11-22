// Fetches the rendered public HTML of every Elementor page in the 11 languages and writes
// clean HTML (no Elementor markup) to content/pages/<lang>/<en-slug>.html plus content/pages/index.json.
// Usage: node tools/fetch-pages.mjs
// Reads public pages only, one request per page, with a browser User-Agent (Cloudflare blocks the default).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { load } from 'cheerio';
import { cleanHtml } from './clean-html.mjs';

const LANGS = ['en', 'cs', 'pl', 'uk', 'ru', 'de', 'et', 'fi', 'lv', 'lt', 'hu'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const inv = JSON.parse(readFileSync('data/export/pages.json', 'utf8')).pages;
const enByTrid = new Map(inv.filter((p) => p.lang === 'en').map((p) => [p.trid, p]));
const todo = inv.filter((p) => LANGS.includes(p.lang) && p.elementor && enByTrid.has(p.trid));
const index = [];
mkdirSync('content/pages/_raw', { recursive: true });
for (const p of todo) {
  const en = enByTrid.get(p.trid);
  const key = en.id === 21 ? 'home' : en.slug; // the English "home" page is the translated front page body
  const r = await fetch(p.url, { headers: { 'User-Agent': UA, 'Accept-Language': p.lang } });
  if (!r.ok) { console.error('FAIL', p.url, r.status); index.push({ key, lang: p.lang, id: p.id, url: p.url, status: r.status }); continue; }
  const html = await r.text();
  const $ = load(html);
  const main = $('[data-elementor-type="wp-page"]').first();
  const raw = main.length ? $.html(main) : $('main').first().html() || '';
  const clean = cleanHtml(raw);
  mkdirSync(`content/pages/${p.lang}`, { recursive: true });
  writeFileSync(`content/pages/${p.lang}/${key}.html`, clean + '\n');
  const title = $('title').text().replace(/\s+/g, ' ').trim();
  index.push({ key, lang: p.lang, id: p.id, url: p.url, path: new URL(p.url).pathname, title, status: 200, bytes: clean.length, htmlLang: $('html').attr('lang') });
  await new Promise((res) => setTimeout(res, 300));
}
writeFileSync('content/pages/index.json', JSON.stringify(index, null, 2));
console.log('pages', index.length, 'failed', index.filter((i) => i.status !== 200).length);
