// Runs after `arena-site-kit postbuild`. The kit hashes EVERY inline <script>, JSON-LD blocks included.
// A JSON-LD block (type application/ld+json) is data, not code: the browser never runs it, so the
// script-src policy does not apply to it. Every event page has its own block, and with hundreds of events
// the list of hashes passes the 4096 byte limit of one nginx config word (nginx refuses to start).
// This step drops the hashes that belong to JSON-LD blocks only. Usage: node tools/trim-csp-hashes.mjs [dist]
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] || 'dist';
const hash = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;

function* htmlFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

const code = new Set();
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (m[2].trim() && !/type\s*=\s*["']?application\/ld\+json/i.test(m[1])) code.add(hash(m[2]));
  }
}

const conf = join(dist, '.nginx', 'csp-hashes.conf');
const text = readFileSync(conf, 'utf8');
const out = text.replace(/^set \$csp_script_hashes "([^"]*)";$/m, () => `set $csp_script_hashes "${[...code].join(' ')}";`);
writeFileSync(conf, out);
const longest = Math.max(...out.split('\n').map((l) => l.length));
console.log(`trim-csp-hashes: ${code.size} executable inline script hash(es), longest line ${longest} characters`);
if (longest > 4000) {
  console.error('csp-hashes.conf has a line that nginx cannot read (limit 4096)');
  process.exit(1);
}
