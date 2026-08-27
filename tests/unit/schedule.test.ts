// Zeitplan und Preistabelle entstehen aus denselben Distanzen wie die
// Anmeldung. Diese Tests halten fest, dass sie es auch bleiben.

import { describe, expect, it } from 'vitest';
import { groupByStart, minutesOfDay } from '../../src/lib/schedule.js';
import { buildPriceTable } from '../../src/lib/pricing.js';
import { loadEvent } from '../../src/data/load.js';

const { event, distances } = loadEvent();

describe('minutesOfDay', () => {
  it('rechnet Uhrzeiten in Minuten um', () => {
    expect(minutesOfDay('00:00')).toBe(0);
    expect(minutesOfDay('10:00')).toBe(600);
    expect(minutesOfDay('13:30')).toBe(810);
  });
});

describe('groupByStart', () => {
  const slots = groupByStart(distances);

  it('fasst die echten Startzeiten zu drei Blöcken zusammen', () => {
    expect(slots.map((s) => s.start)).toEqual(['10:00', '12:00', '13:00']);
  });

  it('sortiert innerhalb eines Blocks die längste Distanz nach vorn', () => {
    expect(slots[0]?.label).toBe('10 km, 8 km, 6 km, 4 km');
  });

  it('verliert keine Distanz', () => {
    const gesamt = slots.reduce((n, s) => n + s.distances.length, 0);
    expect(gesamt).toBe(distances.length);
  });

  it('sortiert nach Uhrzeit, nicht nach Eingabereihenfolge', () => {
    const gedreht = groupByStart([...distances].reverse());
    expect(gedreht.map((s) => s.start)).toEqual(['10:00', '12:00', '13:00']);
  });
});

describe('buildPriceTable', () => {
  const table = buildPriceTable(distances, event);

  it('sortiert aufsteigend — so liest man eine Preistabelle', () => {
    expect(table.rows.map((r) => r.label)).toEqual([
      '1 km',
      '2 km',
      '2 km Flossenschwimmen',
      '4 km',
      '6 km',
      '8 km',
      '10 km',
    ]);
  });

  it('führt eine Jugendspalte mit Beschriftung', () => {
    expect(table.hasYouth).toBe(true);
    expect(table.youthLabel).toBe(event.youth_label);
  });

  it('macht einen fehlenden Jugendpreis als null sichtbar statt ihn zu erfinden', () => {
    const ohne = distances.map((d) => ({ ...d, price_youth: undefined }));
    const leer = buildPriceTable(ohne, event);
    expect(leer.hasYouth).toBe(false);
    expect(leer.rows.every((r) => r.priceYouth === null)).toBe(true);
  });
});
