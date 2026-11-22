<script lang="ts">
  /**
   * Cookie notice, kit consent in mode 'notice': analytics and advertising are ON until the visitor
   * presses Decline (one shared choice, cookie lp_consent). The banner is a bar at the bottom: both
   * buttons are visible without scrolling at 360 px. Any element with [data-lp-cookie-settings] reopens it.
   */
  import { onMount } from 'svelte';
  import { consent } from '../../scripts/consent.ts';

  interface Props {
    text: string;
    accept: string;
    decline: string;
    label: string;
  }
  let { text, accept, decline, label }: Props = $props();
  let open = $state(false);

  onMount(() => {
    open = consent.readConsent() === null;
    const reopen = () => (open = true);
    const els = document.querySelectorAll('[data-lp-cookie-settings]');
    els.forEach((el) => el.addEventListener('click', reopen));
    return () => els.forEach((el) => el.removeEventListener('click', reopen));
  });

  function choose(granted: boolean) {
    consent.writeConsent(granted);
    window.dispatchEvent(new CustomEvent(consent.event, { detail: { granted } }));
    open = false;
  }
</script>

{#if open}
  <div class="cn-bar" role="dialog" aria-label={label}>
    <div class="cn-bar__container">
      <span class="cn-bar__text">{text}</span>
      <span class="cn-bar__buttons">
        <button type="button" class="cn-bar__button" onclick={() => choose(true)}>{accept}</button>
        <button type="button" class="cn-bar__button cn-bar__button--decline" onclick={() => choose(false)}>{decline}</button>
      </span>
    </div>
  </div>
{/if}
