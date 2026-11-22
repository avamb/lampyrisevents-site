import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildPagePaths } from './page-table.mjs';
import languages from './languages.json';

const index = JSON.parse(readFileSync('content/pages/index.json', 'utf8'));
const paths = buildPagePaths(index, languages);

describe('route table', () => {
  it('keeps the WordPress addresses', () => {
    expect(paths['contacts'].cs).toBe('/cs/kontakty/');
    expect(paths['about-us'].ru).toBe('/ru/o-nas/');
    expect(paths['home'].en).toBe('/');
    expect(paths['home'].cs).toBe('/cs/');
  });
  it('gives a language without a WordPress page the English path under its prefix', () => {
    expect(paths['privacy-policy'].de).toBe('/de/privacy-policy/');
    expect(paths['payment-success'].uk).toBe('/uk/payment-success/');
  });
  it('has every key in every language', () => {
    for (const byLang of Object.values(paths)) for (const l of languages) expect(byLang[l.code]).toMatch(/^\//);
  });
});
