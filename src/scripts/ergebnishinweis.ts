// Der Hinweis auf die Ergebnisse, nachdem der Wettkampf gelaufen ist.
//
// Die Entscheidung „anzeigen oder nicht" steht bewusst als reine Funktion
// getrennt vom DOM: Sie hängt an Datum, Pfad und einer gemerkten Wegklick-
// Entscheidung, und genau diese Kombinationen lassen sich nur dann prüfen,
// ohne eine Seite zu bauen und die Uhr zu stellen.

export interface HinweisLage {
  /** Jetzt — als Zeitstempel, damit Tests ihn stellen können. */
  jetzt: number;
  /** Wettkampftag aus event.yaml, Form „2026-08-29". */
  eventDatum: string;
  /** Aktueller Pfad, normalisiert mit Schrägstrichen. */
  pfad: string;
  /** Hat der Besucher den Hinweis in diesem Jahr schon weggeklickt? */
  weggeklickt: boolean;
}

/**
 * Sichtbar ab dem Tag NACH dem Wettkampf bis zum Jahresende.
 *
 * Nicht schon am Wettkampftag: Da ist der Hinweis falsch — es schwimmt noch
 * jemand. Und nicht ins nächste Jahr hinein: Dann steht der nächste Wettkampf
 * an, und ein Hinweis auf die Ergebnisse des letzten wäre im Weg.
 */
export function sollHinweisZeigen({ jetzt, eventDatum, pfad, weggeklickt }: HinweisLage): boolean {
  if (weggeklickt) return false;

  // Auf der Ergebnisseite selbst wäre der Hinweis ein Link auf die Seite, auf
  // der man steht.
  if (pfad.startsWith('/ergebnisse')) return false;

  const event = new Date(`${eventDatum}T00:00:00Z`);
  if (Number.isNaN(event.getTime())) return false;

  const TAG = 24 * 60 * 60 * 1000;
  // Ende des Wettkampftags, nicht sein Beginn.
  const ab = event.getTime() + TAG;
  const bis = Date.UTC(event.getUTCFullYear() + 1, 0, 1);

  return jetzt >= ab && jetzt < bis;
}

/** Schlüssel mit Jahr: Wegklicken gilt für diesen Wettkampf, nicht für immer. */
export function speicherSchluessel(eventDatum: string): string {
  return `us-ergebnishinweis-${eventDatum.slice(0, 4)}`;
}

// Privater Modus und abgeschaltete Website-Daten lassen den Zugriff werfen —
// nicht nur `null` liefern. Ohne try/catch stürbe hier das ganze Skript.
function gemerkt(schluessel: string): boolean {
  try {
    return localStorage.getItem(schluessel) === '1';
  } catch {
    return false;
  }
}

function merken(schluessel: string): void {
  try {
    localStorage.setItem(schluessel, '1');
  } catch {
    // Kein Speicher, kein Drama: Der Hinweis kommt beim nächsten Aufruf wieder.
  }
}

export function initErgebnishinweis(): void {
  const box = document.getElementById('ergebnishinweis');
  const eventDatum = box?.dataset.eventDate;
  if (!box || !eventDatum) return;

  const schluessel = speicherSchluessel(eventDatum);

  const sichtbar = sollHinweisZeigen({
    jetzt: Date.now(),
    eventDatum,
    pfad: location.pathname,
    weggeklickt: gemerkt(schluessel),
  });

  if (!sichtbar) return;

  // Serverseitig steht `hidden` im Markup: So blitzt der Hinweis nie auf, und
  // das ausgelieferte HTML bleibt für alle Besucher identisch und cachebar.
  box.hidden = false;

  box.querySelector('[data-schliessen]')?.addEventListener('click', () => {
    box.hidden = true;
    merken(schluessel);
  });
}
