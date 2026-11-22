<script lang="ts">
  /**
   * "My tickets by link" on the kit headless controller: e-mail form with Cloudflare Turnstile, the landing
   * from the e-mailed link and the orders of the 4-hour session. Without a Turnstile site key or a platform
   * feed token the form is switched off and says that the service is unavailable.
   * Personal page: no third-party scripts besides Turnstile (it protects the form).
   */
  import { onDestroy, onMount } from 'svelte';
  import { createMyTickets } from 'arena-site-kit/headless/my-tickets';
  import { createArenaClient, storageKeys } from '../../lib/platform.ts';

  type Strings = Record<string, string>;
  interface Props {
    t: Strings;
    errors: Strings;
    emailLabel: string;
    loadingLabel: string;
    moreLabel: string;
    sendingLabel: string;
    apiBase: string;
    feedToken: string;
    siteKey: string;
    lang: string;
    intl: string;
    pageUrl: string;
    homePath: string;
  }
  let { t, errors, emailLabel, loadingLabel, moreLabel, sendingLabel, apiBase, feedToken, siteKey, lang, intl, pageUrl, homePath }: Props = $props();

  const available = $derived(Boolean(siteKey && feedToken));

  // svelte-ignore state_referenced_locally
  const ctrl = createMyTickets({
    client: createArenaClient({ apiBase, feedToken, timeoutMs: 20_000 }),
    lang,
    intl,
    pageUrl,
    siteKey: feedToken ? siteKey : '',
    storageKeys,
  });

  let s = $state(ctrl.getState());
  let holder: HTMLElement | undefined = $state();
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = ctrl.subscribe((next) => {
      s = next;
    });
    ctrl.attachCaptcha(holder ?? null);
    ctrl.start();
    s = ctrl.getState();
  });
  onDestroy(() => {
    unsubscribe?.();
    ctrl.dispose();
  });

  /** The dictionary has no word for every controller code: the nearest wording of `errors` (errors.* plus forms.errors.*) stands in. */
  function noticeText(code: string | null): string {
    if (!code) return '';
    if (code === 'invalidEmail') return errors.invalidEmail;
    if (code === 'rateLimited') return errors.rateLimited;
    if (code === 'unavailable') return errors.unavailable;
    if (code === 'captchaFailed' || code === 'captchaWait') return errors.captcha;
    return errors.generic;
  }

  function submit(ev: SubmitEvent) {
    ev.preventDefault();
    void ctrl.submitLink();
  }
</script>

<div class="lp-mt" data-screen={s.screen} aria-live="polite">
  {#if s.screen === 'request'}
    {#if s.sent}
      <p class="lp-personal__status">{t.linkSent}</p>
    {:else}
      <p>{t.intro}</p>
      <form class="lp-form" onsubmit={submit} onfocusin={() => void ctrl.ensureWidget()} novalidate>
        <div class="lp-form__field lp-form__field--full">
          <label for="lp-mt-email">{emailLabel}</label>
          <input
            type="email"
            id="lp-mt-email"
            name="email"
            required
            autocomplete="email"
            value={s.email}
            oninput={(e) => ctrl.setEmail((e.currentTarget as HTMLInputElement).value)}
            disabled={!available}
          />
        </div>
        <div class="lp-form__turnstile" bind:this={holder}></div>
        <div class="lp-form__actions">
          <button type="submit" class="lp-button" disabled={s.sending || !available}>{s.sending ? sendingLabel : t.getLink}</button>
        </div>
      </form>
      {#if !available}<p class="lp-form__status" data-state="error" role="alert">{errors.unavailable}</p>{/if}
    {/if}
    {#if s.notice}<p class="lp-form__status" data-state="error" role="alert">{noticeText(s.notice)}</p>{/if}
  {:else if s.screen === 'landing'}
    <p>{t.intro}</p>
    <p><button type="button" class="lp-button" onclick={() => void ctrl.open()} disabled={s.opening}>{t.myTickets}</button></p>
    {#if s.notice}<p class="lp-form__status" data-state="error" role="alert">{noticeText(s.notice)}</p>{/if}
  {:else}
    {#if !s.loaded && s.loading}
      <p class="lp-personal__status"><span class="lp-spinner" aria-hidden="true"></span>{loadingLabel}</p>
    {:else if s.loaded && s.orders.length === 0}
      <p class="lp-personal__status">{t.empty}</p>
      <p><a href={homePath}>{t.back}</a></p>
    {/if}
    {#each s.orders as o (o.order_id)}
      <section class="lp-mt__order">
        <h2>{o.event.name}</h2>
        <p>{ctrl.when(o)}{#if o.event.venue_name}, {o.event.venue_name}{/if}</p>
        <p>
          {t.orderNumber.replace('%s', String(o.order_number))}
          {#if ctrl.orderState(o)}
            <strong>{ctrl.orderState(o) === 'sessionCancelled' ? t.eventCancelled : ctrl.orderState(o) === 'statusRefunded' ? t.statusRefunded : t.statusCancelled}</strong>
          {/if}
        </p>
        <ul class="lp-mt__tickets">
          {#each o.tickets as ticket, i (ticket.ticket_id)}
            <li>
              <span>
                {t.ticket.replace('%s', ticket.human_code || String(i + 1))}
                {#if ticket.tier_name}<small>{ticket.tier_name}</small>{/if}
              </span>
              {#if ctrl.canDownload(o, ticket)}
                <button type="button" class="lp-button" onclick={() => void ctrl.download(o, ticket, i)} disabled={s.busyTicket !== null}>
                  {s.busyTicket === ticket.ticket_id ? loadingLabel : t.pdf}
                </button>
              {:else}
                <small>{t.ticketInactive}</small>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
    {#if s.notice}<p class="lp-form__status" data-state="error" role="alert">{noticeText(s.notice)}</p>{/if}
    {#if s.hasMore}
      <p><button type="button" class="lp-button" onclick={() => void ctrl.loadMore()} disabled={s.loading}>{moreLabel}</button></p>
    {/if}
    <p><button type="button" class="lp-linkbtn" onclick={() => void ctrl.logout()}>{t.logout}</button></p>
  {/if}
</div>
