// Wann der Ergebnishinweis erscheint.
//
// Die Entscheidung hängt an Datum, Pfad und einer gemerkten Wegklick-
// Entscheidung. Genau deshalb ist sie eine reine Funktion: So lassen sich alle
// Kombinationen prüfen, ohne eine Seite zu bauen und die Uhr zu stellen.

import { describe, expect, it } from 'vitest';
import { sollHinweisZeigen, speicherSchluessel } from '../../src/scripts/ergebnishinweis';
import { loadEvent } from '../../src/data/load';

const { event } = loadEvent();
const EVENT = event.date;

const zeit = (iso: string) => new Date(iso).getTime();
const lage = (over: Partial<Parameters<typeof sollHinweisZeigen>[0]> = {}) =>
  sollHinweisZeigen({
    jetzt: zeit(`${EVENT}T12:00:00Z`),
    eventDatum: EVENT,
    pfad: '/zeitplan/',
    weggeklickt: false,
    ...over,
  });

describe('sollHinweisZeigen', () => {
  it('schweigt vor dem Wettkampf', () => {
    expect(lage({ jetzt: zeit('2026-08-01T12:00:00Z') })).toBe(false);
  });

  it('schweigt am Wettkampftag selbst — da schwimmt noch jemand', () => {
    expect(lage({ jetzt: zeit(`${EVENT}T12:00:00Z`) })).toBe(false);
    expect(lage({ jetzt: zeit(`${EVENT}T23:59:00Z`) })).toBe(false);
  });

  it('erscheint am Tag danach', () => {
    expect(lage({ jetzt: zeit('2026-08-30T08:00:00Z') })).toBe(true);
  });

  it('bleibt bis zum Jahresende', () => {
    expect(lage({ jetzt: zeit('2026-12-31T23:00:00Z') })).toBe(true);
  });

  it('verschwindet im neuen Jahr — dann steht der nächste Wettkampf an', () => {
    expect(lage({ jetzt: zeit('2027-01-01T00:00:00Z') })).toBe(false);
  });

  it('erscheint nicht auf der Ergebnisseite selbst', () => {
    const jetzt = zeit('2026-09-15T10:00:00Z');
    expect(lage({ jetzt, pfad: '/ergebnisse/' })).toBe(false);
    expect(lage({ jetzt, pfad: '/zeitplan/' })).toBe(true);
  });

  it('bleibt weg, wenn er weggeklickt wurde', () => {
    expect(lage({ jetzt: zeit('2026-09-15T10:00:00Z'), weggeklickt: true })).toBe(false);
  });

  it('bleibt bei einem kaputten Datum still, statt zu werfen', () => {
    expect(() => lage({ eventDatum: 'irgendwas' })).not.toThrow();
    expect(lage({ eventDatum: 'irgendwas' })).toBe(false);
  });
});

describe('speicherSchluessel', () => {
  it('trägt das Jahr, damit Wegklicken nicht für immer gilt', () => {
    expect(speicherSchluessel('2026-08-29')).toBe('us-ergebnishinweis-2026');
    expect(speicherSchluessel('2027-08-28')).not.toBe(speicherSchluessel('2026-08-29'));
  });
});
