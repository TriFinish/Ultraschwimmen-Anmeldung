// Was die Navigation im HTML behauptet — nicht wie sie aussieht.

import { describe, expect, it } from 'vitest';
import MainNav from '../../src/components/layout/MainNav.astro';
import MobileNav from '../../src/components/layout/MobileNav.astro';
import SiteFooter from '../../src/components/layout/SiteFooter.astro';
import { render, texts } from './render.js';
import { resolveNav, splitMobileNav } from '../../src/lib/nav.js';
import { loadSite } from '../../src/data/load.js';

const site = loadSite();

describe('MainNav', () => {
  it('zeichnet den aktiven Eintrag mit aria-current aus', async () => {
    const el = await render(MainNav, { items: resolveNav(site.nav, '/zeitplan/') });

    const aktiv = el.querySelectorAll('[aria-current="page"]');
    expect(aktiv).toHaveLength(1);
    expect(aktiv[0]?.getAttribute('href')).toBe('/zeitplan/');
  });

  it('klappt die Gruppe auf, in der man sich befindet', async () => {
    // Sonst müsste man erst suchen, wo man gerade ist.
    const drin = await render(MainNav, { items: resolveNav(site.nav, '/ausschreibung/') });
    expect(drin.querySelector('details')?.hasAttribute('open')).toBe(true);

    const draussen = await render(MainNav, { items: resolveNav(site.nav, '/kontakt/') });
    expect(draussen.querySelector('details')?.hasAttribute('open')).toBe(false);
  });

  it('gibt jedem Ziel aus site.yaml genau einen Link', async () => {
    const el = await render(MainNav, { items: resolveNav(site.nav, '/') });
    const erwartet = site.nav.flatMap((i) =>
      'href' in i ? [i.href] : i.children.map((c) => c.href),
    );
    const gerendert = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(gerendert).toEqual(erwartet);
  });

  it('macht aus der Gruppe keinen Link — sie hat kein Ziel', async () => {
    // Ein <a href="#"> wie auf der alten Seite ist ein Versprechen, das die
    // Seite nicht hält: Der Klick führt nirgendwohin.
    const el = await render(MainNav, { items: resolveNav(site.nav, '/') });
    expect([...el.querySelectorAll('a')].map((a) => a.getAttribute('href'))).not.toContain('#');
    expect(el.querySelector('summary')?.textContent).toContain('Wettkampf');
  });

  it('trägt ein aria-label, damit mehrere Navigationen unterscheidbar sind', async () => {
    const el = await render(MainNav, { items: [], label: 'Fußnavigation' });
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Fußnavigation');
  });
});

describe('SiteFooter', () => {
  it('nennt beide Kontaktwege mit klickbarem Ziel', async () => {
    const el = await render(SiteFooter, { site });
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(hrefs).toContain(`mailto:${site.contact.email}`);
    expect(hrefs).toContain(site.contact.instagram.url);
  });

  it('führt keinen Facebook-Link mehr', async () => {
    const el = await render(SiteFooter, { site });
    expect(el.innerHTML).not.toMatch(/facebook/i);
  });

  it('zeigt die Rechtslinks aus site.yaml', async () => {
    const el = await render(SiteFooter, { site });
    expect(texts(el, '.footer-legal a')).toEqual(site.footer.links.map((l) => l.label));
  });

  it('nimmt das Jahr als Prop, statt heimlich die Uhr zu lesen', async () => {
    // Ein Test, der `new Date()` glaubt, wird am 1. Januar rot.
    const el = await render(SiteFooter, { site, year: 2031 });
    expect(el.textContent).toContain('© 2031');
  });

  it('öffnet nur externe Ziele in einem neuen Tab', async () => {
    const el = await render(SiteFooter, { site });
    for (const a of el.querySelectorAll('a[target="_blank"]')) {
      expect(a.getAttribute('href')).toMatch(/^https?:/);
      // Ohne noopener bekommt die fremde Seite Zugriff auf window.opener.
      expect(a.getAttribute('rel') ?? '').toContain('noopener');
    }
  });
});

describe('MobileNav', () => {
  const nav = (pfad: string) => splitMobileNav(resolveNav(site.nav, pfad), pfad);

  it('führt Start plus die in site.yaml markierten Ziele als Reiter', async () => {
    const { tabs, rest } = nav('/zeitplan/');
    const el = await render(MobileNav, { tabs, rest });

    const reiter = [...el.querySelectorAll('.mobilenav-list > li > a')];
    expect(reiter.map((a) => a.textContent?.trim())).toEqual(['Start', 'Anmeldung', 'Zeitplan', 'Strecke']);
  });

  it('bleibt bei höchstens fünf Feldern — mehr passt auf 390px nicht', async () => {
    const { tabs, rest } = nav('/');
    const el = await render(MobileNav, { tabs, rest });
    expect(el.querySelectorAll('.mobilenav-list > li').length).toBeLessThanOrEqual(5);
  });

  it('macht „Mehr" zu einem <details> und nicht zu einem Link ins Nichts', async () => {
    const { tabs, rest } = nav('/');
    const el = await render(MobileNav, { tabs, rest });
    const mehr = el.querySelector('details');
    expect(mehr).not.toBeNull();
    expect(mehr?.querySelector('summary')?.textContent).toContain('Mehr');
  });

  it('markiert „Mehr", wenn man auf einer Seite dahinter steht', async () => {
    const { tabs, rest } = nav('/kontakt/');
    const el = await render(MobileNav, { tabs, rest });
    expect(el.querySelector('summary')?.getAttribute('data-active')).toBe('true');
  });

  it('klappt dabei nicht von selbst auf — das verdeckte den Inhalt', async () => {
    const { tabs, rest } = nav('/kontakt/');
    const el = await render(MobileNav, { tabs, rest });
    expect(el.querySelector('details')?.hasAttribute('open')).toBe(false);
  });

  it('lässt „Mehr" unmarkiert, wenn der aktive Eintrag ein Reiter ist', async () => {
    const { tabs, rest } = nav('/zeitplan/');
    const el = await render(MobileNav, { tabs, rest });
    expect(el.querySelector('summary')?.hasAttribute('data-active')).toBe(false);
  });

  it('markiert genau einen Ort pro Seite — Reiter oder „Mehr"', async () => {
    for (const pfad of ['/', '/zeitplan/', '/kontakt/', '/fotos/']) {
      const { tabs, rest } = nav(pfad);
      const el = await render(MobileNav, { tabs, rest });
      const reiter = el.querySelectorAll('.mobilenav-list > li > a[aria-current="page"]');
      const mehr = el.querySelectorAll('summary[data-active="true"]');
      expect(reiter.length + mehr.length, `Pfad ${pfad}`).toBe(1);
    }
  });

  it('beschriftet jedes Symbol mit Text und versteckt es vor der Vorlesehilfe', async () => {
    const { tabs, rest } = nav('/');
    const el = await render(MobileNav, { tabs, rest });
    const symbole = [...el.querySelectorAll('svg')];
    expect(symbole.length).toBeGreaterThan(0);
    expect(symbole.every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('trägt ein eigenes aria-label, um von der Kopfnavigation unterscheidbar zu sein', async () => {
    const { tabs, rest } = nav('/');
    const el = await render(MobileNav, { tabs, rest });
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toMatch(/mobil/i);
  });
});
