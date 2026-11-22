/**
 * Starts the site forms of the page (contact and partnership) on the kit initSiteForm.
 * The kit knows the topics contact and private_event only: for a partnership request the wrapper
 * below sets the topic `partnership` and adds the company and the website (spec 63 section 17).
 * The field names of the partnership body are the spec names, not yet confirmed by the platform.
 */
import { createArenaClient } from 'arena-site-kit/arena';
import type { OrganizerContactRequest } from 'arena-site-kit/arena';
import { initSiteForm, loadTurnstileScript } from 'arena-site-kit/scripts/site-forms';

type Client = ReturnType<typeof createArenaClient>;

const value = (form: HTMLFormElement, name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value.trim() ?? '';

export function partnershipClient(base: Client, form: HTMLFormElement): Pick<Client, 'sendOrganizerContact' | 'subscribeMarketing'> {
  return {
    subscribeMarketing: base.subscribeMarketing,
    sendOrganizerContact(body: OrganizerContactRequest, key: string) {
      const extra: Record<string, string> = { topic: 'partnership', company: value(form, 'company') };
      if (value(form, 'website')) extra.website = value(form, 'website');
      return base.sendOrganizerContact({ ...body, ...extra } as unknown as OrganizerContactRequest, key);
    },
  };
}

/** The kit validates the common fields only: the company of a partnership request is required here, before the kit submit handler. */
function requireCompany(form: HTMLFormElement): void {
  form.addEventListener('submit', (ev) => {
    if (value(form, 'company')) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const status = form.querySelector<HTMLElement>('[data-form-status]');
    const texts = JSON.parse(form.dataset.texts || '{}') as { errors?: Record<string, string> };
    if (!status) return;
    status.textContent = texts.errors?.fillRequired ?? '';
    status.dataset.state = 'error';
    status.hidden = false;
  });
}

export function startPageForms(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-form-kind]').forEach((form) => {
    if (form.dataset.partnership === 'true') requireCompany(form);
    const base = createArenaClient({ apiBase: form.dataset.api ?? '', feedToken: form.dataset.feed ?? '' });
    initSiteForm(form, {
      client: form.dataset.partnership === 'true' ? partnershipClient(base, form) : base,
      loadTurnstile: loadTurnstileScript,
      siteKey: form.dataset.sitekey ?? '',
      locale: form.dataset.lang ?? 'en',
      pageUrl: () => location.origin + location.pathname,
    });
  });
}
