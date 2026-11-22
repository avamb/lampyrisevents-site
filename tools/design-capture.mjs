// Screenshots of key pages at 360 px and 1440 px plus design tokens read from the live stylesheets.
// Usage: node tools/design-capture.mjs  -> docs/design/*.png, design/tokens.json, design/tokens.css
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'https://lampyrisevents.com';
const PAGES = [
  ['home', '/'],
  ['tours', '/tours/'],
  ['tour-cory-henry', '/events/cory-henry-music-from-the-heart-tour/'],
  ['event-prague', '/events/cory-henry-trio/'],
  ['past-events', '/past-events/'],
  ['about-us', '/about-us/'],
  ['contacts', '/contacts/'],
  ['faq', '/frequently-asked-questions/'],
  ['home-cs', '/cs/'],
];
const SIZES = [['360', 360, 800], ['desktop', 1440, 900]];
mkdirSync('docs/design', { recursive: true });
mkdirSync('design', { recursive: true });
const b = await chromium.launch();
const tokens = { generated: new Date().toISOString(), source: BASE, samples: {} };
const log = [];
for (const [sizeName, w, h] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 500 });
  const p = await ctx.newPage();
  for (const [name, path] of PAGES) {
    try {
      const r = await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 });
      log.push(`${sizeName} ${path} ${r?.status()}`);
      if (r?.status() !== 200) continue;
      // hide the cookie bar so the shot shows the page, scroll once to trigger lazy images
      await p.addStyleTag({ content: '#cookie-notice{display:none!important}' });
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
      await p.waitForTimeout(500);
      await p.screenshot({ path: `docs/design/${name}-${sizeName}.png`, fullPage: true });
      if (name === 'home' && sizeName === 'desktop') {
        tokens.samples = await p.evaluate(() => {
          const pick = (sel, props) => { const e = document.querySelector(sel); if (!e) return null; const c = getComputedStyle(e); return Object.fromEntries(props.map((k) => [k, c.getPropertyValue(k)])); };
          const vars = {};
          for (const s of document.styleSheets) {
            let rules; try { rules = s.cssRules; } catch { continue; }
            for (const rule of rules) {
              if (rule.selectorText && /^(:root|body|\.elementor-kit-\d+)$/.test(rule.selectorText)) {
                for (const n of rule.style) if (n.startsWith('--')) vars[n] = rule.style.getPropertyValue(n).trim();
              }
            }
          }
          const bps = [];
          for (const s of document.styleSheets) {
            let rules; try { rules = s.cssRules; } catch { continue; }
            for (const rule of rules) if (rule.media) for (const m of rule.media) { const k = /\((?:max|min)-width:\s*(\d+)px\)/.exec(m); if (k) bps.push(k[1]); }
          }
          const counts = {}; bps.forEach((x) => (counts[x] = (counts[x] || 0) + 1));
          return {
            cssVariables: vars,
            mediaWidths: counts,
            body: pick('body', ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color']),
            h1: pick('h1', ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'letter-spacing']),
            h2: pick('h2', ['font-family', 'font-size', 'font-weight', 'line-height', 'color']),
            link: pick('a', ['color', 'text-decoration-line']),
            button: pick('.elementor-button, button, .btn', ['background-color', 'color', 'border-radius', 'padding', 'font-size', 'font-weight']),
            container: pick('.e-con-inner, .elementor-container', ['max-width', 'padding', 'gap']),
            fontsLoaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
          };
        });
      }
    } catch (e) { log.push(`${sizeName} ${path} ERROR ${e.message.split('\n')[0]}`); }
  }
  await ctx.close();
}
await b.close();
writeFileSync('design/tokens.json', JSON.stringify(tokens, null, 2));
writeFileSync('docs/design/capture.log', log.join('\n') + '\n');
console.log(log.join('\n'));
