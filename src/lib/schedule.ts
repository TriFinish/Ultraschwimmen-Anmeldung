// Der Zeitplan entsteht aus den Distanzen, nicht neben ihnen.
//
// Auf der alten Seite stand er als abgetippte Liste auf drei Seiten — und die
// Ausschreibung trug „Stand 10.2.", der Zeitplan „Stand 12.2." mit anderen
// Zeiten. Hier gibt es nur `distances[].start`; alles andere wird daraus
// berechnet.

import type { Distance } from '../data/schema.js';

export interface ScheduleSlot {
  /** „10:00" — der Schlüssel, nach dem gruppiert wurde. */
  start: string;
  /** Alle Distanzen dieses Starts, längste zuerst. */
  distances: Distance[];
  /** „10 km, 8 km, 6 km, 4 km" — fertig für eine Zeile. */
  label: string;
}

/** „10:00" → 600. Erlaubt Sortieren ohne Date-Objekt und ohne Zeitzone. */
export function minutesOfDay(time: string): number {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * Gruppiert die Distanzen nach Startzeit und sortiert beides: die Slots nach
 * Uhrzeit, die Distanzen darin nach Länge absteigend. Die längste Distanz
 * startet zuerst und soll auch zuerst stehen.
 */
export function groupByStart(distances: Distance[]): ScheduleSlot[] {
  const slots = new Map<string, Distance[]>();

  for (const distance of distances) {
    const bucket = slots.get(distance.start);
    if (bucket) bucket.push(distance);
    else slots.set(distance.start, [distance]);
  }

  return [...slots.entries()]
    .sort(([a], [b]) => minutesOfDay(a) - minutesOfDay(b))
    .map(([start, list]) => {
      const sorted = [...list].sort((a, b) => b.laps - a.laps);
      return { start, distances: sorted, label: sorted.map((d) => d.label).join(', ') };
    });
}
