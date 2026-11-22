// Copies the self-hosted Manrope variable font (npm @fontsource-variable/manrope)
// into public/_site/fonts: latin, latin-ext, cyrillic, cyrillic-ext. Usage: node tools/prepare-fonts.mjs
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const from = join('node_modules', '@fontsource-variable', 'manrope', 'files');
const to = join('public', '_site', 'fonts');
mkdirSync(to, { recursive: true });
for (const subset of ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']) {
  copyFileSync(join(from, `manrope-${subset}-wght-normal.woff2`), join(to, `manrope-${subset}.woff2`));
}
console.log('fonts: 4 files in public/_site/fonts');
