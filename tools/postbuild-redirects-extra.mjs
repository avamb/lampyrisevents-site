// The kit's nginx generator reads only redirects, gone, events and query_p. This step appends the
// `tags` rules and the `query_tickets_id` rules of redirects.yaml to dist/.nginx/redirects.conf.
// Run after `arena-site-kit postbuild`. Old WordPress addresses of tags answer 301, never 404.
import { readFileSync, appendFileSync, existsSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const doc = parse(readFileSync('redirects.yaml', 'utf8'));
const file = 'dist/.nginx/redirects.conf';
const lines = ['# Appended by tools/postbuild-redirects-extra.mjs from the tags and query_tickets_id sections of redirects.yaml.'];
// The old tag target /<lang>/past-events/ may not exist: the page lives under its translated slug.
function realTarget(to) {
  const m = to.match(/^(\/[a-z]{2})?\/past-events\/$/);
  if (!m || existsSync(`dist${to}index.html`)) return to;
  const prefix = m[1] ?? '';
  const dirs = readdirSync(`dist${prefix}`, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(`dist${prefix}/${d.name}/page/2/index.html`));
  return dirs.length ? `${prefix}/${dirs[0].name}/` : to;
}
for (const r0 of doc.tags ?? []) {
  const r = { ...r0, to: realTarget(r0.to) };
  lines.push(`location = ${r.from} { return ${r.code ?? 301} ${r.to}; }`);
  if (r.from.endsWith('/') && r.from !== '/') lines.push(`location = ${r.from.slice(0, -1)} { return ${r.code ?? 301} ${r.to}; }`);
}
const ids = doc.query_tickets_id ?? [];
if (ids.length) {
  lines.push('location = /tickets/event.php {');
  for (const r of ids) lines.push(`  if ($arg_id = "${r.id}") { return 301 ${r.to}; }`);
  lines.push('}');
}
// after_t2: Traefik keeps requests WITH order or reset parameters on WordPress (spec 63 section 7.3), so the site only ever sees the
// parameter-free old shop pages. They answer 301 from T0, not a 404 for a customer's bookmark.
let afterT2 = 0;
for (const r of doc.after_t2 ?? []) {
  if (r.from.endsWith('/*')) lines.push(`location ^~ ${r.from.slice(0, -1)} { return 301 ${r.to}; }`);
  else lines.push(`location = ${r.from} { if ($args = "") { return 301 ${r.to}; } }`);
  afterT2++;
}
appendFileSync(file, lines.join('\n') + '\n');
console.log(`postbuild-redirects-extra: ${(doc.tags ?? []).length} tag rules, ${ids.length} ticket id rules, ${afterT2} old shop page rules`);
