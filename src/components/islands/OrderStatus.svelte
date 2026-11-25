<script lang="ts">
  /**
   * Order status after the payment page, on the kit headless controller. The state comes only from the
   * platform checkout status, never from the return address. Without a platform (no token in the
   * build, no checkout token in the tab) the page says that the service is unavailable.
   * Personal page: no third-party scripts, the share buttons are plain links.
   */
  import { onDestroy, onMount } from 'svelte';
  import { createOrderStatus } from 'arena-site-kit/headless/order-status';
  import { createArenaClient, storageKeys } from '../../lib/platform.ts';
  import { shareIcons } from './share-icons.ts';

  type Strings = Record<string, string>;
  interface Props {
    t: Strings;
    errors: Strings;
    orderLabel: string;
    loading: string;
    cancelledLabel: string;
    refundedLabel: string;
    apiBase: string;
    feedToken: string;
    myTicketsPath: string;
    homePath: string;
    shareUrl: string;
    contactEmail: string;
    intl: string;
  }
  let { t, errors, orderLabel, loading, cancelledLabel, refundedLabel, apiBase, feedToken, myTicketsPath, homePath, shareUrl, contactEmail, intl }: Props = $props();

  // svelte-ignore state_referenced_locally
  const ctrl = createOrderStatus({
    // This page shows no "Refer a friend" block, so the offer is never asked for: without the programme the platform answers 404 (referral.not_available) and the browser logs it as an error.
    client: { ...createArenaClient({ apiBase, feedToken, timeoutMs: 20_000 }), referral: async () => null },
    shareUrl,
    intl,
    storageKeys,
  });

  let s = $state(ctrl.getState());
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = ctrl.subscribe((next) => {
      s = next;
    });
    ctrl.start();
    s = ctrl.getState();
  });
  onDestroy(() => {
    unsubscribe?.();
    ctrl.dispose();
  });

  const shareText = $derived((t.shareMessage || '').replace('%s', s.event?.name ?? '').replace('%s', shareUrl));
  const links = $derived(ctrl.shareLinks(shareText));
  const back = $derived(s.eventLink?.path ?? homePath);
  const backLabel = $derived(s.eventLink?.name ?? t.toEvents);
</script>

{#snippet eventBlock()}
  {#if s.event}
    <p class="lp-order__event">
      <strong>{s.event.name}</strong>
      {#if s.eventWhen}<span>{s.eventWhen}</span>{/if}
      {#if s.event.venue_name}<span>{s.event.venue_name}</span>{/if}
    </p>
  {/if}
{/snippet}

<div class="lp-order" data-view={s.view} aria-live="polite">
  {#if s.view === 'none' || s.view === 'error'}
    <p class="lp-personal__status">{errors.unavailable}</p>
    <p><a class="lp-button" href={myTicketsPath}>{t.accountButton}</a></p>
    <p><a href={homePath}>{t.toEvents}</a></p>
  {:else if s.view === 'pending'}
    {#if !s.slow}
      <p class="lp-personal__status"><span class="lp-spinner" aria-hidden="true"></span>{loading}</p>
    {:else}
      <p class="lp-personal__status">{errors.unavailable} <a href="mailto:{contactEmail}">{contactEmail}</a></p>
      <p><a class="lp-button" href={myTicketsPath}>{t.accountButton}</a></p>
    {/if}
  {:else if s.view === 'paid'}
    <h2>{t.title}</h2>
    {@render eventBlock()}
    <p>{t.text}</p>
    {#if s.status?.order_number}<p>{t.orderNumber} <strong>{s.status.order_number}</strong></p>{/if}
    {#if s.status?.tickets?.length}
      <ul class="lp-order__tickets">
        {#each s.status.tickets as ticket, i (ticket.ticket_id)}
          <li>
            {#if ticket.pdf_url}
              <a href={ctrl.pdfHref(ticket.pdf_url)} target="_blank" rel="noopener">PDF {ticket.human_code || String(i + 1)}</a>
            {:else}
              <span>{ticket.human_code || String(i + 1)}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    <p class="lp-order__account">{@html t.accountText}</p>
    <p><a class="lp-button" href={myTicketsPath}>{t.accountButton}</a></p>
    <h3>{t.shareTitle}</h3>
    <p>{t.shareText}</p>
    <ul class="lp-order__share">
      {#each links as l (l.name)}
        {@const icon = shareIcons[l.name.toLowerCase()]}
        <li>
          {#if icon}
            <a class="lp-order__share-icon lp-brand lp-brand--{l.name.toLowerCase()}" href={l.href} target="_blank" rel="noopener" aria-label={l.name} title={l.name}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={icon} /></svg></a>
          {:else}
            <a href={l.href} target="_blank" rel="noopener">{l.name}</a>
          {/if}
        </li>
      {/each}
    </ul>
  {:else if s.view === 'failed'}
    <h2>{t.failedTitle}</h2>
    {@render eventBlock()}
    <p>{t.failedText}</p>
    {#if s.status?.payment_url}<p><a class="lp-button" href={s.status.payment_url}>{t.retry}</a></p>{/if}
    <p><a href={back}>{backLabel}</a></p>
  {:else if s.view === 'expired'}
    <h2>{errors.ticketsGone}</h2>
    {@render eventBlock()}
    <p><a href={back}>{backLabel}</a></p>
  {:else if s.view === 'cancelled'}
    <h2>{cancelledLabel}</h2>
    {@render eventBlock()}
    <p><a href={back}>{backLabel}</a></p>
  {:else if s.view === 'refunded'}
    <h2>{refundedLabel}</h2>
    {@render eventBlock()}
  {:else}
    <h2>{orderLabel}</h2>
    {@render eventBlock()}
    <p><a href="mailto:{contactEmail}">{contactEmail}</a></p>
  {/if}
</div>
