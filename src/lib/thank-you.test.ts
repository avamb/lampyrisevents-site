import { describe, expect, it } from 'vitest';
import { orderStatusAddress, otherEvents, parseThankYou } from './thank-you.ts';

describe('orderStatusAddress', () => {
  it('adds the token and the event slug', () => {
    expect(orderStatusAddress('/cs/order-status/', 'tok 1', 'show-a')).toBe('/cs/order-status/?checkout_token=tok+1&event=show-a');
  });
  it('leaves the event out when unknown', () => {
    expect(orderStatusAddress('/order-status/', 't', '')).toBe('/order-status/?checkout_token=t');
  });
});

describe('parseThankYou', () => {
  it('reads a full block', () => {
    expect(parseThankYou({ thank_you: { title: ' Hi ', text: 'Text', promo_code: 'CODE5', url: 'https://x.example/a' } })).toEqual({ title: 'Hi', text: 'Text', promoCode: 'CODE5', url: 'https://x.example/a' });
  });
  it('returns null for null, missing and empty blocks', () => {
    expect(parseThankYou({ thank_you: null })).toBeNull();
    expect(parseThankYou({})).toBeNull();
    expect(parseThankYou(null)).toBeNull();
    expect(parseThankYou({ thank_you: { title: '', text: '', promo_code: null, url: null } })).toBeNull();
  });
  it('drops a link that is not http(s) and an empty code', () => {
    expect(parseThankYou({ thank_you: { title: 'T', text: '', promo_code: '', url: 'javascript:alert(1)' } })).toEqual({ title: 'T', text: '', promoCode: null, url: null });
  });
});

describe('otherEvents', () => {
  it('skips the current event and caps the list', () => {
    const list = ['a', 'b', 'c', 'd', 'e', 'f'].map((slug) => ({ slug }));
    expect(otherEvents(list, 'b').map((e) => e.slug)).toEqual(['a', 'c', 'd', 'e']);
  });
  it('skips cancelled and past events', () => {
    const list = [{ slug: 'a', state: 'cancelled' }, { slug: 'b', past: true }, { slug: 'c', state: 'on_sale' }];
    expect(otherEvents(list, '').map((e) => e.slug)).toEqual(['c']);
  });
});
