// Die Navigation ist die einzige Stelle im Seitengerüst mit echter Logik.
// Sie hier zu prüfen ist billiger, als sie in jeder gerenderten Seite zu
// suchen.

import { describe, expect, it } from 'vitest';
import { isActiveHref, isGroup, normalizePath, resolveNav } from '../../src/lib/nav.js';
import { loadSite } from '../../src/data/load.js';
import { siteSchema } from '../../src/data/schema.js';

const site = loadSite();

describe('site.yaml', () => {
  it('erfüllt das Schema', () => {
    expect(() => loadSite()).not.toThrow();
  });

  it('verlangt interne Ziele mit führendem und schließendem Schrägstrich', () => {
    // `/zeitplan` ohne Schrägstrich lädt auf GitHub Pages zwar, aber relative
    // Links auf der Seite brechen dann. Deshalb Schemafehler statt Bauchgefühl.
    const kaputt = { ...site, nav: [{ label: 'Zeitplan', href: '/zeitplan' }] };
    expect(siteSchema.safeParse(kaputt).success).toBe(false);
  });

  it('lehnt eine externe URL als Navigationsziel ab', () => {
    const extern = { ...site, nav: [{ label: 'Verein', href: 'https://trifinish.eu/' }] };
    expect(siteSchema.safeParse(extern).success).toBe(false);
  });

  it('hat eindeutige Ziele über die gesamte Navigation', () => {
    const hrefs = site.nav.flatMap((i) =>
      'href' in i ? [i.href] : i.children.map((c) => c.href),
    );
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('nennt Mail und Instagram als Kontaktwege', () => {
    expect(site.contact.email).toBe('info@ultraschwimmen.de');
    expect(site.contact.instagram.handle).toBe('@ultraschwimmen');
  });
});

describe('normalizePath', () => {
  it('ergänzt fehlende Schrägstriche', () => {
    expect(normalizePath('zeitplan')).toBe('/zeitplan/');
    expect(normalizePath('/zeitplan')).toBe('/zeitplan/');
    expect(normalizePath('/zeitplan/')).toBe('/zeitplan/');
  });

  it('wirft Query und Fragment weg', () => {
    // Der Anmeldetrichter wird über `?regname=` aufgerufen — ohne diesen
    // Schritt wäre der Menüeintrag dort nie markiert.
    expect(normalizePath('/anmeldung/?regname=Sammel-Anmeldung&d=10km')).toBe('/anmeldung/');
    expect(normalizePath('/impressum/#kontakt')).toBe('/impressum/');
  });

  it('vereinheitlicht Groß- und Kleinschreibung', () => {
    expect(normalizePath('/Zeitplan/')).toBe('/zeitplan/');
  });
});

describe('isActiveHref', () => {
  it('markiert die Startseite nur auf der Startseite', () => {
    // `/` ist Präfix von allem. Ohne Sonderfall wäre „Startseite" immer aktiv.
    expect(isActiveHref('/', '/')).toBe(true);
    expect(isActiveHref('/', '/zeitplan/')).toBe(false);
  });

  it('bleibt auf Unterseiten markiert', () => {
    expect(isActiveHref('/aktuelles/', '/aktuelles/')).toBe(true);
    expect(isActiveHref('/aktuelles/', '/aktuelles/2025/')).toBe(true);
  });

  it('verwechselt keine Präfixe zwischen Geschwistern', () => {
    expect(isActiveHref('/strecke/', '/strecken-archiv/')).toBe(false);
  });
});

describe('resolveNav', () => {
  it('markiert die Gruppe, wenn ein Kind aktiv ist', () => {
    const items = resolveNav(site.nav, '/zeitplan/');
    const gruppe = items.find(isGroup);
    expect(gruppe?.isActive).toBe(true);
    expect(gruppe?.children.filter((c) => c.isActive).map((c) => c.href)).toEqual(['/zeitplan/']);
  });

  it('lässt die Gruppe unmarkiert, wenn man außerhalb steht', () => {
    const items = resolveNav(site.nav, '/kontakt/');
    expect(items.find(isGroup)?.isActive).toBe(false);
  });

  it('markiert genau einen Eintrag pro Seite', () => {
    for (const pfad of ['/', '/zeitplan/', '/kontakt/', '/aktuelles/']) {
      const aktiv = resolveNav(site.nav, pfad).flatMap((i) =>
        isGroup(i) ? i.children.filter((c) => c.isActive) : i.isActive ? [i] : [],
      );
      expect(aktiv, `Pfad ${pfad}`).toHaveLength(1);
    }
  });
});
