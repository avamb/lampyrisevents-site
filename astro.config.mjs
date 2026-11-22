// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// Static only: dist/ is plain files served by nginx. Addresses keep the WordPress shape.
// Everything Astro emits (CSS, JS) goes under /_site/. No inline CSS (CSP allows 'self' + hashes).
const site = process.env.SITE_URL || 'https://lampyrisevents.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    assets: '_site/assets',
    inlineStylesheets: 'never',
  },
  vite: {
    // The kit ships .ts files: Vite must compile them.
    ssr: { noExternal: ['arena-site-kit'] },
    build: { assetsInlineLimit: 0 },
  },
  integrations: [svelte()],
  devToolbar: { enabled: false },
});
