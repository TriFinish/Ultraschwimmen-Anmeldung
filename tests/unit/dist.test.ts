// Prüft das gebaute Ergebnis, nicht die Quelle.
//
// Die Fehler, um die es hier geht, sind auf der alten WordPress-Seite alle
// wirklich passiert und keinem aufgefallen:
//   — Das Briefumschlag-Symbol im Kopf zeigte auf /kontakt/, eine Weiterleitung.
//   — Die Ausschreibung verlinkte raceresult-Event 275289, den Wettkampf 2024,
//     während die Startseite 383076 verlinkte.
//   — Kein einziges Bild hatte einen alt-Text.
// Solche Fehler findet kein Komponententest, weil sie erst im Zusammenspiel
// aller Seiten entstehen. Deshalb läuft dieser Test über dist/.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadEvent } from '../../src/data/load.js';

const DIST = join(process.cwd(), 'dist');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const gebaut = existsSync(DIST);
const dateien = gebaut ? walk(DIST) : [];
const seiten = dateien.filter((f) => f.endsWith('.html'));

// Astro legt für jeden Eintrag unter `redirects` eine Weiterleitungsseite ab.
// Die ist kein Inhalt: Sie hat keinen Fließtext, keine Beschreibung, und ihr
// canonical-Link zeigt absichtlich absolut auf das neue Ziel. Für die
// inhaltlichen Prüfungen bleibt sie deshalb außen vor — geprüft wird
// stattdessen, dass ihr Ziel existiert.
const istWeiterleitung = (f: string): boolean =>
  /<meta[^>]+http-equiv="refresh"/i.test(readFileSync(f, 'utf8'));

const weiterleitungen = seiten.filter(istWeiterleitung);
const inhaltsseiten = seiten.filter((f) => !istWeiterleitung(f));

/**
 * Löst ein internes Ziel auf die Datei auf, die es ausliefern würde.
 * `/zeitplan/` → dist/zeitplan/index.html, `/logo.svg` → dist/logo.svg.
 */
