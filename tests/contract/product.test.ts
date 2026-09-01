// Schicht A — „raceresult hat deployed".
//
// Schlägt hier etwas fehl, hat raceresult sein Produkt geändert. Angekündigt
// wird das nicht — genau dafür gibt es diesen Test.
// Der Workflow labelt diese Fehlschläge mit `canary:product`.

import { describe, expect, it } from 'vitest';
import { compareBaseline } from './baseline.js';
import { probeProduct, type ProductProbe } from './probe.js';

const probe: ProductProbe = await probeProduct();

describe('raceresult Produkt-Schicht', () => {
  it('liefert eine Build-Version aus der unversionierten init.js', () => {
    // Das schärfste Einzelsignal der ganzen Kette. `init.js` selbst trägt keine
    // Version — sie transportiert nur den `build=`-Parameter weiter.
    expect(probe.build).toMatch(/^v\d+\.\d+\.\d+-\d+$/);
  });

  it('liefert eine Loader-Version', () => {
    expect(probe.loaderVersion).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('enthält alle CSS-Klassen, auf die unser Theming zielt', () => {
    // Fehlt hier eine Klasse, greift die entsprechende Regel in
    // src/styles/widget.css ins Leere — das Formular zeigt dann wieder Rot
    // oder bricht im Layout.
    expect(probe.productCssClasses).toEqual([
      'RRReg_Confirmation',
      'RRReg_EntryField',
      'RRReg_EntryFees',
      'RRReg_TabsList',
      'RRReg_RadioGroupTile',
      'RRReg_Nav',
      'RRReg_Box',
      'RRReg_Table',
      'RRReg_Main',
      'RRReg_Page',
    ]);
  });

  it('enthält RRReg_Confirmation — daran hängt das Abschluss-Tracking', () => {
    // Eigener Test, weil der Verlust dieser Klasse nicht das Layout bricht,
    // sondern still die Conversion-Messung abschaltet.
    expect(probe.productCssClasses).toContain('RRReg_Confirmation');
  });

  it('entspricht der hinterlegten Baseline', () => {
    // Bewusst ohne die Header von init.js: Last-Modified und ETag ändern sich
    // auch bei inhaltsgleichen Redeploys und würden täglich falsch anschlagen.
    // Sie stehen im Report des Workflows, nicht in der Baseline.
    const { initEtag: _etag, initLastModified: _mod, ...stabil } = probe;
    compareBaseline('product', stabil);
  });
});
