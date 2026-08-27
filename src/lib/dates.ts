// Deutsche Datumsformate für Beiträge und Seitenköpfe.
//
// Bewusst ohne `Intl.DateTimeFormat`: Das Ergebnis hinge sonst von der ICU-
// Ausstattung der Node-Version im CI ab, und ein Beitragsdatum, das lokal
// „30. August 2025" und in Actions „August 30, 2025" lautet, fällt erst live
// auf. Zwölf Monatsnamen sind billiger als diese Klasse von Fehler.

const MONATE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

/**
 * Zerlegt ein Datum in seine UTC-Bestandteile.
 *
 * UTC und nicht Ortszeit: Beitragsdaten kommen als reines `2025-08-30` herein,
 * das JS als Mitternacht UTC liest. Westlich von Greenwich wäre der lokale Tag
 * dann der 29. — der Beitrag stünde einen Tag zu früh.
 */
function parts(date: Date): { day: number; month: number; year: number } {
  return { day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear() };
}

/** `2025-08-30` → „30. August 2025" */
export function formatGermanDate(date: Date): string {
  const { day, month, year } = parts(date);
  return `${day}. ${MONATE[month]} ${year}`;
}

/** `2025-08-30` → „30.08.2025" — für Fließtext und enge Spalten. */
export function formatGermanDateShort(date: Date): string {
  const { day, month, year } = parts(date);
  return `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
}

/** `2025-08-30` — der Wert für `<time datetime="…">`. */
export function isoDate(date: Date): string {
  const { day, month, year } = parts(date);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Der Pfad eines Beitrags.
 *
 * Bewusst NICHT die WordPress-Struktur `/2025/08/30/slug/`: Ein Datum in der
 * URL ist Ballast, und die alten Kürzel waren teils nichtssagend
 * („beitrag-1") oder 200 Zeichen lang. Die alten Adressen bleiben trotzdem
 * erreichbar — als Weiterleitung, eingetragen in astro.config.mjs.
 */
export function postPath(slug: string): string {
  return `/aktuelles/${slug}/`;
}
