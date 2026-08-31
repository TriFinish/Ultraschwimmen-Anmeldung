// Die Komponenten aus src/components/content/.
//
// Sie kennen unsere Datentypen — geprüft wird deshalb vor allem, dass sie die
// Daten richtig deuten: Sortierung, Spaltenwahl, externe Ziele.

import { describe, expect, it } from 'vitest';
import { render, texts } from './render';
import DistanceTable from '../../src/components/content/DistanceTable.astro';
import PhotoAlbumGrid from '../../src/components/content/PhotoAlbumGrid.astro';
import ResultYearList from '../../src/components/content/ResultYearList.astro';

const distanzen = [
  { id: '1km', label: '1 km', laps: 1, start: '13:00', price: 15, contest_id: 5 },
  { id: '10km', label: '10 km', laps: 10, start: '09:30', price: 40, contest_id: 7 },
  { id: '4km', label: '4 km', laps: 4, start: '11:00', price: 25, contest_id: 3 },
];

describe('DistanceTable', () => {
  it('sortiert die längste Strecke nach oben — danach wird gesucht', async () => {
    const el = await render(DistanceTable, { distances: distanzen });
    expect(texts(el, 'tbody th')).toEqual(['10 km', '4 km', '1 km']);
  });

  it('zeigt die Meldegebühr nur, wenn sie angefordert wird', async () => {
    const ohne = await render(DistanceTable, { distances: distanzen });
    expect(ohne.textContent).not.toContain('€');

    const mit = await render(DistanceTable, { distances: distanzen, withPrice: true });
    expect(mit.textContent).toContain('40');
    expect(texts(mit, 'thead th')).toContain('Meldegebühr');
  });

  it('behält jede Distanz, egal welche Spalten gewählt sind', async () => {
    const el = await render(DistanceTable, { distances: distanzen, withPrice: true });
    expect(el.querySelectorAll('tbody tr')).toHaveLength(distanzen.length);
  });
});

describe('ResultYearList', () => {
  const years = [
    { year: 2020, url: 'https://example.org/2020' },
    { year: 2025, url: 'https://example.org/2025' },
    { year: 2013, url: 'https://example.org/2013' },
  ];

  it('stellt das jüngste Jahr nach vorn', async () => {
    const el = await render(ResultYearList, { years });
    const jahre = [...el.querySelectorAll('a')].map((a) => a.textContent?.match(/\d{4}/)?.[0]);
    expect(jahre).toEqual(['2025', '2020', '2013']);
  });

  it('öffnet jede Liste beim Zeitnehmer mit noopener', async () => {
    // Die Listen liegen nicht bei uns — darauf besteht auch tests/unit/dist.test.ts.
    const el = await render(ResultYearList, { years });
    const links = [...el.querySelectorAll('a')];
    expect(links).toHaveLength(years.length);
    expect(links.every((a) => a.getAttribute('rel')?.includes('noopener'))).toBe(true);
  });
});

describe('PhotoAlbumGrid', () => {
  const albums = [
    { year: 2021, url: 'https://example.org/2021' },
    { year: 2025, url: 'https://example.org/2025', title: 'Impressionen vom Start' },
  ];

  it('stellt den jüngsten Jahrgang nach vorn', async () => {
    const el = await render(PhotoAlbumGrid, { albums });
    expect(texts(el, 'h2')).toEqual(['2025', '2021']);
  });

  it('öffnet jede Galerie extern mit noopener', async () => {
    const el = await render(PhotoAlbumGrid, { albums });
    const links = [...el.querySelectorAll('a')];
    expect(links).toHaveLength(albums.length);
    expect(links.every((a) => a.getAttribute('rel')?.includes('noopener'))).toBe(true);
  });

  it('nennt ohne eigenen Titel einen sinnvollen Ersatz', async () => {
    const el = await render(PhotoAlbumGrid, { albums });
    expect(el.textContent).toContain('Impressionen vom Start');
    expect(el.textContent).toContain('Bilder vom Wettkampftag');
  });

  it('zeigt bei leerer Liste einen Hinweis statt einer leeren Fläche', async () => {
    const el = await render(PhotoAlbumGrid, { albums: [] });
    expect(el.querySelectorAll('a')).toHaveLength(0);
    expect(el.textContent?.trim()).not.toBe('');
  });

  it('zeigt ohne Titelbild eine Wellenfläche statt eines leeren Kastens', async () => {
    const el = await render(PhotoAlbumGrid, { albums: [albums[0]!] });
    // Dekorativ und damit für die Vorlesehilfe unsichtbar.
    expect(el.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
