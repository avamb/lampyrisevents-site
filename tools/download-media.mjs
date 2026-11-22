// Downloads the files listed in data/export/media-manifest.json into media/ (ignored by git).
// Usage: node tools/download-media.mjs [--dry]
// Skips files that already exist. Public URLs only, no credentials.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const dry = process.argv.includes('--dry');
const { items } = JSON.parse(readFileSync('data/export/media-manifest.json', 'utf8'));
let ok = 0, skip = 0, fail = 0;
for (const it of items) {
  let u;
  try { u = new URL(it.url); } catch { fail++; console.error('bad url', it.url); continue; }
  const dest = join('media', u.hostname, decodeURIComponent(u.pathname));
  if (existsSync(dest)) { skip++; continue; }
  if (dry) { console.log('would fetch', it.url); continue; }
  try {
    const r = await fetch(it.url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
  } catch (e) { fail++; console.error('FAIL', it.url, e.message); }
}
console.log({ ok, skip, fail });
