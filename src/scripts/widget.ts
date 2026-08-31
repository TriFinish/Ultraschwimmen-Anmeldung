// Das eingebettete raceresult-Widget. Hier steckt alles, was fremdes Markup
// anfasst — entsprechend defensiv.
//
// Die Recherche zur Doku hat ergeben: Es gibt KEINE zugesicherte Schnittstelle
// für das, was wir hier tun. Das Widget liest aus der URL nur `n`, `k`,
// `regname` und `test` (kein Deep-Link für den Wettbewerb) und feuert weder
// CustomEvent noch Callback bei Abschluss. Die beiden Griffe unten sind also
// nicht Bequemlichkeit, sondern alternativlos — und deshalb überwacht der
// Canary sie täglich.

import { track } from './tracking.js';

// Die Doku (Website Integration, KB 3323) nennt `load.js.php`. Der Name bleibt,
// auch wenn Tollense in ihrer Mail `load.js` schrieb — beide Dateien sind
// byte-identisch, aber die Doku ist die belastbarere Referenz.
const WIDGET_LOADER = 'https://my.raceresult.com/RRRegStart/load.js.php?lang=de';
const CONTEST_FIELD = '[name="RRReg_1_0"]';
const WIDGET_TIMEOUT_MS = 25000;

interface RRRegStartInstance {
  ShowInfoText: boolean;
  ShowTimerLogo: boolean;
}
type RRRegStartCtor = new (
  container: HTMLElement,
  eventId: number,
  mode?: string,
) => RRRegStartInstance;

declare global {
  interface Window {
    RRRegStart?: RRRegStartCtor;
  }
}

export interface WidgetDistance {
  label: string;
  contest_id: number;
}

// Setzt das Wettbewerbsfeld auf die gewählte Distanz. Griff in fremdes Markup:
// schlägt es fehl, passiert nichts weiter — die Kontinuitätsleiste hat den
// Nutzer bereits informiert, was er wählen wollte.
export function preselectContest(container: HTMLElement, distance: WidgetDistance | null): void {
  if (!distance) return;
  const wanted = String(distance.contest_id);
  let done = false;

  const apply = (): boolean => {
    if (done) return true;
    const select = container.querySelector<HTMLSelectElement>(CONTEST_FIELD);
    if (!select || !select.options.length) return false;
    if (![...select.options].some((o) => o.value === wanted)) {
      console.warn(`Contest-ID ${wanted} kommt im Formular nicht vor — Vorwahl übersprungen.`);
      done = true;
      return true;
    }
    done = true;
    select.value = wanted;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    track(`Distanz vorgewählt: ${distance.label}`);
    return true;
  };

  if (apply()) return;

  // Das Formular rendert asynchron, also auf sein Erscheinen warten.
  const observer = new MutationObserver(() => {
    if (apply()) observer.disconnect();
  });
  observer.observe(container, { childList: true, subtree: true });
  setTimeout(() => {
    observer.disconnect();
    if (!done) console.warn('Wettbewerbsfeld nicht gefunden — Vorwahl übersprungen.');
  }, 10000);
}

// Das Widget setzt den Fokus selbst ins erste Feld (Verein). Das klappt die
// Vorschlagsliste auf, scrollt am Kopf der Seite vorbei und öffnet auf dem Handy
// die Tastatur — bevor jemand lesen konnte, wo er ist. Unterdrückt wird nur der
// Fokus, den niemand angefordert hat: sobald der Nutzer tippt, hält sich das
// hier komplett raus.
export function suppressAutofocus(container: HTMLElement): void {
  let nutzerAktiv = false;
  const merken = () => {
    nutzerAktiv = true;
  };
  for (const typ of ['pointerdown', 'keydown', 'touchstart']) {
    document.addEventListener(typ, merken, { capture: true, once: true });
  }

  const abwehren = (event: FocusEvent) => {
    if (nutzerAktiv) return;
    const target = event.target;
    if (target instanceof HTMLElement) target.blur();
  };
  container.addEventListener('focusin', abwehren, true);

  setTimeout(() => container.removeEventListener('focusin', abwehren, true), 3000);
}

