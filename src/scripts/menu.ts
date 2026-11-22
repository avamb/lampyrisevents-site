/** Burger menu and language dropdown of the header (no framework). */
const nav = document.querySelector<HTMLElement>('[data-lp-nav]');
const burger = document.querySelector<HTMLButtonElement>('[data-lp-burger]');
const lang = document.querySelector<HTMLElement>('[data-lp-lang]');
const langButton = lang?.querySelector<HTMLButtonElement>('button');

function setNav(open: boolean) {
  nav?.setAttribute('data-open', String(open));
  burger?.setAttribute('aria-expanded', String(open));
}
function setLang(open: boolean) {
  lang?.setAttribute('data-open', String(open));
  langButton?.setAttribute('aria-expanded', String(open));
}

burger?.addEventListener('click', () => setNav(nav?.getAttribute('data-open') !== 'true'));
langButton?.addEventListener('click', () => setLang(lang?.getAttribute('data-open') !== 'true'));
document.addEventListener('click', (e) => {
  if (lang && !lang.contains(e.target as Node)) setLang(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    setLang(false);
    setNav(false);
  }
});
