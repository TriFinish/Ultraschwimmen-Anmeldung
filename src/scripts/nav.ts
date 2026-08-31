// Aufklappmenüs schließen, wenn man woanders hinklickt.
//
// Die Menüs sind native <details> — die Gruppe „Wettkampf" im Kopf und „Mehr"
// in der Daumenleiste. Das ist Absicht: Der Browser bringt Tastaturbedienung,
// aria-expanded und das Auf- und Zuklappen mit, und ohne JavaScript bleiben
// sie bedienbar.
//
// Was er NICHT mitbringt: Ein offenes <details> bleibt offen, bis man wieder
// genau seine Zusammenfassung trifft. Diese Datei ergänzt das erwartete
// Verhalten und sonst nichts. Fällt sie aus, ist die Navigation weiterhin
// vollständig benutzbar — nur etwas umständlicher.

const AUFKLAPPBAR = '.nav-group, .mobilenav-more';

/** Schließt alle offenen Menüs außer dem, in dem gerade etwas passiert ist. */
function schliessen(ausser?: Element | null): void {
  for (const menu of document.querySelectorAll<HTMLDetailsElement>(AUFKLAPPBAR)) {
    if (menu === ausser || !menu.open) continue;

    // Steht der Fokus im Menü, das gleich verschwindet, muss er mit — sonst
    // liegt er auf einem verborgenen Element, und die nächste Tabulatortaste
    // springt an eine unvorhersehbare Stelle.
    if (menu.contains(document.activeElement)) {
      menu.querySelector<HTMLElement>('summary')?.focus();
    }
    menu.open = false;
  }
}

/** Das Menü, zu dem ein Ereignisziel gehört — oder null, wenn es draußen liegt. */
function menuVon(ziel: EventTarget | null): Element | null {
  return ziel instanceof Element ? ziel.closest(AUFKLAPPBAR) : null;
}

export function initNav(): void {
  // `pointerdown` statt `click`: schließt schon beim Aufsetzen des Fingers,
  // nicht erst beim Loslassen. Das fühlt sich unmittelbar an und greift auch,
  // wenn der Klick auf einem Element landet, das selbst nichts tut.
  document.addEventListener('pointerdown', (e) => schliessen(menuVon(e.target)));

  // Wer mit dem Tabulator aus dem Menü herauswandert, ist ebenfalls draußen.
  document.addEventListener('focusin', (e) => schliessen(menuVon(e.target)));

  // Escape schließt alles — die Erwartung an jedes überlagernde Menü.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') schliessen();
  });
}
