// The ONE route table of the site: page key -> language -> path.
// Source: content/pages/index.json (WordPress addresses, translated slugs included).
// A language that has no WordPress page for a key gets the English path under its prefix
// (e.g. /de/privacy-policy/). Shared by src/lib/routes.ts and tools/gen-manifest.mjs.

/** Pages whose body is the cleaned WordPress HTML in content/pages/<lang>/<key>.html. */
export const GENERIC_PAGES = [
  'about-us',
  'how-to-buy',
  'frequently-asked-questions',
  'contacts',
  'downloads',
  'terms-of-use',
  'privacy-policy',
  'partnerships',
  'create-event',
  'sell-tickets-with-us',
  'connect-to-stripe',
  'payment-success',
  'payment-failed',
];

/** Page keys the site has on top of the WordPress index: same slug under every language prefix. */
export const EXTRA_PAGES = { tours: '/tours/', orderStatus: '/order-status/', myTickets: '/my-tickets/' };

/** WordPress index key -> site page key. 'actual-events' is the real home page (the WP /home/ is unused). */
const RENAME = { 'actual-events': 'home' };

/**
 * @param {{ key: string, lang: string, path: string, title?: string }[]} index
 * @param {{ code: string, prefix: string }[]} languages
 */
export function buildPagePaths(index, languages) {
  /** @type {Record<string, Record<string, string>>} */
  const found = {};
  for (const p of index) {
    if (p.key === 'home') continue;
    const key = RENAME[p.key] ?? p.key;
    (found[key] ??= {})[p.lang] = p.path;
  }
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  for (const [key, byLang] of Object.entries(found)) {
    const en = byLang.en;
    out[key] = {};
    for (const l of languages) out[key][l.code] = byLang[l.code] ?? `${l.prefix}${en}`;
  }
  for (const [key, path] of Object.entries(EXTRA_PAGES)) {
    out[key] = {};
    for (const l of languages) out[key][l.code] = `${l.prefix}${path}`;
  }
  return out;
}

/** Page titles from the WordPress index, without the " – Lampyris-Events" tail. */
export function buildPageTitles(index) {
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  for (const p of index) {
    const key = RENAME[p.key] ?? p.key;
    (out[key] ??= {})[p.lang] = String(p.title || '').replace(/\s+[–-]\s+Lampyris-Events\s*$/, '');
  }
  return out;
}
