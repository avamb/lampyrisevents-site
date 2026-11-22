// Proves the cleaned legal pages keep the WordPress wording: the text of the rendered page body
// (headings and text) must equal the text of content/pages/<lang>/<page>.html after tag stripping.
// E-mail links are masked on both sides: Cloudflare hides them in the WP page, the clean HTML shows them.
// Whitespace is ignored (paragraph breaks differ only in whitespace).
// Usage: node tools/check-legal-text.mjs  (exit 1 on any difference)
import { readFileSync } from 'node:fs';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const idx = JSON.parse(readFileSync('content/pages/index.json', 'utf8'));
const flat = (s) => s.replace(/\s+/g, '');
let bad = 0, n = 0;
for (const it of idx.filter((i) => ['terms-of-use', 'privacy-policy'].includes(i.key))) {
  const html = await (await fetch(it.url, { headers: { 'User-Agent': UA } })).text();
  const $ = load(html);
  $('.__cf_email__').text('<mail>');
  const src = flat($('[data-elementor-type="wp-page"] .elementor-widget-heading, [data-elementor-type="wp-page"] .elementor-widget-text-editor').map((_, e) => $(e).text()).get().join(' '));
  const m = load(readFileSync(`content/pages/${it.lang}/${it.key}.html`, 'utf8'), null, false);
  m('a[href^="mailto:"]').text('<mail>');
  const mine = flat(m.root().text().replace(/[\w.+-]+@[\w-]+\.[a-z]{2,4}(?![a-z])/gi, '<mail>'));
  n++;
  if (src !== mine) { bad++; console.log('DIFF', it.lang, it.key, src.length, mine.length); }
}
console.log(`checked ${n} legal pages, ${bad} differ`);
process.exit(bad ? 1 : 0);
