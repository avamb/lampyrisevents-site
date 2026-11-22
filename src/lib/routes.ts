/**
 * Page addresses of the site in every language, built once from the WordPress
 * route table (content/pages/index.json) by the kit's createRoutes.
 *
 * Page keys: home, past-events, tours, about-us, how-to-buy, frequently-asked-questions,
 * contacts, downloads, terms-of-use, privacy-policy, partnerships, create-event,
 * sell-tickets-with-us, connect-to-stripe, payment-success, payment-failed,
 * orderStatus, myTickets.
 * Events: eventPath(slug, lang) -> /events/<slug>/ (en) and /<lang>/events/<slug>/.
 */
import { createRoutes, toParam } from 'arena-site-kit/lib/routes';
import { hreflangAlternates, type HreflangAlternate } from 'arena-site-kit/lib/seo';
import { languages, defaultLanguage, kitConfig, siteUrl } from '../../site.config.ts';
import pageIndex from '../../content/pages/index.json';
import { buildPagePaths, buildPageTitles, GENERIC_PAGES } from './page-table.mjs';

export { toParam, GENERIC_PAGES };

export const pagePaths = buildPagePaths(pageIndex, languages);
export const pageTitles = buildPageTitles(pageIndex);

export const routes = createRoutes({
  languages,
  pagePaths,
  eventPathSegment: kitConfig.eventPathSegment,
  personalPages: ['orderStatus', 'myTickets'],
});

export const { pagePath, eventPath, notFoundPath, personalPages } = routes;

export function isPersonal(key: string): boolean {
  return personalPages.includes(key);
}

/** The language-switcher target: the same page in another language. */
export function pageAlternatesMap(key: string): Record<string, string> {
  return Object.fromEntries(languages.map((l) => [l.code, pagePath(key, l.code)]));
}

/** hreflang links of a page, only for the languages it really has (see pages.ts availableLocales). */
export function pageHreflang(key: string, available: string[] | undefined): HreflangAlternate[] {
  return hreflangAlternates(available, languages, (l) => pagePath(key, l.code), siteUrl, defaultLanguage);
}
