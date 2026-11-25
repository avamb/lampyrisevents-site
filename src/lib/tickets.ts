/**
 * The sales page /tickets/<slug>/ (Ticket Tailor layout, inline Arena widget): which events get one, the date line,
 * the venue line, the map and the share links. Pure functions, the page component decides the markup.
 */
import type { FeedSession, FeedVenue } from 'arena-site-kit/arena';
import type { SiteEvent } from 'arena-site-kit/lib/events';
import { sessionAction } from './view.ts';

/** A session the widget can sell: exactly the sessions with the "Buy" button (sessionAction), so a page of an event
 * never gets a sales page it does not link to. A platform session without price categories has neither. */
export function isSellableSession(s: FeedSession, now: Date = new Date()): boolean {
  return sessionAction(s, now).kind === 'buy';
}

/** The session the page shows: the first upcoming sellable one, null when there is none. */
export function ticketSession(e: SiteEvent, now: Date = new Date()): FeedSession | null {
  return [...e.sessions].sort((a, b) => a.start_at.localeCompare(b.start_at)).find((s) => isSellableSession(s, now)) ?? null;
}

/** Events that get a sales page: upcoming, with at least one sellable session. */
export function hasTicketsPage(e: SiteEvent, now: Date = new Date()): boolean {
  return !e.past && ticketSession(e, now) !== null;
}

/** "Mon 22 Feb 2027 20:00 – 21:45 CET": date and times in the zone of the session, in the page language. */
export function dateLine(startIso: string, endIso: string | null | undefined, tz: string, intl: string): string {
  const start = new Date(startIso);
  const f = (o: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat(intl, { timeZone: tz, ...o }).format(d);
  const date = f({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, start).replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const time = (d: Date) => f({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, d);
  const zone = new Intl.DateTimeFormat(intl, { timeZone: tz, hour: 'numeric', timeZoneName: 'short' })
    .formatToParts(start)
    .find((p) => p.type === 'timeZoneName')?.value ?? '';
  const end = endIso ? new Date(endIso) : null;
  const range = end && !Number.isNaN(end.getTime()) && end > start ? `${time(start)} – ${time(end)}` : time(start);
  return [date, range, zone].filter(Boolean).join(' ');
}

/** The venue of a session (matched by its start), else the first venue of the event. */
export function venueOf(e: SiteEvent, s: FeedSession | null): FeedVenue | undefined {
  return e.raw.venues.find((v) => s && v.session_starts.includes(s.start_at)) ?? e.raw.venues[0];
}

/** "Venue name, address, city, postal code": blanks and a trailing comma left out. */
export function venueLine(v: Pick<FeedVenue, 'name' | 'address' | 'city' | 'postal_code'> | undefined, fallbackName = ''): string {
  const clean = (x?: string | null) => (x ?? '').trim().replace(/[,;]+$/, '');
  return [clean(v?.name) || fallbackName, clean(v?.address), clean(v?.city), clean(v?.postal_code)].filter(Boolean).join(', ');
}

/** Coordinates of the venue (feed geo), else the map point of the event materials; null when neither is set. */
export function mapCoords(v: Pick<FeedVenue, 'geo_lat' | 'geo_lng'> | undefined, point: { latitude: number; longitude: number } | null | undefined): { lat: number; lng: number } | null {
  if (typeof v?.geo_lat === 'number' && typeof v?.geo_lng === 'number') return { lat: v.geo_lat, lng: v.geo_lng };
  if (point && typeof point.latitude === 'number' && typeof point.longitude === 'number') return { lat: point.latitude, lng: point.longitude };
  return null;
}

/** OpenStreetMap embed (no cookies): a small box around the marker. */
export function osmEmbedUrl(c: { lat: number; lng: number }): string {
  const bbox = [c.lng - 0.006, c.lat - 0.003, c.lng + 0.006, c.lat + 0.003].map((n) => n.toFixed(6)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${c.lat},${c.lng}`;
}

/** Link to the map for a venue without coordinates. */
export function osmSearchUrl(address: string): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
}

/** Plain https share links of a page. */
export function shareLinks(url: string, text: string): { facebook: string; x: string; linkedin: string } {
  const u = encodeURIComponent(url);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(text)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  };
}
