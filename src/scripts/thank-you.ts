/**
 * Thank-you blocks of /order-status/: they stay hidden until the island says the order is paid (data-view="paid").
 * Then: hide the event just bought from "You may also like", ask the platform for the promo block and run the newsletter form.
 * No framework, no inline code.
 */
import { createArenaClient } from 'arena-site-kit/arena';
import { formErrorKey, isDefinite } from 'arena-site-kit/lib/forms';
import { loadTurnstileScript, type TurnstileApi } from 'arena-site-kit/scripts/site-forms';
import { parseThankYou } from '../lib/thank-you.ts';

const NEWSLETTER_TEXT_VERSION = 'thanks-2026-11';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One Idempotency-Key per identical body: pressing again after a lost answer replays the first submission. */
function createAttemptKeys() {
  let current: { key: string; fingerprint: string } | null = null;
  return {
    keyFor(body: unknown): string {
      const fingerprint = JSON.stringify(body);
      if (!current || current.fingerprint !== fingerprint) current = { key: crypto.randomUUID(), fingerprint };
      return current.key;
    },
    reset() { current = null; },
  };
}

function showCurrentEventExcluded(root: HTMLElement) {
  const slug = new URLSearchParams(location.search).get('event') ?? '';
  const items = [...root.querySelectorAll<HTMLElement>('[data-ty-event]')];
  let shown = 0;
  for (const li of items) {
    const hide = (slug !== '' && li.dataset.tyEvent === slug) || shown >= 4;
    li.hidden = hide;
    if (!hide) shown += 1;
  }
  if (shown === 0) root.querySelector<HTMLElement>('[data-ty-more]')?.setAttribute('hidden', '');
}

async function loadPromo(root: HTMLElement) {
  const box = root.querySelector<HTMLElement>('[data-ty-promo]');
  if (!box) return;
  try {
    const res = await fetch(`${box.dataset.api}/v1/public/feeds/${encodeURIComponent(box.dataset.feed ?? '')}/site`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const block = parseThankYou(await res.json());
    if (!block) return;
    const set = (sel: string, text: string) => {
      const el = box.querySelector<HTMLElement>(sel);
      if (!el) return;
      el.textContent = text;
      el.hidden = !text;
    };
    set('[data-ty-promo-title]', block.title);
    set('[data-ty-promo-text]', block.text);
    const code = box.querySelector<HTMLElement>('[data-ty-promo-codebox]');
    if (code && block.promoCode) {
      code.hidden = false;
      const value = box.querySelector<HTMLElement>('[data-ty-promo-code]');
      if (value) value.textContent = block.promoCode;
      const copy = box.querySelector<HTMLButtonElement>('[data-ty-promo-copy]');
      copy?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(block.promoCode ?? '');
          copy.textContent = copy.dataset.done ?? '';
          window.setTimeout(() => { copy.textContent = copy.dataset.label ?? ''; }, 2500);
        } catch {
          window.prompt('', block.promoCode ?? '');
        }
      });
    }
    const link = box.querySelector<HTMLAnchorElement>('[data-ty-promo-link]');
    if (link && block.url) {
      link.href = block.url;
      link.hidden = false;
    }
    box.hidden = false;
  } catch {
    /* the route may not exist yet, or the network is down: no block, no error */
  }
}

function initNewsletter(form: HTMLFormElement) {
  const texts = JSON.parse(form.dataset.texts || '{}') as { unavailable: string; sending: string; sent: string; captchaWait: string; errors: Record<string, string> };
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const holder = form.querySelector<HTMLElement>('[data-turnstile]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const say = (message: string, state: 'info' | 'error' | 'ok' = 'info') => {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = !message;
  };
  const siteKey = form.dataset.sitekey ?? '';
  if (!siteKey) {
    if (button) button.disabled = true;
    say(texts.unavailable, 'error');
    return;
  }
  const client = createArenaClient({ apiBase: form.dataset.api ?? '', feedToken: form.dataset.feed ?? '' });
  const keys = createAttemptKeys();
  let api: TurnstileApi | null = null;
  let widget: string | null = null;
  let token = '';
  let busy = false;

  const ensureWidget = async () => {
    if (widget !== null || !holder) return;
    api = await loadTurnstileScript();
    if (!api) return;
    widget = api.render(holder, {
      sitekey: siteKey,
      action: 'club',
      callback: (t: string) => { token = t; },
      'expired-callback': () => { token = ''; },
      'error-callback': () => { token = ''; },
    });
  };
  const resetCaptcha = () => {
    token = '';
    if (api && widget !== null) api.reset(widget);
  };
  form.addEventListener('focusin', () => void ensureWidget(), { once: true });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const email = (form.querySelector<HTMLInputElement>('[name="email"]')?.value ?? '').trim();
    const consent = form.querySelector<HTMLInputElement>('[name="consent"]')?.checked ?? false;
    if (!email) return say(texts.errors.fillRequired, 'error');
    if (!EMAIL.test(email)) return say(texts.errors.invalidEmail, 'error');
    if (!consent) return say(texts.errors.consentRequired, 'error');
    if (!token) {
      void ensureWidget();
      return say(texts.captchaWait, 'info');
    }
    busy = true;
    if (button) button.disabled = true;
    say(texts.sending, 'info');
    const body = { email, locale: form.dataset.lang ?? 'en', consent: true as const, text_version: NEWSLETTER_TEXT_VERSION, page_url: location.origin + location.pathname, turnstile_token: token };
    try {
      await client.subscribeMarketing(body, keys.keyFor(body));
      form.reset();
      for (const el of Array.from(form.elements)) (el as HTMLElement).setAttribute('disabled', '');
      say(texts.sent, 'ok');
      resetCaptcha();
      return;
    } catch (e) {
      say(texts.errors[formErrorKey(e)] ?? texts.errors.generic, 'error');
      if (isDefinite(e)) {
        keys.reset();
        resetCaptcha();
      }
    }
    busy = false;
    if (button) button.disabled = false;
  });
}

function start() {
  const root = document.querySelector<HTMLElement>('[data-ty]');
  if (!root) return;
  const form = root.querySelector<HTMLFormElement>('form[data-ty-newsletter]');
  if (form) initNewsletter(form);

  let done = false;
  const check = () => {
    if (done || document.querySelector<HTMLElement>('.lp-order')?.dataset.view !== 'paid') return;
    done = true;
    observer.disconnect();
    root.hidden = false;
    showCurrentEventExcluded(root);
    void loadPromo(root);
  };
  const observer = new MutationObserver(check);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-view'] });
  check();
}

start();