function zielDatei(href: string): string {
  const pfad = href.split(/[?#]/)[0] ?? '';
  const ohneSlash = pfad.replace(/^\//, '');
  const kandidat = join(DIST, ohneSlash);
  if (existsSync(kandidat) && statSync(kandidat).isFile()) return kandidat;
  return join(kandidat, 'index.html');
}

// Ohne dist/ ist hier nichts zu prüfen. Bewusst überspringen statt scheitern:
// Im Entwickleralltag läuft `npm run test:unit` auch mal ohne vorherigen Build.
// In CI läuft `npm run verify`, das erst baut — dort greift der Test immer.
const wenn = gebaut ? describe : describe.skip;

if (!gebaut) {
  console.warn('dist/ fehlt — Build-Integritätstests übersprungen. Vorher `npm run build`.');
}

wenn('gebaute Seiten', () => {
  it('hat überhaupt Seiten gebaut', () => {
    expect(seiten.length).toBeGreaterThan(0);
  });

  it('gibt jeder Seite Titel und Beschreibung', () => {
    // Ohne beides steht in Suchergebnis und geteiltem Link nur die URL.
    const ohne = inhaltsseiten.filter((f) => {
      const html = readFileSync(f, 'utf8');
      return !/<title>[^<]+<\/title>/.test(html) || !/name="description" content="[^"]+"/.test(html);
    });
    expect(ohne.map((f) => relative(DIST, f))).toEqual([]);
  });

  it('gibt jedem Bild einen alt-Text', () => {
    // `alt=""` ist erlaubt und richtig für rein dekorative Bilder — fehlendes
    // alt ist es nie. Auf der alten Seite fehlte es überall.
    const fehlend: string[] = [];
    for (const f of inhaltsseiten) {
      for (const tag of readFileSync(f, 'utf8').match(/<img\b[^>]*>/g) ?? []) {
        if (!/\balt=/.test(tag)) fehlend.push(`${relative(DIST, f)}: ${tag.slice(0, 70)}`);
      }
    }
    expect(fehlend).toEqual([]);
  });

  it('löst jeden internen Link auf eine gebaute Datei auf', () => {
    const tot: string[] = [];
    for (const f of seiten) {
      const html = readFileSync(f, 'utf8');
      for (const [, href] of html.matchAll(/\bhref="(\/[^"]*)"/g)) {
        if (!href || href.startsWith('//')) continue;
        if (!existsSync(zielDatei(href))) tot.push(`${relative(DIST, f)} → ${href}`);
      }
    }
    expect(tot).toEqual([]);
  });

  it('verlinkt kein fremdes Ziel ohne noopener', () => {
    const unsicher: string[] = [];
    for (const f of seiten) {
      for (const tag of readFileSync(f, 'utf8').match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? []) {
        if (!/\brel="[^"]*noopener/.test(tag)) unsicher.push(`${relative(DIST, f)}: ${tag.slice(0, 70)}`);
      }
    }
    expect(unsicher).toEqual([]);
  });

  it('meldet überall dasselbe raceresult-Event an wie event.yaml', () => {
    // Genau der Fehler der alten Seite: Die Ausschreibung verlinkte zur
    // Anmeldung für Event 275289 — den Wettkampf des Vorjahres.
    //
    // Nur Anmelde-URLs, nicht jede raceresult-Adresse: Die Ergebnisseite
    // verlinkt zu Recht die Events vergangener Jahre.
    const { provider } = loadEvent();
    const falsch: string[] = [];
    for (const f of seiten) {
      for (const [, id] of readFileSync(f, 'utf8').matchAll(
        /raceresult\.com\/(\d+)\/registration/g,
      )) {
        if (Number(id) !== provider.event_id) falsch.push(`${relative(DIST, f)}: ${id}`);
      }
    }
    expect(falsch).toEqual([]);
  });

  it('hat für jede alte WordPress-Adresse eine Weiterleitung gebaut', () => {
    // Die Liste in astro.config.mjs stammt aus wp-sitemap-posts-page-1.xml und
    // -post-1.xml. Bleibt sie leer, wäre der Umzug für alle Lesezeichen und
    // Suchtreffer ein Totalverlust.
    expect(weiterleitungen.length).toBeGreaterThanOrEqual(11);
  });

  it('führt jede Weiterleitung auf eine Seite, die es gibt', () => {
    const insLeere: string[] = [];
    for (const f of weiterleitungen) {
      const ziel = readFileSync(f, 'utf8').match(/url=([^"']+)["']/i)?.[1];
      if (!ziel) {
        insLeere.push(`${relative(DIST, f)}: kein Ziel`);
        continue;
      }
      // Astro schreibt das Ziel absolut; für den Dateivergleich zählt der Pfad.
      const pfad = ziel.startsWith('http') ? new URL(ziel).pathname : ziel;
      if (!existsSync(zielDatei(pfad))) insLeere.push(`${relative(DIST, f)} → ${ziel}`);
    }
    expect(insLeere).toEqual([]);
  });

  it('lässt die Seite nirgends auf ultraschwimmen.de zurückverweisen', () => {
    // Nach dem Umzug ist diese Seite ultraschwimmen.de. Ein absoluter Link auf
    // die eigene Domain ist ein Überbleibsel aus der WordPress-Zeit und würde
    // den Besucher im schlimmsten Fall zur alten Installation schicken.
    const rest: string[] = [];
    for (const f of inhaltsseiten) {
      for (const [, url] of readFileSync(f, 'utf8').matchAll(
        /\bhref="(https?:\/\/(?:www\.)?ultraschwimmen\.de[^"]*)"/g,
      )) {
        rest.push(`${relative(DIST, f)} → ${url}`);
      }
    }
    expect(rest).toEqual([]);
  });
});
