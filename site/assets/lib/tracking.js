// Umami-Anbindung. Alle Aufrufe sind defensiv: fehlt Umami (Adblocker,
// Offline, Platzhalter-ID), passiert nichts — die Seite läuft weiter.

// --- Tracking ---------------------------------------------------------------
// Umami kommt per `defer`-Script von einem fremden Host. `Deadline abgelaufen`
// feuert aber schon, sobald die YAML da ist — das kann das Script überholen.
// Deshalb: was noch nicht gesendet werden kann, wird gepuffert und nachgereicht,
// statt still verloren zu gehen.
const pendingEvents = [];

function flushEvents() {
  if (!window.umami?.track) return false;
  while (pendingEvents.length) {
    const [name, data] = pendingEvents.shift();
    try {
      window.umami.track(name, data);
    } catch (err) {
      console.warn('Tracking fehlgeschlagen:', err);
    }
  }
  return true;
}

export function track(name, data) {
  pendingEvents.push([name, data]);
  flushEvents();
}

// Nach spätestens 15 s aufgeben — dann ist Umami blockiert (Adblocker, Offline)
// und weiteres Warten bringt nichts.
(function pollForUmami() {
  let waited = 0;
  const timer = setInterval(() => {
    waited += 500;
    if (flushEvents() || waited >= 15000) clearInterval(timer);
  }, 500);
})();

export function warnIfTrackingUnconfigured() {
  const tag = document.querySelector('script[data-website-id]');
  if (tag && tag.dataset.websiteId.startsWith('TODO')) {
    console.warn(
      'Umami: Platzhalter-Website-ID aktiv — es wird nichts gemessen. ' +
        'Vor dem Livegang eigene ID für anmeldung.ultraschwimmen.de eintragen.',
    );
  }
}
