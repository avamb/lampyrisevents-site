/**
 * Interface strings of the event pages that i18n/<lang>.json does not have (the JSON files are an export and stay as they are).
 * Merged into ui(lang) as `t.x` by src/lib/i18n.ts. 11 languages, every key in every language.
 */
export interface UiExtra {
  /** Heading of the photo gallery of an event. */
  gallery: string;
  /** Heading of the video block. */
  video: string;
  /** Pagination: previous / next page. */
  prev: string;
  next: string;
  /** "Page %d" in the title of a list page. */
  page: string;
  /** Note under the description when the text is not in the page language; %s = language name. */
  localeNote: string;
  /** Meta description of the home page and of the past events list. */
  homeDescription: string;
  pastDescription: string;
  /** Marker of a platform session that has no ticket office yet (fixture or not on sale). */
  notOnSaleHere: string;
}

export const uiExtra: Record<string, UiExtra> = {
  en: {
    gallery: 'Gallery',
    video: 'Video',
    prev: 'Previous',
    next: 'Next',
    page: 'Page %d',
    localeNote: 'The description is shown in %s: there is no translation into this language yet.',
    homeDescription: 'Concerts, shows and tours by Lampyris-Events: upcoming dates, cities and tickets.',
    pastDescription: 'Concerts and shows by Lampyris-Events that have already taken place.',
    notOnSaleHere: 'Tickets are not on sale on this site yet',
  },
  cs: {
    gallery: 'Galerie',
    video: 'Video',
    prev: 'Předchozí',
    next: 'Další',
    page: 'Strana %d',
    localeNote: 'Popis je zobrazen v jazyce: %s. Překlad do tohoto jazyka zatím není.',
    homeDescription: 'Koncerty, představení a turné Lampyris-Events: nejbližší termíny, města a vstupenky.',
    pastDescription: 'Koncerty a představení Lampyris-Events, která již proběhla.',
    notOnSaleHere: 'Vstupenky se na tomto webu zatím neprodávají',
  },
  de: {
    gallery: 'Galerie',
    video: 'Video',
    prev: 'Zurück',
    next: 'Weiter',
    page: 'Seite %d',
    localeNote: 'Die Beschreibung wird auf %s angezeigt: Eine Übersetzung in diese Sprache gibt es noch nicht.',
    homeDescription: 'Konzerte, Shows und Tourneen von Lampyris-Events: kommende Termine, Städte und Tickets.',
    pastDescription: 'Konzerte und Shows von Lampyris-Events, die bereits stattgefunden haben.',
    notOnSaleHere: 'Tickets werden auf dieser Seite noch nicht verkauft',
  },
  et: {
    gallery: 'Galerii',
    video: 'Video',
    prev: 'Eelmine',
    next: 'Järgmine',
    page: 'Leht %d',
    localeNote: 'Kirjeldus on kuvatud keeles %s: tõlget sellesse keelde veel ei ole.',
    homeDescription: 'Lampyris-Eventsi kontserdid, etendused ja turneed: lähimad kuupäevad, linnad ja piletid.',
    pastDescription: 'Lampyris-Eventsi kontserdid ja etendused, mis on juba toimunud.',
    notOnSaleHere: 'Piletid ei ole sellel lehel veel müügil',
  },
  fi: {
    gallery: 'Galleria',
    video: 'Video',
    prev: 'Edellinen',
    next: 'Seuraava',
    page: 'Sivu %d',
    localeNote: 'Kuvaus näytetään kielellä %s: käännöstä tälle kielelle ei vielä ole.',
    homeDescription: 'Lampyris-Eventsin konsertit, esitykset ja kiertueet: tulevat päivämäärät, kaupungit ja liput.',
    pastDescription: 'Lampyris-Eventsin jo pidetyt konsertit ja esitykset.',
    notOnSaleHere: 'Lippuja ei myydä vielä tällä sivustolla',
  },
  hu: {
    gallery: 'Galéria',
    video: 'Videó',
    prev: 'Előző',
    next: 'Következő',
    page: '%d. oldal',
    localeNote: 'A leírás ezen a nyelven jelenik meg: %s. Ehhez a nyelvhez még nincs fordítás.',
    homeDescription: 'A Lampyris-Events koncertjei, előadásai és turnéi: közelgő időpontok, városok és jegyek.',
    pastDescription: 'A Lampyris-Events már lezajlott koncertjei és előadásai.',
    notOnSaleHere: 'A jegyek ezen az oldalon még nem kaphatók',
  },
  lt: {
    gallery: 'Galerija',
    video: 'Vaizdo įrašas',
    prev: 'Ankstesnis',
    next: 'Kitas',
    page: '%d puslapis',
    localeNote: 'Aprašymas rodomas kalba: %s. Vertimo į šią kalbą dar nėra.',
    homeDescription: 'Lampyris-Events koncertai, spektakliai ir turai: artimiausios datos, miestai ir bilietai.',
    pastDescription: 'Jau įvykę Lampyris-Events koncertai ir spektakliai.',
    notOnSaleHere: 'Bilietai šioje svetainėje dar neparduodami',
  },
  lv: {
    gallery: 'Galerija',
    video: 'Video',
    prev: 'Iepriekšējā',
    next: 'Nākamā',
    page: '%d. lapa',
    localeNote: 'Apraksts ir parādīts valodā: %s. Tulkojuma šajā valodā vēl nav.',
    homeDescription: 'Lampyris-Events koncerti, izrādes un tūres: tuvākie datumi, pilsētas un biļetes.',
    pastDescription: 'Lampyris-Events koncerti un izrādes, kas jau notikušas.',
    notOnSaleHere: 'Biļetes šajā vietnē vēl netiek pārdotas',
  },
  pl: {
    gallery: 'Galeria',
    video: 'Wideo',
    prev: 'Poprzednia',
    next: 'Następna',
    page: 'Strona %d',
    localeNote: 'Opis jest wyświetlany w języku: %s. Tłumaczenia na ten język jeszcze nie ma.',
    homeDescription: 'Koncerty, spektakle i trasy Lampyris-Events: najbliższe terminy, miasta i bilety.',
    pastDescription: 'Koncerty i spektakle Lampyris-Events, które już się odbyły.',
    notOnSaleHere: 'Bilety nie są jeszcze w sprzedaży na tej stronie',
  },
  ru: {
    gallery: 'Галерея',
    video: 'Видео',
    prev: 'Назад',
    next: 'Далее',
    page: 'Страница %d',
    localeNote: 'Описание показано на языке: %s. Перевода на этот язык пока нет.',
    homeDescription: 'Концерты, шоу и туры Lampyris-Events: ближайшие даты, города и билеты.',
    pastDescription: 'Концерты и шоу Lampyris-Events, которые уже состоялись.',
    notOnSaleHere: 'Билеты на этом сайте пока не продаются',
  },
  uk: {
    gallery: 'Галерея',
    video: 'Відео',
    prev: 'Назад',
    next: 'Далі',
    page: 'Сторінка %d',
    localeNote: 'Опис показано мовою: %s. Перекладу на цю мову поки немає.',
    homeDescription: 'Концерти, шоу та тури Lampyris-Events: найближчі дати, міста й квитки.',
    pastDescription: 'Концерти та шоу Lampyris-Events, які вже відбулися.',
    notOnSaleHere: 'Квитки на цьому сайті поки не продаються',
  },
};
