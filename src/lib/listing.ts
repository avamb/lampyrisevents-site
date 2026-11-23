/**
 * Pages made of data: the tours list, the past events list (paginated) and the event / tour pages.
 * One place knows the addresses, so getStaticPaths and the language switcher agree.
 */
import { hideChildrenInLists } from 'arena-site-kit/lib/tours';
import { hreflangAlternates, type HreflangAlternate } from 'arena-site-kit/lib/seo';
import { languages, defaultLanguage, siteUrl } from '../../site.config.ts';
import { loadSiteData, type SiteData, type SiteEvent, type Tour } from './data-source.ts';
import { pagePath } from './routes.ts';
import { hasTicketsPage } from './tickets.ts';

export const PAST_PAGE_SIZE = 12;

export type PastItem = { kind: 'event'; start: string; event: SiteEvent } | { kind: 'tour'; start: string; tour: Tour<SiteEvent> };

/** Finished events and finished tours, newest first. Children of a tour are inside the tour card. */
export function pastItems(data: SiteData): PastItem[] {
  const events = hideChildrenInLists(data.past, data.series);
  const items: PastItem[] = [
    ...events.map((event): PastItem => ({ kind: 'event', start: event.primary?.start_at ?? '', event })),
    ...data.pastTours.map((tour): PastItem => ({ kind: 'tour', start: tour.events[0]?.primary?.start_at ?? '', tour })),
  ];
  return items.sort((a, b) => b.start.localeCompare(a.start));
}

export function pastPageCount(data: SiteData): number {
  return Math.max(1, Math.ceil(pastItems(data).length / PAST_PAGE_SIZE));
}

/** Address of page n (1-based) of the past events list in a language. */
export function pastPagePath(lang: string, n: number): string {
  const base = pagePath('past-events', lang);
  return n <= 1 ? base : `${base}page/${n}/`;
}

/** hreflang for a list page that exists in every language. */
export function listHreflang(pathFor: (lang: string) => string): HreflangAlternate[] {
  return hreflangAlternates(undefined, languages, (l) => pathFor(l.code), siteUrl, defaultLanguage);
}

export interface ListRoute {
  path: string;
  kind: 'tours' | 'past';
  lang: string;
  page: number;
}

/** Every tours page and every page of the past events list, all languages. */
export async function listRoutes(): Promise<ListRoute[]> {
  const out: ListRoute[] = [];
  for (const l of languages) {
    out.push({ path: pagePath('tours', l.code), kind: 'tours', lang: l.code, page: 1 });
    const n = pastPageCount(await loadSiteData(l.code));
    for (let p = 1; p <= n; p++) out.push({ path: pastPagePath(l.code, p), kind: 'past', lang: l.code, page: p });
  }
  return out;
}

export interface EventRoute {
  slug: string;
  lang: string;
  kind: 'event' | 'tour';
}

/** Events and tours share /events/<slug>/: one list of routes, a slug clash is a build error. */
export async function eventRoutes(lang: string): Promise<EventRoute[]> {
  const data = await loadSiteData(lang);
  const out = new Map<string, EventRoute>();
  for (const e of data.routeEvents) out.set(e.slug, { slug: e.slug, lang, kind: 'event' });
  for (const t of data.tours) {
    if (t.events.length === 0) continue;
    if (out.has(t.series.slug)) throw new Error(`slug ${t.series.slug} is used by both an event and a tour`);
    out.set(t.series.slug, { slug: t.series.slug, lang, kind: 'tour' });
  }
  return [...out.values()];
}

/** Events with a sales page /tickets/<slug>/: upcoming, with a sellable (non-partner, not cancelled) session. */
export async function ticketsRoutes(lang: string): Promise<{ slug: string; lang: string }[]> {
  const data = await loadSiteData(lang);
  const now = new Date();
  return data.routeEvents.filter((e) => hasTicketsPage(e, now)).map((e) => ({ slug: e.slug, lang }));
}
