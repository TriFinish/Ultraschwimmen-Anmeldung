// Hält die Ausschreibung an event.yaml gefesselt.
//
// Die Ausschreibung ist bewusst Prosa und keine generierte Tabelle — sie ist
// ein formales Dokument mit eigenem Stand-Datum. Der Preis dafür wäre Drift:
// Auf der alten Seite nannte die Ausschreibung Preise und ein
// raceresult-Event, die anderswo längst anders lauteten, und über Jahre fiel
// es niemandem auf.
//
// Dieser Test ist der Ausgleich. Er schreibt nicht vor, WIE die Zahlen im Text
// stehen — nur DASS jede Zahl, die dort steht, mit den Daten übereinstimmt.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadEvent } from '../../src/data/load.js';

const markdown = readFileSync(join(process.cwd(), 'src/content/ausschreibung.md'), 'utf8');
const { event, course, distances } = loadEvent();

describe('Ausschreibung', () => {
  it('nennt jeden Preis aus event.yaml', () => {
    const fehlend = distances.filter((d) => !markdown.includes(`${d.price} €`));
    expect(fehlend.map((d) => `${d.label}: ${d.price} €`)).toEqual([]);
  });

  it('nennt jeden Jugendpreis aus event.yaml', () => {
    const fehlend = distances.filter(
      (d) => d.price_youth !== undefined && !markdown.includes(`${d.price_youth} €`),
    );
    expect(fehlend.map((d) => `${d.label}: ${d.price_youth} €`)).toEqual([]);
  });

  it('erfindet keine Preise, die es nicht gibt', () => {
    // Die Gegenrichtung: Ein hier stehengebliebener Vorjahrespreis fällt sonst
    // niemandem auf.
    const erlaubt = new Set<string>();
    for (const d of distances) {
      erlaubt.add(`${d.price} €`);
      if (d.price_youth !== undefined) erlaubt.add(`${d.price_youth} €`);
    }
    // Die Transpondergebühr ist kein Startgeld und steht bewusst daneben.
    erlaubt.add('90 €');
    if (event.late_fee !== undefined) erlaubt.add(`${event.late_fee} €`);

    const genannt = [...markdown.matchAll(/(\d+) €/g)].map((m) => `${m[1]} €`);
    expect([...new Set(genannt)].filter((p) => !erlaubt.has(p))).toEqual([]);
  });

  it('nennt jede Startzeit aus event.yaml', () => {
    const starts = [...new Set(distances.map((d) => d.start))];
    expect(starts.filter((s) => !markdown.includes(s))).toEqual([]);
  });

  it('nennt Rundenlänge und Nachmeldegebühr wie hinterlegt', () => {
    expect(markdown).toContain(`${course.lap_length_m} m`);
    expect(markdown).toContain(`${event.late_fee} €`);
  });

  it('nennt den Anmeldeschluss mit demselben Tag wie die Frist', () => {
    // deadline_label lautet „Donnerstag, 27.08.2026 · 23:00 Uhr"; im Fließtext
    // steht „27. August 2026 um 23 Uhr". Geprüft wird der Tag, nicht der
    // Wortlaut — sonst diktierte der Test den Satzbau.
    const frist = new Date(event.deadline);
    expect(markdown).toMatch(new RegExp(`${frist.getUTCDate()}\\.\\s*August`));
  });

  it('verlinkt die Anmeldung nicht', () => {
    // Ausdrücklich so gewollt: Die Ausschreibung ist reiner Text.
    expect(markdown).not.toMatch(/\]\(|https?:\/\/|<a\b/);
  });

  it('nennt kein raceresult-Event — auch nicht das richtige', () => {
    expect(markdown).not.toMatch(/raceresult/i);
  });
});
