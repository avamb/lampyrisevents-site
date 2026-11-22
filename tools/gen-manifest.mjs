// Writes site.manifest.json (read by the kit: check-dist, postbuild, builder) from the language table
// and the route table. Run after content/pages/index.json or src/lib/languages.json change:
//   node tools/gen-manifest.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { buildPagePaths, GENERIC_PAGES } from '../src/lib/page-table.mjs';

const languages = JSON.parse(readFileSync('src/lib/languages.json', 'utf8'));
const index = JSON.parse(readFileSync('content/pages/index.json', 'utf8'));
const paths = buildPagePaths(index, languages);

// Pages every build must contain. Lists (home, tours, past events) and personal pages are built by their own files.
const KEYS = ['home', 'tours', 'past-events', ...GENERIC_PAGES.filter((k) => !k.startsWith('payment-')), 'orderStatus', 'myTickets'];
const requiredPages = {};
for (const l of languages) requiredPages[l.code] = KEYS.map((k) => paths[k][l.code]);

const manifest = {
  languages: languages.map((l) => ({ code: l.code, dir: l.dir, prefix: l.prefix })),
  defaultLanguage: 'en',
  eventPathSegment: 'events',
  requiredPages,
  personalPagePatterns: ['/order-status/$', '/my-tickets/$'],
  requiredFiles: ['robots.txt', 'sitemap.xml', '.nginx/csp-hashes.conf', '.nginx/redirects.conf', '.nginx/locations.conf'],
};
writeFileSync('site.manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`site.manifest.json: ${languages.length} languages, ${KEYS.length} required pages each`);
