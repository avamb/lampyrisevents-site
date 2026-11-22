/**
 * Small helpers of the event pages: dates in the session time zone, prices per currency, plural forms,
 * page intro text, series of an event, JSON-LD. Pure functions (the page components decide the markup).
 */
import { formatMoney, type SiteEvent } from 'arena-site-kit/lib/events';
import { priceFromByCurrency, type Tour, type TourEvent } from 'arena-site-kit/lib/tours';
import { eventSeriesId, seriesEventIds } from 'arena-site-kit/arena';
import type { FeedSeries, FeedSession } from 'arena-site-kit/arena';
import { partnerButton } from 'arena-site-kit/lib/partner';
import { sessionEndsAt } from 'arena-site-kit/arena';
import { genericPage } from './pages.ts';
import { fmt } from './i18n.ts';

/** "from 39 € · from 990 Kč": the lowest price per currency of the events still to come, never mixed. '' when none. */
export function priceText(events: TourEvent[], intl: string, template: string, now: Date = new Date()): string {
  return priceFromByCurrency(events, now)
    .map((p) => fmt(template, formatMoney(p.minor, p.currency, intl)))
    .join(' · ');
}

/** 25/11/2026 style date in a zone. */
export function dateShort(iso: string, tz: string, intl: string): string {
  return new Intl.DateTimeFormat(intl, { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

/** "Wed 2 December 2026, 20:00" in the zone of the session. */
export function dateLong(iso: string, tz: string, intl: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat(intl, { timeZone: tz, weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(d),
    time: new Intl.DateTimeFormat(intl, { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d),
  };
}

/** Parts of the date block of a city row: day number, short month, "Mon · 20:00". */
export function dateBlock(iso: string, tz: string, intl: string): { day: string; month: string; weekTime: string } {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intl, { timeZone: tz, ...o }).format(d);
  return {
    day: f({ day: 'numeric' }),
    month: f({ month: 'short' }).replace(/\.$/, ''),
    weekTime: `${f({ weekday: 'short' })} · ${f({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`,
  };
}

/** "23 November – 4 December 2026" (one date when both ends fall on the same day). */
export function dateRange(a: string, b: string, tz: string, intl: string): string {
  const f = new Intl.DateTimeFormat(intl, { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' });
  const x = f.format(new Date(a));
  const y = f.format(new Date(b));
  return x === y ? x : f.formatRange(new Date(a), new Date(b));
}

/** "%d city" / "%d cities": the three forms of the dictionary are one, few, many (other). */
export function citiesLabel(n: number, forms: string[], intl: string): string {
  const rule = new Intl.PluralRules(intl).select(n);
  const form = rule === 'one' ? forms[0] : rule === 'few' ? forms[1] ?? forms[2] : forms[2] ?? forms[1] ?? forms[0];
  return fmt(form, n);
}

/** Distinct cities of the events, in order. */
export function citiesOf(events: SiteEvent[]): string[] {
  return [...new Set(events.map((e) => e.venueCity).filter(Boolean))];
}

/** The series an event belongs to, or null. */
export function seriesOf(event: SiteEvent, series: FeedSeries[]): FeedSeries | null {
  const id = eventSeriesId(event.raw);
  return series.find((s) => s.id === id || seriesEventIds(s).includes(event.raw.id)) ?? null;
}

/** What the page shows for a session. */
export type SessionAction =
  | { kind: 'past' }
  | { kind: 'cancelled' }
  | { kind: 'soldout' }
  | { kind: 'partner'; url: string; seller: string; priceFrom: number | null; currency: string }
  | { kind: 'soon' };

export function sessionAction(s: FeedSession, now: Date = new Date()): SessionAction {
  if (sessionEndsAt(s) < now) return { kind: 'past' };
  if (s.status === 'cancelled' || s.sales_state === 'cancelled') return { kind: 'cancelled' };
  const p = partnerButton(s);
  if (p) return { kind: 'partner', url: p.url, seller: p.sellerName, priceFrom: p.priceFrom, currency: p.currency };
  if (s.sales_state === 'sold_out') return { kind: 'soldout' };
  // A platform session without tiers is a fixture, and a platform checkout is not built on this site yet.
  return { kind: 'soon' };
}

/** Text of the page file without its <h1> and comments (the loop-grid marker): '' when the page has no text of its own. */
export function pageIntro(key: string, lang: string): string {
  let html: string;
  try {
    html = genericPage(key, lang).html;
  } catch {
    return '';
  }
  const rest = html.replace(/<h1[\s\S]*?<\/h1>/i, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  return rest.replace(/<[^>]+>/g, '').trim() ? rest : '';
}

/** Order of the tour children for the card list: soonest upcoming first. */
export function firstUpcomingStart(tour: Tour<SiteEvent>): string | null {
  const starts = tour.events.filter((e) => !e.past).map((e) => e.primary?.start_at ?? '').filter(Boolean).sort();
  return starts[0] ?? null;
}

/** JSON-LD of a event page (schema.org Event), serialised safe for a <script> block. */
export function eventJsonLd(e: SiteEvent, url: string, image: string | null, lang: string): string {
  const s = e.primary;
  const offers = e.sessions
    .map((x) => {
      const p = partnerButton(x);
      if (p && p.priceFrom !== null) {
        return { '@type': 'Offer', url: p.url, price: (p.priceFrom / 100).toFixed(2), priceCurrency: p.currency, availability: 'https://schema.org/InStock' };
      }
      return null;
    })
    .filter(Boolean);
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.name,
    url,
    inLanguage: lang,
    eventStatus: e.state === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(s ? { startDate: s.start_at, endDate: s.end_at } : {}),
    location: {
      '@type': 'Place',
      name: e.venueName,
      address: { '@type': 'PostalAddress', streetAddress: e.venueAddress, addressLocality: e.venueCity },
    },
    ...(image ? { image: [image] } : {}),
    ...(e.descriptionText ? { description: e.descriptionText } : {}),
    ...(offers.length ? { offers } : {}),
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
