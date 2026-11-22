/**
 * UI dictionaries: i18n/<lang>.json (193 keys, checked by tools/check-i18n.mjs),
 * bound to the language table by the kit's createI18n.
 */
import { createI18n } from 'arena-site-kit/lib/i18n';
import { languages } from '../../site.config.ts';
import en from '../../i18n/en.json';
import cs from '../../i18n/cs.json';
import de from '../../i18n/de.json';
import et from '../../i18n/et.json';
import fi from '../../i18n/fi.json';
import hu from '../../i18n/hu.json';
import lt from '../../i18n/lt.json';
import lv from '../../i18n/lv.json';
import pl from '../../i18n/pl.json';
import ru from '../../i18n/ru.json';
import uk from '../../i18n/uk.json';

export type UiStrings = typeof en;

const i18n = createI18n<UiStrings>(languages, { en, cs, de, et, fi, hu, lt, lv, pl, ru, uk } as unknown as Record<string, UiStrings>);

export const ui = (lang: string): UiStrings => i18n.ui(lang);
export const language = (lang: string) => i18n.language(lang);

/** "from %s" style placeholder fill: replaces the first %s / %d. */
export function fmt(template: string, ...args: (string | number)[]): string {
  let i = 0;
  return template.replace(/%(?:\d+\$)?[sd]/g, () => String(args[i++] ?? ''));
}
