// Schicht B — „Tollense hat das Event bearbeitet".
//
// Schlägt hier etwas fehl, hat der Zeitnehmer im Backend etwas geändert.
// Das ist kein Notfall: Wir können nachfragen. Der Workflow labelt diese
// Fehlschläge deshalb mit `canary:event` statt `canary:product`.

import { describe, expect, it } from 'vitest';
import { compareBaseline } from './baseline.js';
import { loadAnmeldung } from '../../src/data/load.js';
import { probeEvent, type EventProbe } from './probe.js';

const probe: EventProbe = await probeEvent();
const data = loadAnmeldung();

describe('raceresult Veranstalter-Schicht', () => {
  it('hat das Wettbewerbsfeld unter der erwarteten Klasse', () => {
    // Aus `ClassName` leitet sich der Selektor `[name="RRReg_1_0"]` in
    // src/scripts/widget.ts ab. Ändert raceresult die Nummerierung, greift die
    // Distanz-Vorwahl still ins Leere — dieser Test fängt das ab.
    expect(probe.contestFieldClassName).toBe('RRReg_1_0');
    expect(probe.contestFieldControlType).toBe('dropdown');
  });

  it('kennt jede contest_id aus anmeldung.yaml mit identischem Label', () => {
    // Fängt Umnummerierung UND Umbenennung. Ein stummes Verschieben der IDs
    // würde sonst die falsche Distanz vorwählen — schlimmer als gar keine.
    const imFormular = new Map(probe.contests.map((c) => [c.Value, c.Label]));
    for (const d of data.distances) {
      expect(imFormular.get(d.contest_id), `contest_id ${d.contest_id} (${d.label})`).toBe(d.label);
    }
  });

  it('bietet keine ausverkauften Distanzen an, die wir noch bewerben', () => {
    const ausverkauft = probe.contests.filter((c) => c.SoldOut).map((c) => c.Label);
    const beworben = new Set(data.distances.map((d) => d.label));
    expect(ausverkauft.filter((l) => beworben.has(l))).toEqual([]);
  });

  it('entspricht der hinterlegten Baseline', () => {
    // Deckt auch die roten Selektoren im Veranstalter-CSS ab: Taucht dort ein
    // neuer auf, den unser Override-Layer nicht kennt, ändert sich diese Liste
    // und der Diff zeigt genau ihn.
    compareBaseline('event', probe);
  });
});
