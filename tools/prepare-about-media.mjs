// Resizes the 10 concert photos of the About us page from media/ (the downloaded WordPress files) to
// public/_site/media/about/<name>.webp: max 1600 px wide, webp q80. Output IS committed, like the other media.
// Usage: node tools/prepare-about-media.mjs
import { existsSync, mkdirSync } from 'node:fs';
import { basename, extname } from 'node:path';
import sharp from 'sharp';

const root = 'media/lampyrisevents.com/wp-content/uploads';
const sources = [
  '2024/06/img_20211002_184408_347-819x1024.jpg',
  '2024/07/img_20211002_184339_477-2.jpg',
  '2024/07/alsusha-74-1-scaled.jpg',
  '2024/07/img_20240612_122449-1.jpg',
  '2024/07/screenshot_20240612_122713_com.hihonor.photos.jpg',
  '2024/06/photo1718186284-1.jpeg',
  '2024/06/img-20240327-wa0029.jpg',
  '2024/07/screenshot_20240706_125228_com.google.android.apps_.photos-1.jpg',
  '2024/07/img_20240418_210414-1-scaled.jpg',
  '2024/06/33584414_981884098637404_1244673645410779136_o.jpg',
];
const outDir = 'public/_site/media/about';
mkdirSync(outDir, { recursive: true });
let failed = 0;
for (const rel of sources) {
  const src = `${root}/${rel}`;
  const name = basename(rel, extname(rel));
  const dest = `${outDir}/${name}.webp`;
  if (!existsSync(src)) { failed++; console.error('MISSING', src); continue; }
  const info = await sharp(src).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
  console.log(`${name}.webp ${info.width}x${info.height}`);
}
if (failed) process.exit(1);
