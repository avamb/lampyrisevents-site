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
