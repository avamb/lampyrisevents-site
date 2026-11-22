// Converts the WordPress export (data/export/events.json, tours.json, past.json, promoters.json)
// into the kit's feed-shaped snapshots, one file per site language: data/snapshot/<lang>.json.
//
//   { fetched_at, source, locale, events: FeedEventDetail[], series: FeedSeries[], removed_events: [] }
//
// - a WordPress tour becomes a series (events.series_id, series.event_ids, hide_children_in_lists);
// - a WordPress city event becomes an event with ONE session; a partner ticket office becomes
//   sales_mode 'external' with external {url, seller_name, price_from, currency}
//   (tickets.lampyrisevents.com is rendered as external too: it has no real feed);
// - past events (past.json) are NORMAL events whose sessions are over: the kit's isPast()/pastOf()
//   separate them, so one snapshot serves both lists. The kit's lib/legacy.ts is for Vino's Bil24-era
//   static cards and is not used;
// - the event NAME is never translated (decision 25.09), description_html is, per locale;
// - content_locale: language of the text shown; available_locales: languages with a real text.
// Also writes data/snapshot/media-plan.json for tools/prepare-media.mjs.
// Usage: node tools/build-snapshot.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

const read = (f) => JSON.parse(readFileSync(join('data', 'export', f), 'utf8'));
const languages = JSON.parse(readFileSync('src/lib/languages.json', 'utf8')).map((l) => l.code);
const eventsExp = read('events.json');
const toursExp = read('tours.json');
const pastExp = read('past.json');
const promoters = read('promoters.json').promoters;

const warn = (...a) => console.warn('warn:', ...a);

// ---------- html cleaning ----------

