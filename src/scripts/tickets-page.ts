/** Sales page: the slider (arrows, dots, swipe, keys) and the copy-link button. No framework, no inline code. */
import { orderStatusAddress } from '../lib/thank-you.ts';

function initSlider(root: HTMLElement) {
  const slides = [...root.querySelectorAll<HTMLElement>('[data-tk-slide]')];
  const dots = [...root.querySelectorAll<HTMLElement>('[data-tk-dot]')];
  if (slides.length < 2) return;
  let index = 0;

  const show = (n: number) => {
    index = (n + slides.length) % slides.length;
    slides.forEach((s, i) => {
      if (i === index) {
        s.setAttribute('data-active', 'true');
        s.removeAttribute('aria-hidden');
      } else {
        s.removeAttribute('data-active');
        s.setAttribute('aria-hidden', 'true');
      }
    });
    dots.forEach((d, i) => (i === index ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  };

  root.querySelector('[data-tk-prev]')?.addEventListener('click', () => show(index - 1));
  root.querySelector('[data-tk-next]')?.addEventListener('click', () => show(index + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') show(index - 1);
    if (ev.key === 'ArrowRight') show(index + 1);
  });

  let startX = 0;
  root.addEventListener('touchstart', (ev) => { startX = ev.touches[0]?.clientX ?? 0; }, { passive: true });
  root.addEventListener('touchend', (ev) => {
    const dx = (ev.changedTouches[0]?.clientX ?? 0) - startX;
    if (Math.abs(dx) > 40) show(dx < 0 ? index + 1 : index - 1);
  });
}

function initCopy(button: HTMLButtonElement) {
  const status = document.querySelector<HTMLElement>('[data-tk-copy-status]');
  button.addEventListener('click', async () => {
    const link = button.getAttribute('data-tk-copy') ?? location.href;
    try {
      await navigator.clipboard.writeText(link);
      if (status) status.textContent = button.getAttribute('data-copied') ?? '';
      window.setTimeout(() => { if (status) status.textContent = ''; }, 2500);
    } catch {
      window.prompt('', link);
    }
  });
}

document.querySelectorAll<HTMLElement>('[data-tk-slider]').forEach(initSlider);
document.querySelectorAll<HTMLButtonElement>('[data-tk-copy]').forEach(initCopy);

/** After the payment the buyer lands on the thank-you page (/order-status/): on return from the payment page and when the widget confirms inline. */
function initThankYouRedirect(widget: HTMLElement) {
  const path = widget.getAttribute('data-order-status');
  if (!path) return;
  const slug = widget.getAttribute('data-event-slug') ?? '';
  const go = (token: string) => orderStatusAddress(path, token, slug);

  const back = new URLSearchParams(location.search).get('checkout_token');
  if (back) {
    location.replace(go(back));
    return;
  }
  widget.addEventListener('arena:order_paid', (ev) => {
    const token = (ev as CustomEvent<{ checkoutToken?: string }>).detail?.checkoutToken;
    if (token) location.assign(go(token));
  });
}

const ticketsWidget = document.querySelector<HTMLElement>('arena-tickets');
if (ticketsWidget) initThankYouRedirect(ticketsWidget);
