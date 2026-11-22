/**
 * GA4 and Meta pixel through the kit. Ids come from the build env via data attributes of <body>
 * (empty on staging: then nothing is loaded and no call is made). No GTM.
 * Included on every page except the personal ones (order status, my tickets).
 */
import { startTracking } from 'arena-site-kit/scripts/tracking';
import { consent } from './consent.ts';

startTracking({ consent });
