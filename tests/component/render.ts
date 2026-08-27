// Werkzeug für Komponententests.
//
// `experimental_AstroContainer` rendert eine .astro-Komponente zu einem
// HTML-String, ohne Seite, ohne Server, ohne Browser. Damit lässt sich jede
// Komponente einzeln und mit erfundenen Daten prüfen — was der Grund ist,
// warum die Komponenten ihre Daten als Props bekommen und sich nichts selbst
// laden.
//
// Geprüft wird Bedeutung, nicht Markup: Überschriftenebene, Linkziel,
// aria-current, alt-Text. Klassennamen sind ausdrücklich NICHT Gegenstand der
// Tests — sonst wäre jede Umgestaltung ein Testumbau.
//
// Geparst wird mit dem `document` der happy-dom-Umgebung, die das unit-Projekt
// ohnehin stellt. Eine eigene Parser-Abhängigkeit wäre hier nur Ballast.

import { experimental_AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

/** Rendert eine Komponente und gibt das Ergebnis als abfragbares Element zurück. */
export async function render(
  Component: AstroComponentFactory,
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await experimental_AstroContainer.create();
  const html = await container.renderToString(Component, { props, slots });

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return wrapper;
}

/** Alle Texte einer Auswahl, getrimmt — die häufigste Behauptung im Test. */
export function texts(root: ParentNode, selector: string): string[] {
  return [...root.querySelectorAll(selector)].map((el) => el.textContent?.trim() ?? '');
}
