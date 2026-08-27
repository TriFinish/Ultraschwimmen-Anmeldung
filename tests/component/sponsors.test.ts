// Sponsorenband und Kopfbereich.

import { describe, expect, it } from 'vitest';
import SponsorBand from '../../src/components/layout/SponsorBand.astro';
import SiteHeader from '../../src/components/layout/SiteHeader.astro';
import { render } from './render.js';
import { resolveNav } from '../../src/lib/nav.js';
import { loadSite } from '../../src/data/load.js';

const site = loadSite();

describe('SponsorBand', () => {
  it('beschriftet jedes Logo mit dem Namen des Sponsors', async () => {
    // Auf der alten Seite waren alle Sponsoren ein einziges Bild ohne alt-Text.
    const el = await render(SponsorBand, { sponsors: site.sponsors });
    const alts = [...el.querySelectorAll('img')].map((i) => i.getAttribute('alt'));

    expect(alts).toEqual(site.sponsors?.items.map((s) => s.name));
    expect(alts.every((a) => a && a.length > 0)).toBe(true);
  });

  it('gibt jedem Logo feste Maße, damit beim Laden nichts springt', async () => {
    const el = await render(SponsorBand, { sponsors: site.sponsors });
    for (const img of el.querySelectorAll('img')) {
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    }
  });

  it('nennt die Rolle als Text, nicht als Grafik', async () => {
    const el = await render(SponsorBand, { sponsors: site.sponsors });
    expect(el.textContent).toContain('Hauptsponsor');
  });

  it('kommt ohne url aus, ohne einen toten Link zu erzeugen', async () => {
    const ohneUrl = {
      headline: 'Unterstützt von',
      items: [{ name: 'Ohne Website', logo: '/x.svg', width: 10, height: 10 }],
    };
    const el = await render(SponsorBand, { sponsors: ohneUrl });
    expect(el.querySelectorAll('a')).toHaveLength(0);
    expect(el.querySelectorAll('img')).toHaveLength(1);
  });
});

describe('SiteHeader', () => {
  const props = {
    siteName: site.site.name,
    tagline: site.site.tagline,
    logo: site.site.logo,
    items: resolveNav(site.nav, '/kontakt/'),
  };

  it('verlinkt das Logo zur Startseite', async () => {
    const el = await render(SiteHeader, props);
    expect(el.querySelector('.brand-mark')?.getAttribute('href')).toBe('/');
  });

  it('macht das Logo auf der Startseite zu keinem Link ins Nichts', async () => {
    // Ein Link auf die Seite, auf der man steht, ist eine leere Zusage.
    const el = await render(SiteHeader, { ...props, isHome: true });
    expect(el.querySelector('.brand-mark')?.tagName.toLowerCase()).toBe('span');
  });

  it('lässt das Logo-Bild ohne alt-Text, weil der Name danebensteht', async () => {
    // Sonst liest ein Screenreader „Ultraschwimmen Ultraschwimmen".
    const el = await render(SiteHeader, props);
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(el.textContent).toContain(site.site.name);
  });
});
