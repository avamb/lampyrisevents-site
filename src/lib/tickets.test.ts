import { describe, expect, it } from 'vitest';
import type { FeedSession } from 'arena-site-kit/arena';
import type { SiteEvent } from 'arena-site-kit/lib/events';
import { dateLine, hasTicketsPage, mapCoords, osmEmbedUrl, osmSearchUrl, shareLinks, ticketSession, venueLine } from './tickets.ts';
import { sessionAction } from './view.ts';

const NOW = new Date('2027-01-10T10:00:00Z');

function session(over: Partial<FeedSession> = {}): FeedSession {
  return {
    id: 's1',
    start_at: '2027-02-22T18:00:00Z',
    end_at: '2027-02-22T19:45:00Z',
    status: 'scheduled',
    timezone: 'Europe/Prague',
    sales_state: 'on_sale',
    tiers: [{ id: 't1' }],
    ...over,
  } as unknown as FeedSession;
}

function event(sessions: FeedSession[], past = false): SiteEvent {
  return { past, sessions, raw: { venues: [] } } as unknown as SiteEvent;
}

describe('dateLine', () => {
  it('builds the date, the time range and the zone in the session zone', () => {
    const line = dateLine('2027-02-22T18:00:00Z', '2027-02-22T19:45:00Z', 'Europe/Prague', 'en-GB');
    expect(line).toContain('Mon 22 Feb 2027');
    expect(line).toContain('19:00');
    expect(line).toContain('20:45');
    expect(line).toContain('CET');
    expect(line).toBe('Mon 22 Feb 2027 19:00 – 20:45 CET');
  });

  it('shows only the start when the end is missing', () => {
    expect(dateLine('2027-02-22T18:00:00Z', null, 'Europe/Prague', 'en-GB')).toBe('Mon 22 Feb 2027 19:00 CET');
  });
});

describe('route filter', () => {
  it('takes an upcoming event with a sellable session', () => {
    const e = event([session()]);
    expect(hasTicketsPage(e, NOW)).toBe(true);
    expect(ticketSession(e, NOW)?.id).toBe('s1');
  });

  it('skips past, cancelled and partner sessions', () => {
    expect(hasTicketsPage(event([session()], true), NOW)).toBe(false);
    expect(hasTicketsPage(event([session({ status: 'cancelled' })]), NOW)).toBe(false);
    expect(hasTicketsPage(event([session({ sales_mode: 'external' })]), NOW)).toBe(false);
    expect(hasTicketsPage(event([session({ start_at: '2026-01-01T18:00:00Z', end_at: '2026-01-01T20:00:00Z' })]), NOW)).toBe(false);
  });

  it('a platform session without tiers produces no tickets page, like it shows no Buy button', () => {
    const e = event([session({ tiers: [] })]);
    expect(sessionAction(session({ tiers: [] }), NOW).kind).not.toBe('buy');
    expect(hasTicketsPage(e, NOW)).toBe(false);
    expect(hasTicketsPage(event([session({ tiers: undefined })]), NOW)).toBe(false);
  });

  it('an external session with tiers gets neither Buy nor a tickets page', () => {
    expect(sessionAction(session({ sales_mode: 'external' }), NOW).kind).not.toBe('buy');
    expect(hasTicketsPage(event([session({ sales_mode: 'external' })]), NOW)).toBe(false);
  });

  it('shows the first upcoming sellable session of several', () => {
    const e = event([
      session({ id: 'late', start_at: '2027-04-01T18:00:00Z', end_at: '2027-04-01T20:00:00Z' }),
      session({ id: 'partner', start_at: '2027-02-01T18:00:00Z', end_at: '2027-02-01T20:00:00Z', sales_mode: 'external' }),
      session({ id: 'first' }),
    ]);
    expect(ticketSession(e, NOW)?.id).toBe('first');
  });
});

describe('sessionAction buy', () => {
  it('an open session with tiers is buy, without tiers it stays soon', () => {
    expect(sessionAction(session(), NOW).kind).toBe('buy');
    expect(sessionAction(session({ tiers: [] }), NOW).kind).toBe('soon');
  });
});

describe('venue and map', () => {
  it('joins the venue line without blanks', () => {
    expect(venueLine({ name: 'Club', address: 'Main 1,', city: 'Praha', postal_code: '110 00' })).toBe('Club, Main 1, Praha, 110 00');
    expect(venueLine({ name: '', address: null, city: 'Praha', postal_code: null }, 'Hall')).toBe('Hall, Praha');
  });

  it('takes the venue coordinates, then the map point, else none', () => {
    expect(mapCoords({ geo_lat: 50.1, geo_lng: 14.4 }, null)).toEqual({ lat: 50.1, lng: 14.4 });
    expect(mapCoords({}, { latitude: 1, longitude: 2 })).toEqual({ lat: 1, lng: 2 });
    expect(mapCoords(undefined, null)).toBeNull();
  });

  it('builds the OpenStreetMap links', () => {
    const u = osmEmbedUrl({ lat: 50, lng: 14 });
    expect(u).toBe('https://www.openstreetmap.org/export/embed.html?bbox=13.994000,49.997000,14.006000,50.003000&layer=mapnik&marker=50,14');
    expect(osmSearchUrl('Club, Praha')).toBe('https://www.openstreetmap.org/search?query=Club%2C%20Praha');
  });

  it('builds plain https share links', () => {
    const l = shareLinks('https://x.test/tickets/a/', 'A b');
    expect(l.facebook).toContain('u=https%3A%2F%2Fx.test%2Ftickets%2Fa%2F');
    expect(l.x).toContain('text=A%20b');
    expect(l.linkedin.startsWith('https://www.linkedin.com/')).toBe(true);
  });
});
