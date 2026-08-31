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

  it('bleibt auch auf der Startseite ein Link und sagt, dass man dort ist', async () => {
    // Logo oben links führt nach Hause — diese Konvention gilt auch, wenn man
    // schon zu Hause ist. Statt den Link zu entfernen (was ihn unauffindbar
    // macht, sobald man doch woanders landet), wird er als aktuell markiert.
    const el = await render(SiteHeader, { ...props, isHome: true });
    const marke = el.querySelector('.brand-mark');
    expect(marke?.tagName.toLowerCase()).toBe('a');
    expect(marke?.getAttribute('href')).toBe('/');
    expect(marke?.getAttribute('aria-current')).toBe('page');
  });

  it('markiert die Marke außerhalb der Startseite nicht als aktuell', async () => {
    const el = await render(SiteHeader, props);
    expect(el.querySelector('.brand-mark')?.hasAttribute('aria-current')).toBe(false);
  });

  it('zeigt den markierten Hauptsponsor mit Namen als alt-Text', async () => {
    const eftas = site.sponsors?.items.find((s) => s.header);
    expect(eftas, 'site.yaml führt keinen Sponsor mit header: true').toBeDefined();

    const el = await render(SiteHeader, { ...props, sponsor: eftas });
    const logo = el.querySelector('.header-sponsor-logo');
    expect(logo?.getAttribute('alt')).toBe(eftas!.name);
    // Feste Maße: Sonst springt der Kopf, während das Logo nachlädt.
    expect(logo?.getAttribute('width')).toBe(String(eftas!.width));
    expect(logo?.getAttribute('height')).toBe(String(eftas!.height));
  });

  it('öffnet den Sponsor in einem neuen Tab, aber nie ohne noopener', async () => {
    const eftas = site.sponsors?.items.find((s) => s.header);
    const el = await render(SiteHeader, { ...props, sponsor: eftas });
    const link = el.querySelector('.header-sponsor-link');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });

  it('kommt ohne Sponsor aus, ohne eine leere Hülle zu hinterlassen', async () => {
    const el = await render(SiteHeader, props);
    expect(el.querySelector('.header-sponsor')).toBeNull();
  });

  it('lässt das Logo-Bild ohne alt-Text, weil der Name danebensteht', async () => {
    // Sonst liest ein Screenreader „Ultraschwimmen Ultraschwimmen".
    const el = await render(SiteHeader, props);
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(el.textContent).toContain(site.site.name);
  });
});
