// Fills public/_site/media from media/ (the downloaded WordPress files) as the plan in
// data/snapshot/media-plan.json says: posters max 800 px wide, hero and gallery max 1600 px, webp.
// media/ empty or missing: runs tools/download-media.mjs first. Output is NOT committed.
// Usage: node tools/prepare-media.mjs
import { readFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

function hasFiles(dir) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { withFileTypes: true }).some((e) => (e.isDirectory() ? hasFiles(`${dir}/${e.name}`) : true));
}
if (!hasFiles('media')) {
  console.log('media/ is empty: downloading the WordPress files');
  const r = spawnSync(process.execPath, ['tools/download-media.mjs'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const plan = JSON.parse(readFileSync('data/snapshot/media-plan.json', 'utf8'));
let done = 0, skipped = 0, failed = 0;
for (const item of plan) {
  if (existsSync(item.dest) && statSync(item.dest).mtimeMs >= statSync(item.src).mtimeMs) { skipped++; continue; }
  try {
    mkdirSync(dirname(item.dest), { recursive: true });
    await sharp(item.src).rotate().resize({ width: item.maxWidth, withoutEnlargement: true }).webp({ quality: 80 }).toFile(item.dest);
    done++;
  } catch (e) {
    failed++;
    console.error('FAIL', item.src, e.message);
  }
}
console.log(`media: ${done} written, ${skipped} up to date, ${failed} failed`);
if (failed) process.exit(1);
