/**
 * Generic content pages: cleaned WordPress HTML in content/pages/<lang>/<key>.html.
 * A language without its own file shows the English file at the right-prefixed URL;
 * hreflang is emitted only for the languages that have their own file.
 */
import { languages, defaultLanguage } from '../../site.config.ts';
import { GENERIC_PAGES, pagePath, pageTitles } from './routes.ts';

const files = import.meta.glob('../../content/pages/*/*.html', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function find(lang: string, key: string): string | undefined {
  const suffix = `/content/pages/${lang}/${key}.html`;
  const k = Object.keys(files).find((f) => f.endsWith(suffix));
  return k === undefined ? undefined : files[k];
}

/** One <h1> per page: later <h1> of a text become <h2> (markup only, the text is untouched). */
function singleH1(html: string): string {
  const end = html.search(/<\/h1>/i);
  if (end < 0) return html;
  const cut = end + 5;
  return html.slice(0, cut) + html.slice(cut).replace(/<h1(?=[\s>])/gi, '<h2').replace(/<\/h1>/gi, '</h2>');
}

export interface GenericPage {
  key: string;
  lang: string;
  title: string;
  html: string;
  /** Language of the text actually shown. */
  contentLang: string;
  /** Languages that have their own text for this page. */
  available: string[];
  hasH1: boolean;
}

export function pageAvailableLocales(key: string): string[] {
  return languages.filter((l) => find(l.code, key) !== undefined).map((l) => l.code);
}

export function genericPage(key: string, lang: string): GenericPage {
  const own = find(lang, key);
  const contentLang = own !== undefined ? lang : defaultLanguage;
  const html = own ?? find(defaultLanguage, key);
  if (html === undefined) throw new Error(`no content for page ${key}`);
  const title = pageTitles[key]?.[lang] || pageTitles[key]?.[defaultLanguage] || key;
  // The export keeps the three titles of the WordPress side menu (no links) in front of the <h1>: the layout draws the real menu.
  const body = singleH1(html.replace(/^(?:\s*<h3>[^<]*<\/h3>)+\s*(?=<h1)/i, ''));
  return { key, lang, title, html: body, contentLang, available: pageAvailableLocales(key), hasH1: /<h1[\s>]/i.test(body) };
}

/**
 * Text of the first <h1> of a page file in a language (own file, else English): the WordPress page name,
 * e.g. "Актуальные" for the home list. Empty when the page has no file.
 */
export function pageH1(key: string, lang: string): string {
  const html = find(lang, key) ?? find(defaultLanguage, key) ?? '';
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

/** Name of the home ("Actual events") list in a language. */
export const homeTitle = (lang: string): string => pageH1('actual-events', lang) || 'Actual Events';

/** Every (key, lang) that gets a page, with its address. */
export function genericPageList(): { key: string; lang: string; path: string }[] {
  return GENERIC_PAGES.flatMap((key) => languages.map((l) => ({ key, lang: l.code, path: pagePath(key, l.code) })));
}
