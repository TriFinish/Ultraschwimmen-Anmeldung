// Prüft die Daten und die reine Logik — offline, in Millisekunden.

import { describe, expect, it } from 'vitest';
import { eventDataSchema } from '../../src/data/schema.js';
import { loadEvent } from '../../src/data/load.js';
import { formatEuro, formatRemaining, labelMatchesDeadline } from '../../src/scripts/format.js';

const data = loadEvent();

describe('event.yaml', () => {
  it('erfüllt das Schema', () => {
    expect(() => loadEvent()).not.toThrow();
  });

  it('hat eindeutige Distanz-IDs und contest_ids', () => {
    const ids = data.distances.map((d) => d.id);
    const contests = data.distances.map((d) => d.contest_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(contests).size).toBe(contests.length);
  });

  it('hält deadline_label und deadline synchron', () => {
    // Beide werden von Hand gepflegt. Driften sie auseinander, zeigt die Seite
    // eine andere Frist an, als der Countdown zählt. Früher nur console.warn.
    expect(labelMatchesDeadline(new Date(data.event.deadline), data.event.deadline_label)).toBe(
      true,
    );
  });

  it('verlangt einen Zeitzonen-Offset in deadline', () => {
    const ohneOffset = {
      ...data,
      event: { ...data.event, deadline: '2026-08-27T23:00:00' },
    };
    expect(eventDataSchema.safeParse(ohneOffset).success).toBe(false);
  });

  it('lehnt eine relative provider.url ab', () => {
    const relativ = { ...data, provider: { ...data.provider, url: '/anmeldung' } };
    expect(eventDataSchema.safeParse(relativ).success).toBe(false);
  });

  it('lehnt eine leere Distanzliste ab', () => {
    expect(eventDataSchema.safeParse({ ...data, distances: [] }).success).toBe(false);
  });
});

describe('formatRemaining', () => {
  const s = 1000;
  const min = 60 * s;
  const h = 60 * min;
  const d = 24 * h;

  it('zeigt Tage mit korrektem Singular', () => {
    expect(formatRemaining(d + 7 * h + 41 * min)).toBe('1 Tag 7 Std 41 Min');
    expect(formatRemaining(2 * d)).toBe('2 Tage 0 Std 0 Min');
  });

  it('wechselt unter einem Tag auf Sekunden', () => {
    expect(formatRemaining(3 * h + 2 * min + 5 * s)).toBe('3 Std 2 Min 5 Sek');
  });

  it('zeigt unter einer Stunde nur Minuten und Sekunden', () => {
    expect(formatRemaining(90 * s)).toBe('1 Min 30 Sek');
  });

  it('bleibt bei null und negativ stabil', () => {
    expect(formatRemaining(0)).toBe('0 Min 0 Sek');
    expect(() => formatRemaining(-5000)).not.toThrow();
  });
});

describe('formatEuro', () => {
  it('formatiert deutsch', () => {
    expect(formatEuro(47)).toBe('47 €');
    expect(formatEuro(1234)).toBe('1.234 €');
  });
});

describe('labelMatchesDeadline', () => {
  const deadline = new Date('2026-08-27T23:00:00+02:00');

  it('akzeptiert das passende Label', () => {
    expect(labelMatchesDeadline(deadline, 'Donnerstag, 27.08.2026 · 23:00 Uhr')).toBe(true);
  });

  it('erkennt ein veraltetes Label', () => {
    expect(labelMatchesDeadline(deadline, 'Freitag, 28.08.2026 · 23:00 Uhr')).toBe(false);
    expect(labelMatchesDeadline(deadline, 'Donnerstag, 27.08.2026 · 22:00 Uhr')).toBe(false);
  });

  it('rechnet in Berliner Zeit, nicht in der Zeitzone des Betrachters', () => {
    // 23:00+02:00 ist 21:00 UTC. Das Label nennt Berliner Zeit und muss auch
    // dann passen, wenn der Test in einer anderen Zeitzone läuft.
    expect(labelMatchesDeadline(new Date('2026-08-27T21:00:00Z'), '27.08.2026 · 23:00 Uhr')).toBe(
      true,
    );
  });
});
