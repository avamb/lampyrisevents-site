// Builds redirects.yaml (spec 63 §7) from the exports and the saved WordPress sitemaps.
// Usage: node tools/build-redirects.mjs   -> redirects.yaml, docs/redirects_stats.json
// The platform slug of an event is the ENGLISH WordPress slug of its translation group (spec 63 §7.1).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const L11 = ['en', 'cs', 'pl', 'uk', 'ru', 'de', 'et', 'fi', 'lv', 'lt', 'hu'];
const HIDDEN = ['fr', 'it', 'es'];
const J = (f) => JSON.parse(readFileSync(`data/export/${f}.json`, 'utf8'));
const pagesInv = J('pages');
const pages = pagesInv.pages;
const src = J('redirect-sources');
const groups = [...J('events').groups, ...J('past').groups]; // tours are inside these (is_tour)
const enByTrid = new Map(pages.filter((p) => p.lang === 'en').map((p) => [p.trid, p]));
const pre = (l) => (l === 'en' ? '' : `/${l}`);
const pathOf = (url) => new URL(url).pathname;
const dec = (s) => { try { return decodeURI(s); } catch { return s; } };
const enc = (s) => encodeURI(dec(s));
const q = (s) => JSON.stringify(s);
const out = { pages: [], redirects: [], events: [], tags: [], query_p: [], query_tickets_id: [], gone: [], wordpress: [], after_t2: [] };
const seen = new Set();
const line = (sec, o) => { const k = sec + '|' + o.from + '|' + (o.p ?? o.id ?? ''); if (seen.has(k)) return; seen.add(k); out[sec].push(o); };
const evPath = (l, slug) => `${pre(l)}/events/${slug}/`;

// 1. Pages of spec 63 §6.3: same address, answers 200.
const KEEP = new Set(['home', 'about-us', 'contacts', 'how-to-buy', 'frequently-asked-questions', 'terms-of-use', 'privacy-policy', 'sell-tickets-with-us', 'create-event', 'partnerships', 'past-events', 'downloads', 'connect-to-stripe', 'tours', 'actual-events']);
const pagePath = new Map(); // wp page id -> new path
for (const p of pages) {
  if (!L11.includes(p.lang)) continue;
  const en = enByTrid.get(p.trid);
  if (!en || !KEEP.has(en.slug)) continue;
  let path = dec(pathOf(p.url));
  if (en.slug === 'actual-events') path = p.lang === 'en' ? '/' : `/${p.lang}/`;
  pagePath.set(p.id, path);
  const o = { from: path, code: 200 };
  if (en.slug === 'home') { // /home/ is the old front-page copy: the home page lives at /
    line('pages', { from: path, code: 301, to: p.lang === 'en' ? '/' : `/${p.lang}/`, note: 'old front page copy' });
    continue;
  }
  line('pages', o);
  if (path !== enc(path)) line('pages', { from: enc(path), code: 200, note: 'percent-encoded form' });
}
for (const l of L11) { // pages that exist only on the new site (spec 63 §6.3), same prefix rule
  for (const n of ['order-status', 'my-tickets']) line('pages', { from: `${pre(l)}/${n}/`, code: 200, note: 'new site page' });
}
line('pages', { from: '/_site/', code: 200, note: 'new site service page' });

// 2. Events and tours: translated slugs -> platform slug.
const eventPath = new Map(); // wp post id -> new path
const productToEvent = new Map();
for (const g of groups) {
  const enRec = g.language === 'en' ? g.original : (g.translations.en || g.original);
  const en = enRec.slug_decoded || enRec.slug; // platform slug = English WP slug of the group
  const members = [[g.language || 'en', g.original], ...Object.entries(g.translations)];
  const perLang = new Map();
  for (const [l, r] of members) { if (!L11.includes(l)) continue; (perLang.get(l) || perLang.set(l, []).get(l)).push(r); }
  for (const [l, rs] of perLang) {
    for (const r of rs) {
      const target = evPath(l, en);
      eventPath.set(r.id, target);
      const mine = dec(r.slug);
      const platform = r.platform ?? undefined;
      if (r === g.original || mine === en) {
        line('events', { from: target, code: 200, platform: g.original.tags.some((t) => t.slug === 'actual') || undefined });
      } else {
        const note = rs.length > 1 && /-\d+$/.test(mine) ? 'orphan or duplicate translation (WPML suffix)' : undefined;
        line('events', { from: evPath(l, mine), code: 301, to: target, note });
        if (r.slug !== mine) line('events', { from: evPath(l, r.slug), code: 301, to: target, note: 'percent-encoded form' });
      }
      // Old CPT base /past-event/ (before the /events/ rewrite).
      line('events', { from: `${pre(l)}/past-event/${mine}/`, code: 301, to: target });
    }
  }
  if (g.original.bil24?.product_id) productToEvent.set(String(g.original.bil24.product_id), evPath('en', en));
}