// Die Bestätigungsseite liegt von Anfang an im DOM und wird nur eingeblendet —
// deshalb Sichtbarkeit prüfen, nicht Existenz. Ein Callback dafür gibt es im
// gesamten raceresult-Bundle nicht (verifiziert), also bleibt der Observer.
export function watchForCompletion(container: HTMLElement): void {
  let fired = false;
  const check = () => {
    if (fired) return;
    const confirmation = container.querySelector<HTMLElement>('.RRReg_Confirmation');
    if (confirmation && confirmation.offsetParent !== null) {
      fired = true;
      track('Anmeldung abgeschlossen');
    }
  };
  new MutationObserver(check).observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });
}

export function mountWidget(
  container: HTMLElement,
  eventId: number,
  distance: WidgetDistance | null,
  onFail: (grund: string) => void,
  onRendered: () => void,
): void {
  let zustand: 'wartet' | 'gerendert' | 'gescheitert' = 'wartet';

  const scheitern = (grund: string) => {
    if (zustand !== 'wartet') return;
    zustand = 'gescheitert';
    console.warn(`Anmeldeformular nicht geladen: ${grund}`);
    onFail(grund);
  };

  // Sobald das Widget etwas rendert, ist die Sache gut — auch wenn der
  // Notausgang vorher schon zu sehen war. Dann wird er wieder eingesammelt.
  const gerendert = () => {
    if (zustand === 'gerendert') return;
    const kamSpaet = zustand === 'gescheitert';
    zustand = 'gerendert';
    beobachter.disconnect();
    clearTimeout(uhr);
    if (kamSpaet) console.info('Formular kam verspätet doch noch — Notausgang zurückgenommen.');
    onRendered();
  };

  const beobachter = new MutationObserver(() => {
    if (container.children.length > 0) gerendert();
  });
  beobachter.observe(container, { childList: true });

  // Häufigster Grund fürs stille Nichts beim lokalen Entwickeln: Der Loader hält
  // jeden Origin mit „localhost" für seinen eigenen und sucht seine Scripts dann
  // auf unserem Server. Über 127.0.0.1 klappt es.
  if (location.hostname === 'localhost') {
    console.warn(
      'Achtung: raceresult lädt sein Widget nicht über „localhost". Diese Seite ' +
        `stattdessen über http://127.0.0.1:${location.port || '80'} öffnen.`,
    );
  }

  suppressAutofocus(container);

  const script = document.createElement('script');
  script.src = WIDGET_LOADER;
  script.onerror = () => scheitern('das Loader-Script war nicht erreichbar (Adblocker? Netzwerk?)');
  script.onload = () => {
    if (typeof window.RRRegStart !== 'function') {
      return scheitern('RRRegStart wurde vom Loader nicht bereitgestellt');
    }
    try {
      // Dritter Parameter bleibt weg: RRRegStart2 setzt intern
      // `void 0 === mode && (mode = "registration")`, der Default ist also
      // bereits korrekt. ShowTimerLogo=false ist eine bewusste Abweichung vom
      // Snippet des Zeitnehmers — das Logo doppelt sich mit unserem Footer.
      const rrp = new window.RRRegStart(container, eventId);
      rrp.ShowInfoText = false;
      rrp.ShowTimerLogo = false;
    } catch (err) {
      console.error(err);
      return scheitern('der Aufruf von RRRegStart hat eine Ausnahme geworfen');
    }
    preselectContest(container, distance);
    watchForCompletion(container);
  };
  document.head.appendChild(script);

  // Das Widget kann auch scheitern, ohne dass jemand einen Fehler meldet: Der
  // Loader wartet intern auf zwei Scripts und lässt sein Promise bei einem 404
  // einfach offen. Dann bliebe hier ein leerer Kasten stehen.
  const uhr = setTimeout(() => {
    if (container.children.length > 0) return gerendert();
    scheitern(`nach ${WIDGET_TIMEOUT_MS / 1000} s war das Formular immer noch leer`);
  }, WIDGET_TIMEOUT_MS);
}
