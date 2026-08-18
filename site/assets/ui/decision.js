// Entscheidungsmodus: die Seite, auf die die Instagram-Bio zeigt.
// Distanz wählen, Preis und Frist sehen, weiter ins Formular.

import { el, fromTemplate, formatEuro } from '../lib/dom.js';
import { track } from '../lib/tracking.js';
import { renderDeadline } from './deadline.js';
import { renderHeader, renderFooter } from './shared.js';

function renderDistances(distances, event, onSelect) {
  const section = el('section', 'section');
  section.appendChild(el('h2', 'section-title', 'Distanz wählen'));

  const grid = el('div', 'grid');
  for (const distance of distances) {
    const node = fromTemplate('distance-template');
    const input = node.querySelector('.card-input');
    input.value = distance.id ?? distance.label;

    node.querySelector('.card-label').textContent = distance.label ?? '';
    node.querySelector('.card-price').textContent =
      distance.price !== undefined ? formatEuro(distance.price) : '';
    node.querySelector('.card-start').textContent = distance.start
      ? `Start ${distance.start} Uhr`
      : '';

    const laps = node.querySelector('.card-laps');
    if (distance.laps) {
      laps.textContent = `${distance.laps} ${distance.laps === 1 ? 'Runde' : 'Runden'}`;
    } else {
      laps.remove();
    }

    const youth = node.querySelector('.card-youth');
    if (distance.price_youth !== undefined) {
      youth.textContent = `${formatEuro(distance.price_youth)} für ${event.youth_label ?? 'Jugendliche'}`;
    } else {
      youth.remove();
    }

    input.addEventListener('change', () => onSelect(distance));
    grid.appendChild(node);
  }

  section.appendChild(grid);
  return section;
}

function renderGroup(group) {
  const section = el('section', 'section group');
  if (group.headline) section.appendChild(el('h2', 'section-title', group.headline));
  if (group.text) section.appendChild(el('p', 'group-text', group.text));
  if (group.note) section.appendChild(el('p', 'group-note', group.note));
  return section;
}

function renderFaq(faq) {
  const section = el('section', 'section');
  section.appendChild(el('h2', 'section-title', 'Häufige Fragen'));
  for (const entry of faq) {
    const node = fromTemplate('faq-template');
    node.querySelector('.faq-q').textContent = entry.q ?? '';
    node.querySelector('.faq-a').textContent = entry.a ?? '';
    section.appendChild(node);
  }
  return section;
}

// --- CTA --------------------------------------------------------------------
// Ziel ist die eigene Seite im Formularmodus, nicht mehr raceresult. `d` trägt
// die gewählte Distanz — sie steuert dort die Kontinuitätsleiste und die
// Vorwahl des Wettbewerbs. Siehe PLAN.md, „Aufbau: ein Dokument, zwei Modi".
function buildRegistrationUrl(provider, distance) {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('regname', provider.regname ?? 'Sammel-Anmeldung');
  if (distance?.id) url.searchParams.set('d', distance.id);
  return url.pathname + url.search;
}

function setupCta(provider, getSelected, isClosed) {
  const bar = document.getElementById('cta-bar');
  const cta = document.getElementById('cta');
  const hint = document.getElementById('cta-hint');

  const refresh = () => {
    cta.href = buildRegistrationUrl(provider, getSelected());
    hint.textContent = isClosed()
      ? 'Voranmeldung geschlossen — Nachmeldung ist am Veranstaltungstag vor Ort möglich.'
      : 'Anmeldung und Bezahlung laufen hier auf dieser Seite.';
  };

  // Der Wechsel in den Formularmodus ist ein echter Seitenwechsel — das Event
  // muss vorher raus.
  cta.addEventListener('click', () => {
    track('Zur Anmeldung', { distanz: getSelected()?.label ?? 'keine Auswahl' });
  });

  // Die Leiste liegt fix über dem Inhalt — ihre Höhe muss unten Platz lassen,
  // sonst verdeckt sie den Footer. Die Hinweiszeile ändert ihre Länge, also
  // messen statt raten.
  const applyHeight = () => {
    document.documentElement.style.setProperty('--cta-height', `${bar.offsetHeight}px`);
  };
  if ('ResizeObserver' in window) new ResizeObserver(applyHeight).observe(bar);
  else window.addEventListener('resize', applyHeight);

  bar.hidden = false;
  refresh();
  applyHeight();
  return refresh;
}

// --- Entscheidungsmodus -----------------------------------------------------
export function renderEntscheidungsmodus(data) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const event = data.event ?? {};
  const provider = data.provider ?? {};

  app.appendChild(renderHeader(event));

  const deadline = renderDeadline(event);
  if (deadline.node) app.appendChild(deadline.node);

  let selected = null;
  let refreshCta = () => {};

  if (data.distances?.length) {
    app.appendChild(
      renderDistances(data.distances, event, (distance) => {
        selected = distance;
        track(`Distanz gewählt: ${distance.label}`);
        refreshCta();
      }),
    );
  }

  if (data.group) app.appendChild(renderGroup(data.group));
  if (data.faq?.length) app.appendChild(renderFaq(data.faq));
  if (data.footer) app.appendChild(renderFooter(data.footer));

  let closed = deadline.update();
  let closedTracked = false;
  const noteIfClosed = () => {
    if (closed && !closedTracked) {
      closedTracked = true;
      track('Deadline abgelaufen');
    }
  };

  refreshCta = setupCta(provider, () => selected, () => closed);
  noteIfClosed();

  // Sekundentakt: unter einem Tag zählt die Anzeige Sekunden mit.
  setInterval(() => {
    const wasClosed = closed;
    closed = deadline.update();
    if (closed !== wasClosed) refreshCta();
    noteIfClosed();
  }, 1000);
}