// 3. /product/<slug>/ (WooCommerce) -> event page, ?p=<id> -> page of that post.
for (const p of src.products) {
  const target = productToEvent.get(String(p.id));
  if (!target) continue;
  line('redirects', { from: dec(pathOf(p.url)), code: 301, to: target, note: 'WooCommerce product -> event' });
  line('query_p', { p: p.id, to: target });
}
for (const u of src.post_urls) {
  const to = u.type === 'past-event' ? eventPath.get(u.id) : u.type === 'page' ? pagePath.get(u.id) : null;
  if (to) line('query_p', { p: u.id, to });
}

// 4. Tags (spec 63 §7.2).
for (const t of src.tags) {
  const m = t.url.match(/^https:\/\/lampyrisevents\.com(\/(?:[a-z]{2}\/)?)(tag|product-tag)\//);
  if (!m) continue;
}
const tagSitemap = readFileSync('data/export/sitemap/tag.xml', 'utf8');
for (const m of tagSitemap.matchAll(/<loc>https:\/\/lampyrisevents\.com([^<]+)<\/loc>/g)) {
  const path = dec(m[1]);
  const lang = (path.match(/^\/([a-z]{2})\//) || [])[1] || 'en';
  const isActual = /actual|rzeczywisty|tegelik|todellinen|tenyleges/.test(path);
  line('tags', { from: path, code: 301, to: isActual ? (lang === 'en' ? '/' : `/${lang}/`) : `${pre(lang)}/past-events/` });
}
line('tags', { from: '/product-tag/upcoming/', code: 301, to: '/' });
for (const l of L11) {
  line('tags', { from: `${pre(l)}/tag/actual/`, code: 301, to: l === 'en' ? '/' : `/${l}/` });
  line('tags', { from: `${pre(l)}/tag/past/`, code: 301, to: `${pre(l)}/past-events/` });
}

// 5. /tickets/ (Bil24-era site): event.php?id= table from lampyris-legacy-redirects, widget and root -> home.
line('redirects', { from: '/tickets/', code: 301, to: '/' });
line('redirects', { from: '/tickets/widget/', code: 301, to: '/' });
for (const g of groups) {
  const b = g.original.bil24 || {};
  const to = evPath('en', g.original.slug_decoded || g.original.slug);
  for (const id of new Set([b.action_id, b.action_event_id].filter(Boolean))) line('query_tickets_id', { id: Number(id), to, note: id === b.action_id ? 'actionId' : 'actionEventId' });
}

// 6. Hidden languages answered 302 to / in WP; now 301.
for (const l of HIDDEN) {
  line('redirects', { from: `/${l}/`, code: 301, to: '/' });
  line('redirects', { from: `/${l}/*`, code: 301, to: '/', note: 'hidden WPML language' });
}

// 7. Old WordPress pages that do not exist on the new site.
line('redirects', { from: '/sample-page/', code: 301, to: '/', note: 'WP sample page (also the broken "Page 2" link of /past-events/)' });
for (const l of L11) {
  line('after_t2', { from: `${pre(l)}/my-account/`, code: 301, to: `${pre(l)}/my-tickets/`, note: 'after T2; requests with order or reset parameters stay on WordPress until then' });
  line('after_t2', { from: `${pre(l)}/basket/`, code: 301, to: l === 'en' ? '/' : `/${l}/` });
  line('after_t2', { from: `${pre(l)}/checkout/*`, code: 301, to: l === 'en' ? '/' : `/${l}/` });
  line('after_t2', { from: `${pre(l)}/payment-successful/`, code: 301, to: l === 'en' ? '/' : `/${l}/` });
}
for (const p of pages) { // WP result pages with a translated slug that is not in the lists above
  if (!L11.includes(p.lang)) continue;
  const en = enByTrid.get(p.trid);
  if (en && ['payment-success', 'payment-failed'].includes(en.slug)) line('after_t2', { from: dec(pathOf(p.url)), code: 301, to: p.lang === 'en' ? '/' : `/${p.lang}/`, note: 'WP payment result page (decision needed)' });
}

// 8. Kept on WordPress during the transition (spec 63 §7.3) and WordPress internals.
for (const w of [
  ['/?wc-api=wc_stripe', 'Stripe webhook for old orders and refunds'],
  ['/wp-json/bil24/v1/notification', 'platform webhook for orders of the WP channel while the subscriber is active'],
  ['/wp-json/lops/*', 'Brevo'],
  ['/wp-admin/*', 'WordPress admin'], ['/wp-login.php', 'WordPress login'], ['/wp-*', 'WordPress files'],
  ['/checkout/order-pay/*', 'payment of an old order'],
  ['/payment-successful/?order_id=*', 'result page with an old order id'],
  ['/my-account/?*', 'account page with an order or password-reset parameter'],
]) line('wordpress', { from: w[0], note: w[1] });
for (const g of ['/xmlrpc.php', '/wp-sitemap.xml']) line('gone', { from: g, code: 410 });
line('gone', { from: '/sitemap-*.xml', code: 410, note: 'Slim SEO sub-sitemaps; /sitemap.xml is rebuilt' });

// Collapse 301 chains (a translated slug that equals another group's slug in the WP data): point at the final target.
const moved = new Map(out.events.filter((o) => o.code === 301).map((o) => [dec(o.from), o.to]));
for (const o of out.events) {
  if (o.code !== 301) continue;
  let t = o.to, n = 0;
  while (moved.has(dec(t)) && moved.get(dec(t)) !== t && n++ < 5) t = moved.get(dec(t));
  o.to = t;
}

// Write the file.
const flow = (o) => '  - { ' + Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${typeof v === 'number' || typeof v === 'boolean' ? v : q(v)}`).join(', ') + ' }';
const head = `# Every address of the WordPress site and what the new site answers for it (spec 63 §7).
# Same format as vinoandco-site/redirects.yaml. Generated by tools/build-redirects.mjs from the exports
# in data/export and the WordPress sitemaps saved in data/export/sitemap. Do not edit by hand.
#   from  old path (exact; a trailing /* means "this prefix")   code  200 page exists, 301 moved, 410 gone
#   to    target of a 301   platform  event page comes from the platform feed (checked on a real-feed build)
#   wordpress: paths that stay on WordPress during the transition (Traefik routes them, spec 63 §7.3)
#   after_t2:  301 rules that apply only after T2, WordPress still answers them before
`;
let yaml = head;
for (const [sec, list] of Object.entries(out)) {
  yaml += `\n${sec}:\n` + (list.length ? list.map((o) => (sec === 'query_p' || sec === 'query_tickets_id' ? flow(o) : flow(o))).join('\n') : '  []') + '\n';
}
writeFileSync('redirects.yaml', yaml);
mkdirSync('docs', { recursive: true });
const stats = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]));
writeFileSync('docs/redirects_stats.json', JSON.stringify(stats, null, 2));
console.log(stats);

// Coverage: every URL of the saved WordPress sitemaps must have a rule or be listed as unmatched.
const known = new Set();
for (const sec of ['pages', 'redirects', 'events', 'tags', 'after_t2']) for (const o of out[sec]) known.add(dec(o.from));
const missing = [];
for (const f of ['page', 'past-event', 'tag', 'product_tag']) {
  for (const m of readFileSync(`data/export/sitemap/${f}.xml`, 'utf8').matchAll(/<loc>https:\/\/lampyrisevents\.com([^<]+)<\/loc>/g)) {
    const p = dec(m[1]);
    if (!known.has(p) && !known.has(p.replace(/\/events\//, '/events/'))) missing.push(p);
  }
}
writeFileSync('docs/redirects_unmatched.txt', missing.join('\n') + '\n');
console.log('sitemap URLs without a rule:', missing.length);
