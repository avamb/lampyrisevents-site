/**
 * Site-wide configuration: domain, languages, platform channel, tracking ids.
 * Everything here is PUBLIC. Values that differ between staging and production
 * come from the build environment (see .env.example), never hard-coded.
 */
import type { Language, SiteKitConfig } from 'arena-site-kit/config';
import languageTable from './src/lib/languages.json';

type Env = Record<string, string | undefined>;
const env: Env = (globalThis as { process?: { env?: Env } }).process?.env ?? {};

export const languages: Language[] = languageTable as Language[];
export const defaultLanguage = 'en';

/** Public origin of this build (production or staging). */
export const siteUrl: string = env.SITE_URL || 'https://lampyrisevents.com';

/** Staging builds with SITE_INDEXING unset or false: noindex everywhere, robots.txt disallows all. */
export const indexing: boolean = env.SITE_INDEXING === 'true';

/** Where the events come from: 'fixture' reads data/snapshot, 'feed' reads the platform feed. */
export const dataSource: 'fixture' | 'feed' = env.DATA_SOURCE === 'feed' ? 'feed' : 'fixture';

export const arena = {
  apiBase: env.PUBLIC_ARENA_API || 'https://api.arenasoldout.com',
  feedToken: env.PUBLIC_FEED_TOKEN || '',
  testFeedToken: (env.PUBLIC_TEST_FEED_TOKEN || '').trim(),
};

/** Tracking ids (notice mode: loaded until the visitor declines). Empty = no calls at all. */
export const tracking = {
  metaPixelId: env.PUBLIC_META_PIXEL_ID || '',
  ga4Id: env.PUBLIC_GA4_ID || '',
};

export const turnstile = { siteKey: env.PUBLIC_TURNSTILE_SITE_KEY || '' };

export const brand = {
  name: 'Lampyris-Events',
  legalName: 'Lampyris s.r.o.',
  email: 'info@lampyrisevents.com',
  phone: '+420 733 642 795',
  phoneHref: '+420733642795',
  address: 'Závěrka 2367/9A, Břevnov, 169 00 Praha 6, Czech Republic',
  registryCode: '28816846',
  vat: 'CZ28816846',
  facebook: 'https://www.facebook.com/lampyrissro/',
  instagram: 'https://www.instagram.com/lampyrisevents',
  telegram: 'https://t.me/lampyrisevents',
  partnerLogo: { href: 'https://www.kudyznudy.cz/?utm_source=kzn&utm_medium=partneri_kzn&utm_campaign=banner', src: '/_site/img/kudyznudy.svg', alt: 'Kudyznudy.cz – CzechTourism' },
};

/** The slice of the config the kit factories take. */
export const kitConfig: SiteKitConfig = {
  languages,
  defaultLanguage,
  eventPathSegment: 'events',
  fallbackTimezone: 'Europe/Prague',
  arena: { feedToken: arena.feedToken, testFeedToken: arena.testFeedToken, snapshotPath: '' },
};
