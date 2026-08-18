// Formularmodus: das eingebettete raceresult-Widget.
// Hier steckt alles, was fremdes Markup anfasst — entsprechend defensiv.

import { el, formatEuro } from '../lib/dom.js';
import { track } from '../lib/tracking.js';
import { renderDeadline } from './deadline.js';
import { renderHeader, renderFooter } from './shared.js';

// --- Formularmodus ----------------------------------------------------------
const WIDGET_LOADER = 'https://my.raceresult.com/RRRegStart/load.js.php?lang=de';
const CONTEST_FIELD = '[name="RRReg_1_0"]';

// Hält den Faden zwischen den beiden Modi. Wichtiger als es aussieht: greift die
// Vorwahl unten nicht, sieht der Nutzer hier trotzdem, was er wählen wollte.
function renderContinuity(distance, provider) {
  const node = el('div', 'continuity');
  if (distance) {
    const teile = [distance.label];
    if (distance.price !== undefined) teile.push(formatEuro(distance.price));
    if (distance.start) teile.push(`Start ${distance.start} Uhr`);
    node.appendChild(el('span', 'continuity-text', `Deine Wahl: ${teile.join(' · ')}`));
  } else {
    node.appendChild(el('span', 'continuity-text', 'Wähle deinen Wettbewerb unten im Formular.'));
  }
  const change = el('a', 'continuity-change', distance ? 'ändern' : 'Distanzen ansehen');
  change.href = location.pathname;
  node.appendChild(change);
  return node;
}

