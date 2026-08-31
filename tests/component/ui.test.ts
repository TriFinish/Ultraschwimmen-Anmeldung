// Die Bausteine aus src/components/ui/.
//
// Geprüft wird Bedeutung, nicht Markup (siehe render.ts): Überschriftenebene,
// Linkziel, rel, alt-Text. Klassennamen kommen hier bewusst nicht vor — sonst
// wäre jede Umgestaltung ein Testumbau.

import { describe, expect, it } from 'vitest';
import { render, texts } from './render';
import Card from '../../src/components/ui/Card.astro';
import DataTable from '../../src/components/ui/DataTable.astro';
import Figure from '../../src/components/ui/Figure.astro';
import Section from '../../src/components/ui/Section.astro';
import TileList from '../../src/components/ui/TileList.astro';

const bild = {
  src: '/strecke/kurs.png',
  alt: 'Luftbild des Hafenbeckens mit eingezeichnetem Kurs',
  width: 2138,
  height: 814,
};

describe('Card', () => {
  it('wird ohne href zu keinem Link', async () => {
    const el = await render(Card, {}, { default: 'Inhalt' });
    expect(el.querySelector('a')).toBeNull();
    expect(el.querySelector('article')).not.toBeNull();
  });

  it('macht mit href die ganze Karte klickbar', async () => {
    const el = await render(Card, { href: '/zeitplan/' }, { default: 'Zeitplan' });
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/zeitplan/');
  });

  it('gibt externen Zielen target und rel gemeinsam', async () => {
    const el = await render(Card, { href: 'https://eftas.com/', external: true }, { default: 'x' });
    const a = el.querySelector('a');
    expect(a?.getAttribute('target')).toBe('_blank');
    // Ein target="_blank" ohne noopener gäbe der Zielseite Zugriff auf window.opener.
    expect(a?.getAttribute('rel')).toContain('noopener');
  });

  it('setzt kein target auf interne Ziele', async () => {
    const el = await render(Card, { href: '/strecke/' }, { default: 'x' });
    expect(el.querySelector('a')?.hasAttribute('target')).toBe(false);
  });

  it('lässt leere Bereiche weg, statt leere Hüllen zu rendern', async () => {
    const el = await render(Card, {}, { default: 'nur Inhalt' });
    expect(el.textContent?.trim()).toBe('nur Inhalt');
  });
});

describe('Section', () => {
  it('rendert die Überschrift auf der angeforderten Ebene', async () => {
    const el = await render(Section, { title: 'Strecken', level: 3 }, { default: '<p>x</p>' });
    expect(el.querySelector('h3')?.textContent).toBe('Strecken');
    expect(el.querySelector('h2')).toBeNull();
  });

  it('kommt ohne Titel aus', async () => {
    const el = await render(Section, {}, { default: '<p>x</p>' });
    expect(el.querySelector('h2, h3')).toBeNull();
  });
});

describe('Figure', () => {
  it('übernimmt alt-Text und Maße aus dem Bild', async () => {
    const el = await render(Figure, { image: bild });
    const img = el.querySelector('img');
    expect(img?.getAttribute('alt')).toBe(bild.alt);
    // Feste Maße verhindern, dass die Seite beim Nachladen springt.
    expect(img?.getAttribute('width')).toBe(String(bild.width));
    expect(img?.getAttribute('height')).toBe(String(bild.height));
  });

  it('lädt standardmäßig verzögert, auf Wunsch sofort', async () => {
    const spaet = await render(Figure, { image: bild });
    expect(spaet.querySelector('img')?.getAttribute('loading')).toBe('lazy');

    const frueh = await render(Figure, { image: bild, eager: true });
    expect(frueh.querySelector('img')?.getAttribute('loading')).toBe('eager');
  });

  it('erzeugt ohne Text keine leere Bildunterschrift', async () => {
    const el = await render(Figure, { image: bild });
    expect(el.querySelector('figcaption')).toBeNull();
  });
});

describe('DataTable', () => {
  const columns = ['Strecke', 'Runden', 'Start'];
  const rows = [
    ['10 km', 10, '09:30 Uhr'],
    ['1 km', 1, '13:00 Uhr'],
  ];

  it('macht die erste Zelle jeder Zeile zur Zeilenbeschriftung', async () => {
    // Ohne scope="row" liest ein Screenreader in Zeile zwei nur „1, 13:00 Uhr".
    const el = await render(DataTable, { columns, rows });
    const zeilenkoepfe = [...el.querySelectorAll('tbody th')];
    expect(zeilenkoepfe.map((th) => th.textContent?.trim())).toEqual(['10 km', '1 km']);
    expect(zeilenkoepfe.every((th) => th.getAttribute('scope') === 'row')).toBe(true);
  });

  it('beschriftet jede Spalte mit scope=col', async () => {
    const el = await render(DataTable, { columns, rows });
    expect(texts(el, 'thead th')).toEqual(columns);
    expect([...el.querySelectorAll('thead th')].every((th) => th.getAttribute('scope') === 'col')).toBe(true);
  });

  it('verliert keine Zeile', async () => {
    const el = await render(DataTable, { columns, rows });
    expect(el.querySelectorAll('tbody tr')).toHaveLength(rows.length);
  });
});

describe('TileList', () => {
  const items = [
    { mark: 2025, label: 'Ergebnisliste ansehen', href: 'https://example.org/2025', external: true },
    { label: 'Zeitplan', href: '/zeitplan/' },
  ];

  it('gibt jedem Eintrag genau einen Link', async () => {
    const el = await render(TileList, { items });
    expect(el.querySelectorAll('a')).toHaveLength(items.length);
  });

  it('versieht nur externe Ziele mit target und rel', async () => {
    const el = await render(TileList, { items });
    const [extern, intern] = [...el.querySelectorAll('a')];
    expect(extern?.getAttribute('rel')).toContain('noopener');
    expect(intern?.hasAttribute('target')).toBe(false);
  });

  it('lässt die Marke weg, wenn der Eintrag keine hat', async () => {
    const el = await render(TileList, { items: [{ label: 'Kontakt', href: '/kontakt/' }] });
    expect(el.textContent).toContain('Kontakt');
    expect(el.textContent).not.toMatch(/\d{4}/);
  });
});
