// Umami-Anbindung. Alle Aufrufe sind defensiv: fehlt Umami (Adblocker,
// Offline, Platzhalter-ID), passiert nichts — die Seite läuft weiter.

type EventData = Record<string, unknown> | undefined;

declare global {
  interface Window {
    umami?: { track: (name: string, data?: EventData) => void };
  }
}

// Umami kommt per `defer` von einem fremden Host. `Deadline abgelaufen` feuert
// aber schon beim Rendern und kann das Script überholen. Was noch nicht
// gesendet werden kann, wird gepuffert statt still verworfen.
const pending: Array<[string, EventData]> = [];

function flush(): boolean {
  if (!window.umami?.track) return false;
  while (pending.length) {
    const entry = pending.shift();
    if (!entry) break;
    try {
      window.umami.track(entry[0], entry[1]);
    } catch (err) {
      console.warn('Tracking fehlgeschlagen:', err);
    }
  }
  return true;
}

export function track(name: string, data?: EventData): void {
  pending.push([name, data]);
  flush();
}

// Nach 15 s aufgeben — dann ist Umami blockiert und Warten bringt nichts.
export function startTracking(): void {
  let waited = 0;
  const timer = setInterval(() => {
    waited += 500;
    if (flush() || waited >= 15000) clearInterval(timer);
  }, 500);

  const tag = document.querySelector<HTMLElement>('script[data-website-id]');
  if (tag?.dataset.websiteId?.startsWith('TODO')) {
    console.warn(
      'Umami: Platzhalter-Website-ID aktiv — es wird nichts gemessen. ' +
        'Vor dem Livegang eigene ID für anmelden.ultraschwimmen.de eintragen.',
    );
  }
}
