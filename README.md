# lampyrisevents-site

Content, dictionaries, redirects and design tokens exported from the WordPress site lampyrisevents.com
for the static site on the platform feed (spec 63). Report: `docs/export_report_ru.md`.

```
tools/wp-export/   read-only PHP exports, run with run.mjs over ssh (no writes to WordPress)
data/export/       JSON exports, media manifest, saved WordPress sitemaps
content/pages/     clean HTML of the site pages, 11 languages
i18n/              interface dictionaries, 11 languages (+ glossary, provenance)
redirects.yaml     every old address and the answer of the new site (generated)
design/            design tokens (css, json); docs/design has 360 px and desktop screenshots
tools/             fetch-pages, clean-html, build-redirects, build-media-manifest, download-media,
                   check-i18n, check-legal-text, design-capture, report-stats
```

Commands: `npm install`, `node tools/check-i18n.mjs`, `node tools/check-legal-text.mjs`,
`node tools/build-redirects.mjs`, `node tools/download-media.mjs` (files go to the ignored `media/`).
Event names are not translated (decision 25.09). Legal texts are never edited, only their markup is stripped.

## Site (Astro on arena-site-kit)

Static site: Astro 5 + Svelte 5 islands, engine from `arena-site-kit` (pinned tag in `package.json`).

```
npm install
npm run prepare:data   # snapshots, media (sharp) and fonts: data/snapshot/*.json, public/_site/media, public/_site/fonts
npm run build          # astro build + arena-site-kit postbuild -> dist/
npx arena-site-kit check-dist
```

- `site.config.ts`: languages (en default, no prefix; cs de et fi hu lt lv pl ru uk with prefix), brand, env.
  Env: `SITE_URL` (default https://lampyrisevents.com), `SITE_INDEXING` (default false: noindex everywhere and robots.txt
  disallows all), `DATA_SOURCE`, `PUBLIC_ARENA_API`, `PUBLIC_FEED_TOKEN`, `PUBLIC_META_PIXEL_ID`, `PUBLIC_GA4_ID`,
  `PUBLIC_TURNSTILE_SITE_KEY`. Empty tracking ids mean no GA4/pixel call at all.
- `site.manifest.json` is generated: `node tools/gen-manifest.mjs` (languages + route table + required pages).
- Routes: `src/lib/routes.ts` (one table from `content/pages/index.json`, kit `createRoutes`). Languages without a WordPress
  page for a key get the English path under their prefix. Generic content pages: `src/pages/[...path].astro`
  (cleaned HTML of `content/pages/<lang>/<key>.html`, English fallback, hreflang only for existing translations).
- i18n: `src/lib/i18n.ts` (`ui(lang)`, `language(lang)`, `fmt()`), dictionaries `i18n/<lang>.json`.
- Layouts: `src/layouts/Base.astro` (head, robots, hreflang, header, footer, cookie banner, tracking) and `Page.astro`.
  Components in `src/components` (Header, Footer, Icon, islands/CookieBanner.svelte).
- Cookie banner: kit `createConsent` in notice mode (cookie `lp_consent`): tracking is ON until the visitor declines.

### Data source (one setting)

`DATA_SOURCE=fixture` (default) reads `data/snapshot/<lang>.json`; `DATA_SOURCE=feed` reads the platform feed through the
kit client (`PUBLIC_ARENA_API` + `PUBLIC_FEED_TOKEN`, one pass per language with `?locale=`). Pages import only
`src/lib/data-source.ts` (`loadSiteData(lang)`), so the source never shows in a page.

`tools/build-snapshot.mjs` converts `data/export/{events,tours,past,promoters}.json` to feed-shaped snapshots:
`{ fetched_at, source, locale, events: FeedEventDetail[], series: FeedSeries[], removed_events }`.
A WordPress tour is a series (`series_id`, `event_ids`, `hide_children_in_lists`), a city is an event with one session,
a partner ticket office is a session with `sales_mode: "external"` and `external {url, seller_name, price_from, currency}`.
Past events are normal events whose sessions are over (the kit separates them with `isPast`). Event names stay untranslated,
`description_html` is per locale, every event has `content_locale` and `available_locales`.
`tools/prepare-media.mjs` resizes the files of `media/` (posters 800 px, hero and gallery 1600 px, webp) into
`public/_site/media` (not committed); it downloads `media/` first when it is empty.

### Deploy (container)

`Dockerfile` (target `web`: node build, then nginx with the kit templates) and `docker-compose.yml` (service `web`, port `${WEB_PORT:-8080}`).
Build args are public values only: `SITE_URL` (default https://new.lampyrisevents.com), `SITE_INDEXING=false`, `PUBLIC_*`.
Routing, domains and secrets live in the deploy environment, never here.

```
docker build --target web -t lampyris-site .
docker compose up --build -d web
```

The resized media is committed in `public/_site/media` (about 11 MB), so the image build never downloads originals.
After a change of the media plan run `npm run prepare:data` and commit the new files. `tools/trim-csp-hashes.mjs` runs after the kit
postbuild: it drops the hashes of JSON-LD blocks (data, not code), without it the CSP line passes the nginx word limit.
Forms (contact, partnership) and the personal pages need `PUBLIC_TURNSTILE_SITE_KEY` and `PUBLIC_FEED_TOKEN`; without them they say the service is unavailable.
