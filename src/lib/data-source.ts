/**
 * THE data entry point of every page. One setting decides where events come from:
 *
 *   DATA_SOURCE=fixture (default)  data/snapshot/<lang>.json, written by tools/build-snapshot.mjs
 *   DATA_SOURCE=feed               the platform feed through the kit client
 *                                  (PUBLIC_ARENA_API + PUBLIC_FEED_TOKEN), one pass per language (?locale=)
 *
 * Both give the same shape (SiteData), so a page never knows which one it reads.
 * Runs at build time only. Results are cached per language for the build.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createArenaClient, type EventsSnapshot, type FeedSeries } from 'arena-site-kit/arena';
import { createEventStore, type EventStore, type SiteEvent } from 'arena-site-kit/lib/events';
import { buildTours, hideChildrenInLists, tourCard, type Tour, type TourCard } from 'arena-site-kit/lib/tours';
import { contentLocaleState, type ContentLocaleState } from 'arena-site-kit/lib/content-locale';
import { arena, dataSource, kitConfig, languages } from '../../site.config.ts';

export type { SiteEvent, Tour, TourCard, ContentLocaleState };
export { tourCard, contentLocaleState };

export interface SiteData {
  lang: string;
  source: 'fixture' | 'feed';
  store: EventStore;
  /** Every series (tour), also the ones with only finished events. */
  series: FeedSeries[];
  /** Series with their child events, soonest first (finished ones last). */
  tours: Tour<SiteEvent>[];
  /** Tours that still have an upcoming child event. */
  upcomingTours: Tour<SiteEvent>[];
  /** Tours whose events are all over. */
  pastTours: Tour<SiteEvent>[];
  /** Upcoming public events for the home list: children of a tour with hide_children_in_lists are left out. */
  upcoming: SiteEvent[];
  /** Upcoming public events, tour children included. */
  upcomingAll: SiteEvent[];
  /** Finished public events (every one has its own page), newest first. */
  past: SiteEvent[];
  /** Every event that gets a page /events/<slug>/ (public and test). */
  routeEvents: SiteEvent[];
}

interface SnapshotFile extends EventsSnapshot {
  locale?: string;
  series?: FeedSeries[];
}

function readFixture(lang: string): SnapshotFile {
  const file = resolve('data', 'snapshot', `${lang}.json`);
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as SnapshotFile;
  } catch {
    throw new Error(`data/snapshot/${lang}.json is missing: run "npm run prepare:data" (or set DATA_SOURCE=feed)`);
  }
}

/** The kit client has no locale parameter: this fetch adds ?locale=<lang> to every feed read. */
function localeFetch(lang: string): typeof fetch {
  return (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url);
    if (!url.searchParams.has('locale')) url.searchParams.set('locale', lang);
    return fetch(url, init);
  };
}

async function readFeed(lang: string): Promise<SnapshotFile> {
  if (!arena.feedToken) throw new Error('DATA_SOURCE=feed needs PUBLIC_FEED_TOKEN');
  const client = createArenaClient({ apiBase: arena.apiBase, feedToken: arena.feedToken, fetch: localeFetch(lang) });
  const snapshot = await client.fetchSnapshot();
  const series = await fetchSeries(lang);
  return { ...snapshot, locale: lang, series };
}

/** Tours: GET /v1/public/feeds/{token}/series (spec 63 §15.2); an older platform without the route yields none. */
async function fetchSeries(lang: string): Promise<FeedSeries[]> {
  const base = arena.apiBase.replace(/\/+$/, '');
  const res = await localeFetch(lang)(`${base}/v1/public/feeds/${arena.feedToken}/series`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`series feed answered ${res.status}`);
  const body = (await res.json()) as { series?: FeedSeries[] } | FeedSeries[];
  return Array.isArray(body) ? body : body.series ?? [];
}

const cache = new Map<string, Promise<SiteData>>();

export function loadSiteData(lang: string): Promise<SiteData> {
  if (!languages.some((l) => l.code === lang)) throw new Error(`unknown language ${lang}`);
  let p = cache.get(lang);
  if (!p) {
    p = (async () => {
      const raw = dataSource === 'feed' ? await readFeed(lang) : readFixture(lang);
      const store = createEventStore(raw, {
        mainToken: arena.feedToken,
        testToken: arena.testFeedToken,
        fallbackTimezone: kitConfig.fallbackTimezone,
      });
      const series = raw.series ?? [];
      const events = store.siteEvents();
      const tours = buildTours(series, events);
      const upcomingAll = store.upcomingEvents();
      return {
        lang,
        source: dataSource,
        store,
        series,
        tours,
        upcomingTours: tours.filter((t) => t.events.some((e) => !e.past)),
        pastTours: tours.filter((t) => t.events.length > 0 && t.events.every((e) => e.past)),
        upcoming: hideChildrenInLists(upcomingAll, series),
        upcomingAll,
        past: store.pastEvents(),
        routeEvents: store.routeEvents(),
      };
    })();
    cache.set(lang, p);
  }
  return p;
}
