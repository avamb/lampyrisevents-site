// Turns the rendered body of an Elementor page into plain semantic HTML.
// Containers and sections are dropped, each widget becomes its own element, classes, styles and
// data-* attributes are removed. Legal wording is never touched: only markup is stripped.
import { load } from 'cheerio';

const ALLOWED_ATTR = {
  a: ['href', 'target', 'rel', 'title', 'id', 'data-popup'],
  img: ['src', 'alt', 'width', 'height', 'title'],
  iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen'],
  video: ['src', 'poster', 'controls'], source: ['src', 'type'],
  td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'], ol: ['start'],
  h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
  details: [], summary: [],
};
const ALLOWED_TAGS = new Set(['a', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'hr', 'iframe', 'video', 'source', 'details', 'summary', 'sup', 'sub', 'figure', 'figcaption']);
const POPUPS = { 2232: 'contact', 8237: 'partnership' };

function cfDecode(hex) {
  const key = parseInt(hex.slice(0, 2), 16);
  let out = '';
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

function sanitize($, root) {
  root.find('script, style, noscript, svg, i.fa, i[class*="fa-"], form, input, button, select, textarea').remove();
  // Cloudflare e-mail obfuscation back to the real address.
  root.find('.__cf_email__').each((_, el) => { const e = cfDecode($(el).attr('data-cfemail')); $(el).replaceWith(e); });
  root.find('a[href*="email-protection"]').each((_, el) => {
    const m = /email-protection#([0-9a-f]+)/i.exec($(el).attr('href') || '');
    if (m) $(el).attr('href', 'mailto:' + cfDecode(m[1]));
  });
  // Elementor popup triggers become plain anchors that the new site wires to its own forms.
  root.find('a[href^="#elementor-action"]').each((_, el) => {
    try {
      const q = decodeURIComponent($(el).attr('href').split('settings=')[1] || '');
      const id = JSON.parse(Buffer.from(q, 'base64').toString('utf8')).id;
      $(el).attr('href', '#' + (POPUPS[id] || 'popup-' + id)).attr('data-popup', POPUPS[id] || String(id));
    } catch { $(el).attr('href', '#popup'); }
  });
  // Unwrap or strip everything not allowed; drop attributes.
  root.find('*').each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    if (!tag) return;
    if (!ALLOWED_TAGS.has(tag)) { $(el).replaceWith($(el).contents()); return; }
    const keep = ALLOWED_ATTR[tag] || [];
    for (const name of Object.keys(el.attribs || {})) if (!keep.includes(name)) $(el).removeAttr(name);
  });
}

function widgetHtml($, w) {
  const type = ($(w).attr('data-widget_type') || '').split('.')[0];
  const box = $(w).find('.elementor-widget-container').first();
  const root = box.length ? box : $(w);
  const SKIP = ['icon', 'spacer', 'divider', 'html', 'nav-menu', 'share-buttons'];
  const DYNAMIC = ['loop-grid', 'template', 'form'];
  if (SKIP.includes(type)) return '';
  if (DYNAMIC.includes(type)) return `<!-- widget:${type} -->`; // lists, forms and shared templates are built by the new site
  if (type === 'icon-list') {
    const li = root.find('.elementor-icon-list-item').map((_, it) => {
      const a = $(it).find('a').first();
      const text = $(it).find('.elementor-icon-list-text').text().replace(/\s+/g, ' ').trim();
      return a.length ? `<li><a href="${a.attr('href') || '#'}">${text}</a></li>` : `<li>${text}</li>`;
    }).get();
    return li.length ? `<ul>${li.join('')}</ul>` : '';
  }
  if (type === 'media-carousel' || type === 'image-carousel') {
    const seen = new Set();
    const imgs = root.find('img, [data-src], .elementor-carousel-image').map((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || ($(el).attr('style') || '').match(/url\(["']?([^"')]+)/)?.[1];
      if (!src || src.startsWith('data:') || seen.has(src)) return null;
      seen.add(src);
      return `<img src="${src}" alt="${$(el).attr('alt') || ''}">`;
    }).get();
    return imgs.length ? '<!-- gallery -->\n' + imgs.join('\n') : `<!-- widget:${type} -->`;
  }
  if (type === 'accordion') {
    return root.find('.elementor-accordion-item').map((_, it) => {
      const title = $(it).find('.elementor-tab-title').first().text().replace(/\s+/g, ' ').trim();
      const body = $(it).find('.elementor-tab-content').first();
      sanitize($, body);
      return `<details><summary>${title}</summary>${body.html()?.trim() ?? ''}</details>`;
    }).get().join('\n');
  }
  if (type === 'tp-accordion') {
    const items = root.find('.theplus-accordion-item').map((_, it) => {
      const title = $(it).find('.elementor-tab-title').first().text().replace(/\s+/g, ' ').trim();
      const body = $(it).find('.plus-content-editor, .elementor-tab-content').first();
      sanitize($, body);
      return `<details><summary>${title}</summary>${body.html()?.trim() ?? ''}</details>`;
    }).get();
    return items.join('\n');
  }
  if (type === 'button') {
    const a = root.find('a').first();
    const text = a.find('.elementor-button-text').text().trim() || a.text().trim();
    const tmp = load(`<a>${text}</a>`, null, false);
    const link = tmp('a');
    link.attr('href', a.attr('href') || '#');
    if (a.attr('target')) link.attr('target', a.attr('target'));
    if (a.attr('rel')) link.attr('rel', a.attr('rel'));
    sanitize(tmp, tmp.root());
    return `<p>${tmp.html(link)}</p>`;
  }
  const clone = load(`<div>${root.html() ?? ''}</div>`, null, false);
  sanitize(clone, clone.root());
  let out = (clone.root().html() ?? '').trim();
  if (!out && type && !/^(heading|text-editor|image)$/.test(type)) return `<!-- widget:${type} -->`;
  return out.replace(/<div>\s*<\/div>/g, '').trim();
}

export function cleanHtml(raw) {
  const $ = load(raw, null, false);
  const parts = [];
  $('.elementor-widget').each((_, w) => {
    // Skip nested widgets: only outermost ones are collected.
    if ($(w).parents('.elementor-widget').length) return;
    const h = widgetHtml($, w);
    if (h) parts.push(h);
  });
  return parts.join('\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
