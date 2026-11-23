// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// Static only: dist/ is plain files served by nginx. Addresses keep the WordPress shape.
// Everything Astro emits (CSS, JS) goes under /_site/. No inline CSS (CSP allows 'self' + hashes).
const site = process.env.SITE_URL || 'https://lampyrisevents.com';
// Dev only: the ticket widget calls /v1 on the page origin when PUBLIC_ARENA_WIDGET_API is empty; DEV_API_PROXY is the API to forward to.
const devApi = process.env.DEV_API_PROXY;

export default defineConfig({
  site,
  output: 'static',
  // With the dev API proxy the slash rule must not answer /v1/... before the proxy does.
  trailingSlash: devApi ? 'ignore' : 'always',
  build: {
    format: 'directory',
    assets: '_site/assets',
    inlineStylesheets: 'never',
  },
  vite: {
    // The kit ships .ts files: Vite must compile them.
    ssr: { noExternal: ['arena-site-kit'] },
    build: { assetsInlineLimit: 0 },
    ...(devApi ? { server: { proxy: { '/v1': { target: devApi, changeOrigin: true, secure: true }, ...(process.env.DEV_WIDGET_PROXY ? { '/widget': { target: process.env.DEV_WIDGET_PROXY, changeOrigin: true, secure: true } } : {}) } } } : {}),
  },
  integrations: [svelte()],
  devToolbar: { enabled: false },
});
