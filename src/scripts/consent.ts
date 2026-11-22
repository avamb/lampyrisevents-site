/** The site's ONE consent instance (notice mode: tracking is on until the visitor declines). */
import { createConsent } from 'arena-site-kit/scripts/consent';

export const consent = createConsent({ cookie: 'lp_consent', event: 'lp:consent' });
