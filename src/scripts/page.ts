// Client-Logik der Seite: Modus-Weiche, Countdown, Distanzauswahl.
//
// Die Seite ist statisch — beide Modi stehen im HTML, und `?regname=` in der
// URL entscheidet, welcher sichtbar wird. Dieselbe Weiche wie vorher, nur ohne
// Laufzeit-Rendering: Der Inhalt ist schon da, wenn das JS startet.

import { formatEuro, formatRemaining } from './format.js';
import { startTracking, track } from './tracking.js';
import { mountWidget, type WidgetDistance } from './widget.js';

interface PageConfig {
  deadline: string;
  deadlineLabel: string;
  officeOpens?: string;
  lateFee?: number;
  eventId: number;
  distances: Array<WidgetDistance & { id: string; price: number }>;
}

function readConfig(): PageConfig | null {
  const el = document.getElementById('page-config');
  if (!el?.textContent) return null;
  return JSON.parse(el.textContent) as PageConfig;
}

function startCountdown(cfg: PageConfig): boolean {
  const node = document.querySelector<HTMLElement>('[data-deadline]');
  if (!node) return false;
  const lead = node.querySelector<HTMLElement>('.deadline-lead');
  const value = node.querySelector<HTMLElement>('.deadline-value');
  const sub = node.querySelector<HTMLElement>('.deadline-sub');
  if (!lead || !value || !sub) return false;

  const deadline = new Date(cfg.deadline).getTime();

  const update = (): boolean => {
    const remaining = deadline - Date.now();
    if (remaining > 0) {
      lead.textContent = 'Voranmeldung noch';
      value.textContent = formatRemaining(remaining);
      sub.textContent = `Schluss: ${cfg.deadlineLabel}`;
      return false;
    }
    node.classList.add('is-closed');
    lead.textContent = 'Voranmeldung geschlossen';
    value.textContent = cfg.lateFee
      ? `Nachmeldung am Veranstaltungstag (+${formatEuro(cfg.lateFee)})`
      : 'Nachmeldung am Veranstaltungstag';
    sub.textContent = cfg.officeOpens ? `Wettkampfbüro öffnet um ${cfg.officeOpens} Uhr` : '';
    return true;
  };

  const abgelaufen = update();
  setInterval(update, 1000);
  return abgelaufen;
}

// Entscheidungsmodus: Distanzwahl hält den CTA-Link aktuell.
function wireDecision(cfg: PageConfig): void {
  const cta = document.getElementById('cta') as HTMLAnchorElement | null;
  const hint = document.getElementById('cta-hint');
  const bar = document.getElementById('cta-bar');
  if (!cta || !bar) return;

  const base = `${location.pathname}?regname=Sammel-Anmeldung`;
  cta.href = base;

  for (const input of document.querySelectorAll<HTMLInputElement>('.card-input')) {
    input.addEventListener('change', () => {
      const distance = cfg.distances.find((d) => d.id === input.value);
      if (!distance) return;
      cta.href = `${base}&d=${encodeURIComponent(distance.id)}`;
      if (hint) hint.textContent = `${distance.label} · ${formatEuro(distance.price)}`;
      track(`Distanz gewählt: ${distance.label}`);
    });
  }

  cta.addEventListener('click', () => {
    const gewaehlt = document.querySelector<HTMLInputElement>('.card-input:checked');
    const distance = cfg.distances.find((d) => d.id === gewaehlt?.value);
    track('Zur Anmeldung', { distanz: distance?.label ?? 'keine Auswahl' });
  });

  bar.hidden = false;
  keepBarFromCoveringContent(bar);
}

// Die Sticky-Leiste verdeckte auf der alten Seite Inhalt. Ein fester Wert in
// CSS reicht nicht: Der Hinweistext bricht auf schmalen Geräten um, und dann
// ist die Leiste höher als geschätzt. Also die echte Höhe messen und als
// Unterrand der Seite setzen.
//
// Den gemessenen Wert liest der Fußbereich (site.css) und addiert ihn auf
// `--dock`, den Platz der Daumenleiste. So stapeln sich beide, ohne dass eine
// von beiden eine Zahl über die andere raten müsste.
function keepBarFromCoveringContent(bar: HTMLElement): void {
  const anpassen = () => {
    // Auf dem Desktop steht die Leiste im Fluss (position: static), dann
    // braucht die Seite unten keinen zusätzlichen Platz.
    const fixiert = getComputedStyle(bar).position === 'fixed';
    document.documentElement.style.setProperty(
      '--cta-height',
      // Plus Abstand zur Daumenleiste darunter — denselben, den StickyCta
      // als `bottom` setzt.
      fixiert ? `${bar.offsetHeight + 12}px` : '0px',
    );
  };
  anpassen();
  if (typeof ResizeObserver === 'function') new ResizeObserver(anpassen).observe(bar);
  window.addEventListener('resize', anpassen);
}

// Formularmodus: Widget einhängen, Notausgang bereithalten.
function wireForm(cfg: PageConfig, params: URLSearchParams): void {
  const container = document.getElementById('divRRRegStart');
  const fallback = document.getElementById('widget-fallback');
  if (!container || !fallback) return;

  const distance = cfg.distances.find((d) => d.id === params.get('d')) ?? null;

  // Die Kontinuitätsleiste sagt dem Nutzer auch dann, was er wählen wollte,
  // wenn die Vorwahl im Formular nicht greift.
  const text = document.getElementById('continuity-text');
  if (text && distance) {
    text.textContent = `Deine Wahl: ${distance.label} · ${formatEuro(distance.price)}`;
  }

  track('Formular geöffnet', { distanz: distance?.label ?? 'keine Auswahl' });

  mountWidget(
    container,
    cfg.eventId,
    distance,
    (grund) => {
      container.hidden = true;
      fallback.hidden = false;
      track('Formular nicht ladbar', { grund });
    },
    () => {
      container.hidden = false;
      fallback.hidden = true;
    },
  );
}

export function initPage(): void {
  startTracking();

  const cfg = readConfig();
  if (!cfg) return;

  const params = new URLSearchParams(location.search);
  const formMode = params.has('regname');

  document.getElementById(formMode ? 'mode-decision' : 'mode-form')?.remove();

  const abgelaufen = startCountdown(cfg);
  if (abgelaufen) track('Deadline abgelaufen');

  if (formMode) wireForm(cfg, params);
  else if (!abgelaufen) wireDecision(cfg);
}
