// Preistabelle aus den Distanzen.
//
// Die Ausschreibung führt Erwachsene und Jugendliche in zwei getrennten
// Blöcken auf, in unterschiedlicher Reihenfolge und mit einer Lücke, wo ein
// Jugendpreis fehlt. Als Tabelle mit zwei Spalten ist beides auf einen Blick
// vergleichbar — und die Lücke fällt beim Pflegen auf.

import type { Distance, EventInfo } from '../data/schema.js';

export interface PriceRow {
  id: string;
  label: string;
  price: number;
  /** `null`, wenn für diese Distanz kein Jugendpreis gepflegt ist. */
  priceYouth: number | null;
}

export interface PriceTable {
  rows: PriceRow[];
  /** Spaltenüberschrift der Jugendspalte, z. B. „Jahrgang 2009 bis …". */
  youthLabel: string | null;
  /** Ob überhaupt eine Jugendspalte nötig ist. */
  hasYouth: boolean;
}

/**
 * Sortiert aufsteigend nach Länge — so liest sich eine Preistabelle, und so
 * stand sie auch auf der alten Seite. `distances` selbst ist absteigend
 * sortiert, weil dort die Ultra-Distanz oben stehen soll.
 */
export function buildPriceTable(distances: Distance[], event: EventInfo): PriceTable {
  const rows: PriceRow[] = [...distances]
    .sort((a, b) => a.laps - b.laps || a.label.localeCompare(b.label, 'de'))
    .map((d) => ({
      id: d.id,
      label: d.label,
      price: d.price,
      priceYouth: d.price_youth ?? null,
    }));

  return {
    rows,
    youthLabel: event.youth_label ?? null,
    hasYouth: rows.some((r) => r.priceYouth !== null),
  };
}
