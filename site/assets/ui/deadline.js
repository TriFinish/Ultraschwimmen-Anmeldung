// Anmeldefrist: Countdown, Umschalten auf „geschlossen“ und die Prüfung, ob
// `deadline` und `deadline_label` in der YAML noch zusammenpassen.

import { formatEuro, fromTemplate } from '../lib/dom.js';

// Der Vergleich läuft gegen den absoluten Zeitpunkt aus der YAML (ISO-8601 mit
// Offset), nicht gegen eine lokal zusammengebaute Zeit. Sonst sähe jemand in
// einer anderen Zeitzone die Anmeldung zu früh geschlossen.
function parseDeadline(raw) {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Stiller Datenfehler, der teuer wäre: `deadline_label` sagt etwas anderes als
// `deadline`. Beides wird von Hand gepflegt, also einmal gegeneinander prüfen.
function warnIfDeadlineLabelStale(deadline, label) {
  if (!deadline || !label) return;
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(deadline);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  const datum = `${get('day')}.${get('month')}.${get('year')}`;
  const uhrzeit = `${get('hour')}:${get('minute')}`;
  if (!label.includes(datum) || !label.includes(uhrzeit)) {
    console.warn(
      `deadline_label ("${label}") passt nicht zu deadline (${datum} ${uhrzeit} Berliner Zeit). ` +
        'Eine der beiden Angaben in anmeldung.yaml ist veraltet.',
    );
  }
}

function formatRemaining(ms) {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (days > 0) return `${days} ${days === 1 ? 'Tag' : 'Tage'} ${hours} Std ${minutes} Min`;
  if (hours > 0) return `${hours} Std ${minutes} Min ${seconds} Sek`;
  return `${minutes} Min ${seconds} Sek`;
}

// Liefert den Knoten plus eine `update`-Funktion, die `true` meldet, sobald die
// Frist abgelaufen ist.
export function renderDeadline(event) {
  const node = fromTemplate('deadline-template');
  const lead = node.querySelector('.deadline-lead');
  const value = node.querySelector('.deadline-value');
  const sub = node.querySelector('.deadline-sub');

  const deadline = parseDeadline(event.deadline);
  warnIfDeadlineLabelStale(deadline, event.deadline_label);

  // Kein verwertbares Datum: lieber gar keine Frist zeigen als eine falsche.
  if (!deadline) return { node: null, update: () => false };

  const lateFee = event.late_fee;
  const update = () => {
    const remaining = deadline.getTime() - Date.now();
    if (remaining > 0) {
      lead.textContent = 'Voranmeldung noch';
      value.textContent = formatRemaining(remaining);
      sub.textContent = event.deadline_label ? `Schluss: ${event.deadline_label}` : '';
      return false;
    }
    node.classList.add('is-closed');
    lead.textContent = 'Voranmeldung geschlossen';
    value.textContent = lateFee
      ? `Nachmeldung am Veranstaltungstag (+${formatEuro(lateFee)})`
      : 'Nachmeldung am Veranstaltungstag';
    sub.textContent = event.office_opens
      ? `Wettkampfbüro öffnet um ${event.office_opens} Uhr`
      : '';
    return true;
  };

  update();
  return { node, update };
}