const KEEP = new Set(['strong', 'b', 'em', 'i', 'u', 's', 'a', 'br']);
const BLOCK_LIST = new Set(['ul', 'ol']);
const HEADINGS = { h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h4', h6: 'h4' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SKIP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'noscript', 'template']);

function walk(node, inList) {
  if (node.type === 'text') return esc(node.data.replace(/\r\n?/g, '\n'));
  if (node.type !== 'tag') return '';
  const name = node.name.toLowerCase();
  if (SKIP.has(name)) return '';
  const kids = (n) => (n.children || []).map((c) => walk(c, inList || BLOCK_LIST.has(name))).join('');
  if (name === 'br') return '<br>';
  if (BLOCK_LIST.has(name)) {
    const items = (node.children || []).filter((c) => c.type === 'tag' && c.name === 'li').map((c) => walk(c, true)).join('');
    return inList ? `<${name}>${items}</${name}>` : `\n\n<${name}>${items}</${name}>\n\n`;
  }
  if (name === 'li') return `<li>${kids(node).replace(/^\s+|\s+$/g, '')}</li>`;
  if (HEADINGS[name]) {
    const h = HEADINGS[name];
    return inList ? kids(node) : `\n\n<${h}>${kids(node).replace(/\s+/g, ' ').trim()}</${h}>\n\n`;
  }
  if (name === 'blockquote') return inList ? kids(node) : `\n\n<blockquote>${kids(node).trim()}</blockquote>\n\n`;
  if (name === 'hr') return inList ? '' : '\n\n<hr>\n\n';
  if (name === 'a') {
    const href = String((node.attribs || {}).href || '').trim();
    const inner = kids(node);
    return /^(https?:|mailto:|tel:)/i.test(href) ? `<a href="${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${inner}</a>` : inner;
  }
  if (KEEP.has(name)) return `<${name}>${kids(node)}</${name}>`;
  if (name === 'p' || name === 'div' || name === 'section' || name === 'figure' || name === 'table' || name === 'tr') {
    return inList ? kids(node) : `\n\n${kids(node)}\n\n`;
  }
  return kids(node); // span, font, unknown: unwrap
}

/** Cleaned description: allowed tags only, paragraphs from blank lines (the WordPress wpautop). */
export function cleanHtml(raw) {
  if (!raw) return '';
  const $ = cheerio.load(String(raw), null, false);
  const out = $.root().contents().toArray().map((n) => walk(n, false)).join('');
  const chunks = out.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
  const html = chunks
    .map((c) => (/^<(ul|ol|h[2-4]|blockquote|hr)\b/.test(c) ? c : `<p>${c.replace(/\s*\n\s*/g, '<br>')}</p>`))
    .join('\n');
  return html.replace(/<p>(\s|<br>)*<\/p>/g, '');
}

function plainText(html, max = 300) {
  const t = html.replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// ---------- time zones ----------

const COUNTRY_TZ = [
  [/czech|česk|чешск|czechia/i, 'Europe/Prague'],
  [/latvia|latvij|латви/i, 'Europe/Riga'],
  [/german|deutsch|německ|герман/i, 'Europe/Berlin'],
  [/poland|polsk|польш/i, 'Europe/Warsaw'],
  [/estonia|eston|эстони/i, 'Europe/Tallinn'],
  [/finland|finsk|финлянд/i, 'Europe/Helsinki'],
  [/hungary|maďarsk|венгри/i, 'Europe/Budapest'],
  [/lithuania|litev|литв/i, 'Europe/Vilnius'],
  [/spain|španěl|испани/i, 'Europe/Madrid'],
];
const CITY_TZ = [
  [/prague|praha|прага|brno|pardubice|karlovy|jarom|hradec/i, 'Europe/Prague'],
  [/jurmala|riga/i, 'Europe/Riga'],
  [/berlin/i, 'Europe/Berlin'],
  [/warsaw|warszawa|krak|katowice/i, 'Europe/Warsaw'],
  [/tallinn/i, 'Europe/Tallinn'],
  [/helsinki/i, 'Europe/Helsinki'],
  [/budapest/i, 'Europe/Budapest'],
  [/vilnius/i, 'Europe/Vilnius'],
  [/madrid|marbella|alicante|valencia|barcelona/i, 'Europe/Madrid'],
];
function tzFor(country, city) {
  for (const [re, tz] of COUNTRY_TZ) if (re.test(country || '')) return tz;
  for (const [re, tz] of CITY_TZ) if (re.test(city || '')) return tz;
  return 'Europe/Prague';
}
function tzOffset(ts, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(new Date(ts)).map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ts / 1000) * 1000;
}
/** 'YYYY-MM-DD HH:MM:SS' wall time in `tz` -> UTC Date. */
function localToUtc(local, tz) {
  const m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?/.exec(local || '');
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  let ts = wall - tzOffset(wall, tz);
  ts = wall - tzOffset(ts, tz);
  return new Date(ts);
}
const iso = (d) => d.toISOString().replace('.000Z', 'Z');
const wpTime = (s) => (s ? iso(new Date(s.replace(' ', 'T') + 'Z')) : iso(new Date(0)));

// ---------- partners, price ----------

const SELLERS = [
  [/(^|\.)eventim\./i, 'Eventim'],
  [/(^|\.)ticketportal\./i, 'Ticketportal'],
  [/(^|\.)bilesuparadize\./i, 'Biļešu Paradīze'],
  [/(^|\.)pankoncert\./i, 'Pankoncert'],
  [/(^|\.)piletitasku\./i, 'Piletitasku'],
  [/(^|\.)lippu\./i, 'Lippu'],
  [/(^|\.)goout\./i, 'GoOut'],
  [/(^|\.)kakava\./i, 'Kakava'],
  [/^tickets\.lampyrisevents\.com$/i, 'Lampyris Tickets'],
];
function sellerName(host) {
  for (const [re, n] of SELLERS) if (re.test(host)) return n;
  const parts = host.replace(/^www\./, '').split('.');
  const n = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return n.charAt(0).toUpperCase() + n.slice(1);
}
/** A usable partner ticket office, or null (empty, not https, or the old Bil24 widget of the WordPress site). */
function partnerOf(url) {
  if (!url) return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (/^(www\.)?lampyrisevents\.com$/i.test(u.hostname)) return null;
  return { url: u.toString(), seller_name: sellerName(u.hostname.toLowerCase()) };
}
const CURRENCY = { EUR: 'EUR', CZK: 'CZK', 'KČ': 'CZK', 'KC': 'CZK', FT: 'HUF', HUF: 'HUF', PLN: 'PLN', 'ZŁ': 'PLN' };
function priceOf(o) {
  const n = parseFloat(String(o.price_from || '').replace(',', '.'));
  const cur = CURRENCY[String(o.currency || '').trim().toUpperCase()] || '';
  if (!Number.isFinite(n) || !cur) return { price_from: null, currency: cur };
  return { price_from: Math.round(n * 100), currency: cur };
}

// ---------- media ----------

const mediaPlan = new Map(); // dest -> { src, dest, kind, maxWidth }
const MAX = { poster: 800, hero: 1600, gallery: 1600 };
function mediaFile(m) {
  const u = new URL(m.url);
  return join('media', u.hostname, decodeURIComponent(u.pathname));
}
function useMedia(m, kind) {
  if (!m || !m.url) return null;
  const src = mediaFile(m).replace(/\\/g, '/');
  if (!existsSync(src)) { warn('media file missing, skipped:', src); return null; }
  const web = `/_site/media/${kind}/${m.id}.webp`;
  const dest = `public${web}`;
  if (!mediaPlan.has(dest)) mediaPlan.set(dest, { src, dest, kind, maxWidth: MAX[kind] });
  return web;
}
const posterOf = (o) => useMedia((o.media.poster && o.media.poster[0]) || o.media.featured, 'poster');
function photo(m) {
  const url = useMedia(m, 'gallery');
  if (!url) return null;
  const ratio = m.width && m.height ? m.height / m.width : null;
  const w = m.width ? Math.min(m.width, MAX.gallery) : null;
  return { media_id: String(m.id), url, caption: (m.alt || '').trim() || null, width: w, height: w && ratio ? Math.round(w * ratio) : null };
}

function videoOf(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  let id = null;
  if (/youtu\.be$/.test(u.hostname)) id = u.pathname.slice(1);
  else if (/youtube\.com$/.test(u.hostname)) {
    id = u.searchParams.get('v') || (/^\/(shorts|live|embed)\/([^/]+)/.exec(u.pathname) || [])[2] || null;
  }
  if (!id) return { provider: 'other', video_id: null, embed_url: null, url };
  return { provider: 'youtube', video_id: id, embed_url: `https://www.youtube-nocookie.com/embed/${id}`, url: `https://www.youtube.com/watch?v=${id}` };
}

// ---------- groups ----------

const groups = new Map(); // wp id -> group
for (const g of [...toursExp.groups, ...eventsExp.groups, ...pastExp.groups]) {
  if (!groups.has(g.original.id)) groups.set(g.original.id, g);
}
const tourGroups = [...groups.values()].filter((g) => g.original.is_tour);
const eventGroups = [...groups.values()].filter((g) => !g.original.is_tour);
const tourIds = new Map(tourGroups.map((g) => [g.original.id, `wp-tour-${g.original.id}`]));

/** Posts by language, the original included. */
function texts(g) {
  return { [g.language]: g.original, ...g.translations };
}
function pick(g, lang) {
  const t = texts(g);
  return { post: t[lang] || g.original, contentLocale: t[lang] ? lang : g.language, available: Object.keys(t).sort() };
}

function buildEvent(g, lang) {
  const o = g.original;
  const { post, contentLocale, available } = pick(g, lang);
  const tz = tzFor(o.country, o.city);
  const start = localToUtc(o.date_local, tz) || new Date(0);
  const end = new Date(start.getTime() + 3 * 3600_000);
  const price = priceOf(o);
  const partner = partnerOf(o.partner_url);
  const seriesId = o.tour_id ? tourIds.get(o.tour_id) || null : null;
  const tourG = o.tour_id ? groups.get(o.tour_id) : null;
  let poster = posterOf(o);
  if (!poster && tourG) poster = posterOf(tourG.original); // a city of a tour shows the tour poster
  const past = start.getTime() + 3 * 3600_000 < Date.now();
  const session = {
    id: `wp-${o.id}-s1`,
    start_at: iso(start),
    end_at: iso(end),
    sales_end_at: iso(start),
    doors_open_at: null,
    capacity_total: 0,
    status: 'scheduled',
    buyer_fields: [],
    service_fee_percent: '0.00',
    timezone: tz,
    sales_state: past ? 'ended' : partner ? 'external' : 'soon',
    tiers: [],
    poster_media_id: null,
    poster_url: null,
  };
  if (partner) {
    session.sales_mode = 'external';
    session.external = { url: partner.url, seller_name: partner.seller_name, price_from: price.price_from, currency: price.currency };
  }
  const extra = (o.partner_urls_extra || []).map(partnerOf).filter((p) => p && p.url !== (partner && partner.url));
  const videos = [o.media.video_link, ...['video_link', 'video_link_2', 'video_link_3', 'video_link_4'].map((k) => (o.meta_raw || {})[k])]
    .filter(Boolean).map(videoOf).filter(Boolean);
  const seenVideo = new Set();
  const gallery = (o.media.gallery || []).map(photo).filter(Boolean);
  const html = cleanHtml(post.description_html);
  return {
    id: `wp-${o.id}`,
    display_number: o.id,
    org_id: 'lampyris',
    name: o.name, // never translated (decision 25.09)
    description: null,
    description_html: html,
    description_text: plainText(html),
    status: 'published',
    first_session_at: session.start_at,
    last_session_at: session.end_at,
    venue_names: o.venue ? [o.venue] : [],
    visibility: 'public',
    image_url: null,
    poster_media_id: null,
    poster_url: poster,
    created_at: wpTime(o.published),
    updated_at: wpTime(o.modified),
    series_id: seriesId,
    content_locale: contentLocale,
    available_locales: available,
    translation_stale: false,
    slug: o.slug,
    age_rating: null,
    short_description: null,
    sessions: [session],
    materials: {
      gallery,
      videos: videos.filter((v) => (seenVideo.has(v.url) ? false : seenVideo.add(v.url))),
      partner_links: extra,
      map_point: null,
      report_photos: [],
    },
    venues: [{
      name: post.venue || o.venue || '',
      country: post.country || o.country || null,
      city: post.city || o.city || null,
      address: o.venue_address || null,
      postal_code: null,
      timezone: tz,
      session_starts: [session.start_at],
    }],
  };
}

function buildSeries(g, lang, childIds) {
  const o = g.original;
  const { post, contentLocale, available } = pick(g, lang);
  const meta = o.meta_raw || {};
  const partnersHtml = cleanHtml(meta.lampyris_tour_partners_text || '');
  if (meta.lampyris_tour_hero_wide) warn('tour hero_wide is set but not mapped:', o.slug, meta.lampyris_tour_hero_wide);
  const video = meta.lampyris_tour_hero_video ? videoOf(meta.lampyris_tour_hero_video) : null;
  return {
    id: tourIds.get(o.id),
    slug: o.slug,
    name: o.name,
    description_html: cleanHtml(post.description_html),
    poster_url: posterOf(o),
    hero_url: null,
    hero_video_url: video ? video.url : null,
    partners_text_html: partnersHtml || null,
    hide_children_in_lists: meta.lampyris_tour_hide_children !== '0',
    event_ids: childIds,
    // site extras: the feed's series answer carries the same two fields as an event
    content_locale: contentLocale,
    available_locales: available,
  };
}

// ---------- write ----------

mkdirSync(join('data', 'snapshot'), { recursive: true });
const fetchedAt = pastExp.generated ? iso(new Date(pastExp.generated)) : iso(new Date(0));
const counts = {};
for (const lang of languages) {
  const events = eventGroups.map((g) => buildEvent(g, lang)).sort((a, b) => a.first_session_at.localeCompare(b.first_session_at) || a.slug.localeCompare(b.slug));
  const series = tourGroups.map((g) => {
    const kids = events.filter((e) => e.series_id === tourIds.get(g.original.id)).map((e) => e.id);
    return buildSeries(g, lang, kids);
  });
  const snapshot = { fetched_at: fetchedAt, source: 'sample', locale: lang, events, series, removed_events: [] };
  writeFileSync(join('data', 'snapshot', `${lang}.json`), JSON.stringify(snapshot, null, 1) + '\n');
  counts[lang] = { events: events.length, series: series.length };
}
writeFileSync(join('data', 'snapshot', 'media-plan.json'), JSON.stringify([...mediaPlan.values()].sort((a, b) => a.dest.localeCompare(b.dest)), null, 1) + '\n');
writeFileSync(join('data', 'snapshot', 'promoters.json'), JSON.stringify(promoters, null, 1) + '\n');

const now = Date.now();
const all = eventGroups.map((g) => buildEvent(g, 'en'));
const pastN = all.filter((e) => new Date(e.last_session_at).getTime() < now).length;
console.log(`snapshot: ${languages.length} languages, ${eventGroups.length} events (${all.length - pastN} upcoming, ${pastN} past), ${tourGroups.length} tours, ${mediaPlan.size} media files planned`);
