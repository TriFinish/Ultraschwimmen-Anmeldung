// Bausteine, die in beiden Modi vorkommen.

import { el, fromTemplate } from '../lib/dom.js';

// --- Abschnitte -------------------------------------------------------------
export function renderHeader(event) {
  const node = fromTemplate('header-template');
  node.querySelector('.logo').alt = event.title ?? '';
  node.querySelector('.header-title').textContent = `Anmeldung ${event.title ?? ''}`.trim();

  const meta = [event.date_label, event.location].filter(Boolean).join(' · ');
  const metaEl = node.querySelector('.header-meta');
  if (meta) metaEl.textContent = meta;
  else metaEl.remove();

  return node;
}

export function renderFooter(footer) {
  const node = el('footer', 'footer');
  if (footer.note) node.appendChild(el('p', 'footer-note', footer.note));

  const links = el('div', 'footer-links');
  for (const link of footer.links ?? []) {
    const anchor = el('a', 'footer-link', link.label ?? '');
    anchor.href = link.url ?? '#';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('data-umami-event', `Footer: ${link.label}`);
    links.appendChild(anchor);
  }
  node.appendChild(links);
  return node;
}
