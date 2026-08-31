// Reine Formatierungs- und Prüflogik. Kein DOM, kein Netz — damit sie in den
// Unit-Tests ohne Browser läuft.

export function formatEuro(value: number): string {
  return `${Number(value).toLocaleString('de-DE')} €`;
}

export function formatRemaining(ms: number): string {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (days > 0) return `${days} ${days === 1 ? 'Tag' : 'Tage'} ${hours} Std ${minutes} Min`;
  if (hours > 0) return `${hours} Std ${minutes} Min ${seconds} Sek`;
  return `${minutes} Min ${seconds} Sek`;
}

// `deadline` und `deadline_label` werden beide von Hand gepflegt und können
// auseinanderlaufen. Bisher war das eine Konsolen-Warnung, die niemand sah;
// jetzt ist es ein Unit-Test.
export function labelMatchesDeadline(deadline: Date, label: string): boolean {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(deadline);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const datum = `${get('day')}.${get('month')}.${get('year')}`;
  const uhrzeit = `${get('hour')}:${get('minute')}`;
  return label.includes(datum) && label.includes(uhrzeit);
}
