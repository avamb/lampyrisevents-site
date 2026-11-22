/** Platform client and storage keys of the browser pages (order status, my tickets, forms). */
import { createArenaClient } from 'arena-site-kit/arena';
import { createStorageKeys } from 'arena-site-kit/lib/storage-keys';

/** One set of browser storage keys, prefix lp (the kit default is vc). */
export const storageKeys = createStorageKeys('lp');

export { createArenaClient };
