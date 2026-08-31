// fotos.yaml und ihr Schema.
//
// Der interessante Fall ist die leere Liste: Sie ist der aktuelle Zustand und
// muss gültig sein — anders als bei ergebnisse.yaml, wo ein Jahrgang Pflicht
// ist. Ein erzwungener Mindesteintrag hieße hier, einen zu erfinden.

import { describe, expect, it } from 'vitest';
import { loadPhotos } from '../../src/data/load';
import { photosSchema } from '../../src/data/schema';

const daten = loadPhotos();

describe('fotos.yaml', () => {
  it('erfüllt das Schema', () => {
    expect(() => loadPhotos()).not.toThrow();
  });

  it('erlaubt eine leere Liste — noch ist keine Galerie umgezogen', () => {
    expect(photosSchema.safeParse({ albums: [] }).success).toBe(true);
  });

  it('kommt auch ganz ohne albums-Schlüssel zurecht', () => {
    const ergebnis = photosSchema.safeParse({});
    expect(ergebnis.success).toBe(true);
    expect(ergebnis.success && ergebnis.data.albums).toEqual([]);
  });

  it('hat eindeutige Jahre', () => {
    const jahre = daten.albums.map((a) => a.year);
    expect(new Set(jahre).size).toBe(jahre.length);
  });

  it('lehnt eine relative Galerie-Adresse ab', () => {
    // Die Bilder liegen nicht bei uns — eine relative URL wäre ein toter Link.
    const ergebnis = photosSchema.safeParse({ albums: [{ year: 2025, url: '/fotos/2025/' }] });
    expect(ergebnis.success).toBe(false);
  });

  it('lehnt ein Jahr außerhalb des Plausiblen ab', () => {
    expect(photosSchema.safeParse({ albums: [{ year: 1899, url: 'https://e.org' }] }).success).toBe(
      false,
    );
  });

  it('verlangt zu jedem Titelbild einen alt-Text', () => {
    const ohneAlt = {
      albums: [
        {
          year: 2025,
          url: 'https://example.org/2025',
          cover: { src: '/fotos/x.jpg', width: 10, height: 10 },
        },
      ],
    };
    expect(photosSchema.safeParse(ohneAlt).success).toBe(false);
  });
});
