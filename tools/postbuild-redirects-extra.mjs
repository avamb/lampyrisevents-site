// The kit's nginx generator reads only redirects, gone, events and query_p. This step appends the
// `tags` rules and the `query_tickets_id` rules of redirects.yaml to dist/.nginx/redirects.conf.
// Run after `arena-site-kit postbuild`. Old WordPress addresses of tags answer 301, never 404.
import { readFileSync, appendFileSync } from 'node:fs';
import { parse } from 'yaml';

const doc = parse(readFileSync('redirects.yaml', 'utf8'));
const file = 'dist/.nginx/redirects.conf';
const lines = ['# Appended by tools/postbuild-redirects-extra.mjs from the tags and query_tickets_id sections of redirects.yaml.'];
for (const r of doc.tags ?? []) {
  lines.push(`location = ${r.from} { return ${r.code ?? 301} ${r.to}; }`);
  if (r.from.endsWith('/') && r.from !== '/') lines.push(`location = ${r.from.slice(0, -1)} { return ${r.code ?? 301} ${r.to}; }`);
}
const ids = doc.query_tickets_id ?? [];
if (ids.length) {
  lines.push('location = /tickets/event.php {');
  for (const r of ids) lines.push(`  if ($arg_id = "${r.id}") { return 301 ${r.to}; }`);
  lines.push('}');
}
appendFileSync(file, lines.join('\n') + '\n');
console.log(`postbuild-redirects-extra: ${(doc.tags ?? []).length} tag rules, ${ids.length} ticket id rules`);
