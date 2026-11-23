/**
 * The thank-you page after a payment (/order-status/): the address the sales page sends the buyer to, and the reading of the
 * platform answer `GET /v1/public/feeds/<token>/site` -> `{thank_you: {title, text, promo_code, url} | null}`.
 * Pure functions, no DOM; the page script is src/scripts/thank-you.ts.
 */

/** Order-status address with the checkout token and the event the buyer came from. */
export function orderStatusAddress(path: string, checkoutToken: string, eventSlug: string): string {
  const q = new URLSearchParams({ checkout_token: checkoutToken });
  if (eventSlug) q.set('event', eventSlug);
  return `${path}?${q.toString()}`;
}

export interface ThankYou {
  title: string;
  text: string;
  promoCode: string | null;
  url: string | null;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** The thank_you block of the answer, or null when the platform has none or sends nonsense. Only http(s) links pass. */
export function parseThankYou(body: unknown): ThankYou | null {
  const raw = (body as { thank_you?: unknown } | null | undefined)?.thank_you;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = str(o.title);
  const text = str(o.text);
  const promoCode = str(o.promo_code) || null;
  const link = str(o.url);
  const url = /^https:\/\//i.test(link) ? link : null;
  if (!title && !text && !promoCode) return null;
  return { title, text, promoCode, url };
}

/** Events to offer: on sale (not cancelled, not past), not the one just bought, at most `limit`. */
export function otherEvents<T extends { slug: string; state?: string; past?: boolean }>(events: T[], currentSlug: string, limit = 4): T[] {
  return events.filter((e) => e.slug !== currentSlug && e.state !== 'cancelled' && !e.past).slice(0, limit);
}
