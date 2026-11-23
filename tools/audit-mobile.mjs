// Side-padding audit at 375x812: crawls header, footer and main links of each language, and reports every visible text or
// control whose box is closer than 16 px to a screen edge, plus any horizontal overflow. Full-bleed images are ignored.
// Usage: node tools/audit-mobile.mjs <base url> [langs, default en,cs,ru,et]
import { chromium } from 'playwright';
const base = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const langs = (process.argv[3] || 'en,cs,ru,et').split(',');
const W = 375, M = 16;
const home = (l) => `${base}/${l === 'en' ? '' : l + '/'}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const links = (sel) => page.$$eval(sel, (as) => as.map((a) => a.href));
const pages = new Map();
for (const l of langs) {
  await page.goto(home(l), { waitUntil: 'load' });
  const hs = [...await links('header a[href], footer a[href]'), ...(await links('main a[href]')).slice(0, 40)];
  const set = new Set([home(l), ...hs]);
  for (const u of [...set]) {
    const url = new URL(u);
    if (url.origin !== new URL(base).origin || /\.(xml|txt|pdf|webp|png|svg)$/.test(url.pathname)) continue;
    url.hash = ''; url.search = '';
    pages.set(url.href, l);
  }
  // second page of past events, if paginated
  const past = [...pages.keys()].find((u) => u.includes(`/${l === 'en' ? '' : l + '/'}`) && /past|projek|proekty|minul|tulevik|mineviki|praet|pasa/i.test(u));
  if (past) pages.set(past.replace(/\/$/, '') + '/page/2/', l);
}
pages.set(`${base}/this-page-does-not-exist/`, 'en');
for (const l of langs.slice(1)) pages.set(`${base}/${l}/this-page-does-not-exist/`, l);

const hits = [];
let checked = 0;
for (const [url] of pages) {
  const res = await page.goto(url, { waitUntil: 'load' });
  if (!res) continue;
  await page.waitForTimeout(150);
  const open = async (menu) => {
    if (menu) await page.evaluate(() => { document.querySelector('[data-lp-burger]')?.click(); document.querySelector('[data-lp-lang] button')?.click(); });
  };
  for (const menu of [false, true]) {
    await open(menu);
    const r = await page.evaluate(({ W, M }) => {
      const out = [];
      const vis = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0; };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (walker.nextNode()) {
        const n = walker.currentNode;
        const t = n.textContent.trim();
        if (!t) continue;
        const el = n.parentElement;
        if (!el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || !vis(el)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const b of rg.getClientRects()) {
          if (b.width < 1 || b.height < 1) continue;
          if (b.left < M - 0.5 || b.right > W - M + 0.5) {
            const key = el.tagName + t.slice(0, 30);
            if (!seen.has(key)) { seen.add(key); out.push({ kind: 'text', el: el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 40), text: t.slice(0, 40), left: Math.round(b.left), right: Math.round(W - b.right) }); }
          }
        }
      }
      for (const el of document.querySelectorAll('input:not([type=hidden]), textarea, select, button')) {
        if (!vis(el)) continue;
        const b = el.getBoundingClientRect();
        if (b.width < 1) continue;
        if (b.left < M - 0.5 || b.right > W - M + 0.5) out.push({ kind: 'control', el: el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 40), text: (el.textContent || el.placeholder || el.name || '').trim().slice(0, 30), left: Math.round(b.left), right: Math.round(W - b.right) });
      }
      const over = document.documentElement.scrollWidth > W || document.body.scrollWidth > W;
      return { out, over, sw: document.documentElement.scrollWidth };
    }, { W, M });
    checked++;
    if (r.over) hits.push({ url, menu, kind: 'overflow', scrollWidth: r.sw });
    for (const h of r.out) hits.push({ url, menu, ...h });
    if (!menu) await page.goto(url, { waitUntil: 'load' });
  }
}
await browser.close();
console.log(`pages: ${pages.size}, views checked: ${checked}`);
for (const h of hits) console.log(JSON.stringify(h));
console.log(`HITS: ${hits.length}`);
process.exit(hits.length ? 1 : 0);