// Setzt das Wettbewerbsfeld auf die gewählte Distanz. Das ist ein Griff in
// fremdes Markup: schlägt es fehl, passiert nichts weiter — die
// Kontinuitätsleiste hat den Nutzer bereits informiert.
function preselectContest(container, distance) {
  if (distance?.contest_id === undefined) return;
  const wanted = String(distance.contest_id);
  let done = false;

  const apply = () => {
    if (done) return true;
    const select = container.querySelector(CONTEST_FIELD);
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
// Vorschlagsliste auf, scrollt am Kopf der Seite vorbei und öffnet auf dem
// Handy die Tastatur — bevor jemand überhaupt lesen konnte, wo er ist.
// Unterdrückt wird nur der Fokus, den niemand angefordert hat: sobald der
// Nutzer klickt oder tippt, hält sich das hier komplett raus.
function suppressAutofocus(container) {
  let nutzerAktiv = false;
  const merken = () => {
    nutzerAktiv = true;
  };
  for (const typ of ['pointerdown', 'keydown', 'touchstart']) {
    document.addEventListener(typ, merken, { capture: true, once: true });
  }

  const abwehren = (event) => {
    if (nutzerAktiv) return;
    if (typeof event.target?.blur === 'function') event.target.blur();
  };
  container.addEventListener('focusin', abwehren, true);

  // Nach kurzer Zeit ist das Formular aufgebaut; ab dann gehört der Fokus dem
  // Nutzer, auch wenn er bis dahin nichts angefasst hat.
  setTimeout(() => container.removeEventListener('focusin', abwehren, true), 3000);
}

// Die Bestätigungsseite liegt von Anfang an im DOM und wird nur eingeblendet —
// deshalb Sichtbarkeit prüfen, nicht Existenz.
function watchForCompletion(container) {
  let fired = false;
  const check = () => {
    if (fired) return;
    const confirmation = container.querySelector('.RRReg_Confirmation');
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

// Wie lange auf das Formular gewartet wird, bevor der Notausgang erscheint.
// Großzügig bemessen: ein zu früher Notausgang neben einem gerade doch noch
// erscheinenden Formular ist schlimmer als ein paar Sekunden Warten.
const WIDGET_TIMEOUT_MS = 25000;

function mountWidget(container, provider, distance, onFail, onRendered) {
  let zustand = 'wartet'; // wartet → gerendert | gescheitert

  const scheitern = (grund) => {
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
    if (kamSpaet) {
      console.info('Formular kam verspätet doch noch — Notausgang wird zurückgenommen.');
    }
    onRendered();
  };

  const beobachter = new MutationObserver(() => {
    if (container.children.length > 0) gerendert();
  });
  beobachter.observe(container, { childList: true });

  // Der häufigste Grund fürs stille Nichts beim lokalen Entwickeln — der Loader
  // von raceresult hält jeden Origin mit „localhost“ für seinen eigenen und
  // sucht seine Scripts dann auf unserem Server. Über 127.0.0.1 klappt es.
  if (location.hostname === 'localhost') {
    console.warn(
      'Achtung: raceresult lädt sein Widget nicht über „localhost“. ' +
        'Diese Seite stattdessen über http://127.0.0.1:' +
        (location.port || '80') +
        ' öffnen.',
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
      const rrp = new window.RRRegStart(container, Number(provider.event_id));
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
  // einfach offen. Dann bliebe hier ein leerer Kasten stehen. Also zusätzlich
  // gegen die Uhr prüfen — der Beobachter oben nimmt es zurück, falls das
  // Formular danach doch noch eintrifft.
  const uhr = setTimeout(() => {
    if (container.children.length > 0) return gerendert();
    scheitern(`nach ${WIDGET_TIMEOUT_MS / 1000} s war das Formular immer noch leer`);
  }, WIDGET_TIMEOUT_MS);
}

export function renderFormularmodus(data, params) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const event = data.event ?? {};
  const provider = data.provider ?? {};
  const distance = (data.distances ?? []).find((d) => d.id === params.get('d')) ?? null;

  app.appendChild(renderHeader(event));

  const deadline = renderDeadline(event);
  if (deadline.node) {
    app.appendChild(deadline.node);
    setInterval(deadline.update, 1000);
  }

  app.appendChild(renderContinuity(distance, provider));

  const container = el('div', 'RRRegStart');
  container.id = 'divRRRegStart';
  app.appendChild(container);

  const notausgang = el('div', 'widget-fallback');
  notausgang.hidden = true;
  notausgang.appendChild(
    el('p', null, 'Das Anmeldeformular konnte hier nicht geladen werden.'),
  );
  const link = el('a', 'error-link', 'Anmeldung direkt bei raceresult öffnen');
  link.href = provider.url ?? '#';
  link.rel = 'noopener noreferrer';
  notausgang.appendChild(link);
  app.appendChild(notausgang);

  // Der Hinweis, wer Vertragspartner wird und wer die Daten verarbeitet, stand
  // auf der raceresult-Zwischenseite, die wir überspringen. Eingebettet ist er
  // wichtiger als vorher: In der Adressleiste stand früher `my.raceresult.com`
  // und verriet die Beteiligung Dritter — jetzt läuft alles auf unserer Domain.
  if (data.legal?.processing) {
    const hinweis = el('p', 'legal-note', data.legal.processing);

    // Der Hinweis verweist auf „die Datenschutzbestimmungen des Veranstalters" —
    // die sollten von hier aus auch erreichbar sein. Die URL kommt bewusst aus
    // dem Footer-Eintrag statt aus einem eigenen Feld: eine Quelle, die beim
    // Korrigieren nicht auseinanderlaufen kann.
    const datenschutz = (data.footer?.links ?? []).find((l) => /datenschutz/i.test(l.label ?? ''));
    if (datenschutz?.url) {
      hinweis.appendChild(document.createTextNode(' '));
      const link = el('a', 'legal-link', 'Zur Datenschutzerklärung');
      link.href = datenschutz.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('data-umami-event', 'Datenschutzerklärung geöffnet');
      hinweis.appendChild(link);
    }

    app.appendChild(hinweis);
  }

  if (data.footer) app.appendChild(renderFooter(data.footer));

  track('Formular geöffnet', { distanz: distance?.label ?? 'keine Auswahl' });

  mountWidget(
    container,
    provider,
    distance,
    (grund) => {
      container.hidden = true;
      notausgang.hidden = false;
      track('Formular nicht ladbar', { grund });
    },
    () => {
      container.hidden = false;
      notausgang.hidden = true;
    },
  );
}
