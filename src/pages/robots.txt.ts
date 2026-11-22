import type { APIRoute } from 'astro';
import { indexing, siteUrl } from '../../site.config.ts';

/** SITE_INDEXING != true (staging): everything is disallowed. */
export const GET: APIRoute = () => {
  const body = indexing
    ? `User-agent: *\nAllow: /\nDisallow: /order-status/\nDisallow: /my-tickets/\n\nSitemap: ${new URL('/sitemap.xml', siteUrl).href}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
