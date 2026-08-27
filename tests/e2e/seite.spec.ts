// Das Seitengerüst im echten Browser.
//
// Was hier geprüft wird, kann kein Komponententest sehen: dass die Navigation
// auf einem echten Handy-Viewport nicht überläuft, dass das Aufklappmenü ohne
// JavaScript funktioniert und dass die Weiterleitungen der alten
// WordPress-Adressen tatsächlich ankommen.

import { expect, test } from '@playwright/test';

const SEITEN = [
  '/',
  '/ausschreibung/',
  '/zeitplan/',
  '/strecke/',
  '/ergebnisse/',
  '/aktuelles/',
  '/kontakt/',
  '/impressum/',
  '/datenschutz/',
];

test.describe('Seitengerüst', () => {
  for (const pfad of SEITEN) {
    test(`${pfad} hat Kopf, Inhalt und Fuß`, async ({ page }) => {
      await page.goto(pfad);
      await expect(page.locator('header.site-header')).toBeVisible();
      await expect(page.locator('main#inhalt')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
    });
  }

  test('scrollt auf keiner Seite horizontal', async ({ page }) => {
    // Der Fehler, der auf dem Handy am meisten stört und am leichtesten
    // durchrutscht — meist über eine zu breite Tabelle.
    for (const pfad of SEITEN) {
      await page.goto(pfad);
      const ueberlauf = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(ueberlauf, `${pfad} läuft seitlich über`).toBe(false);
    }
  });
});

test.describe('Navigation', () => {
  test('markiert die aktive Seite', async ({ page }) => {
    await page.goto('/zeitplan/');
    const aktiv = page.locator('nav [aria-current="page"]');
    await expect(aktiv).toHaveCount(1);
    await expect(aktiv).toHaveAttribute('href', '/zeitplan/');
  });

  test('klappt die Gruppe ohne JavaScript auf', async ({ browser }) => {
    // Ausdrücklich mit abgeschaltetem JavaScript: Das Menü ist ein natives
    // <details> und muss auch dann bedienbar sein, wenn kein Skript lädt.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/kontakt/');

    const unterpunkt = page.locator('nav a[href="/ausschreibung/"]');
    await expect(unterpunkt).toBeHidden();

    await page.locator('nav summary').click();
    await expect(unterpunkt).toBeVisible();

    await context.close();
  });

  test('führt von der Startseite zur Anmeldung', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Zur Anmeldung/ }).click();
    await expect(page).toHaveURL(/\/anmeldung\/$/);
  });
});

test.describe('Alte WordPress-Adressen', () => {
  // Meta-Refresh statt 301 — GitHub Pages kann keine Server-Weiterleitung.
  // Playwright folgt ihm wie ein Browser.
  const UMZUEGE: Array<[string, RegExp]> = [
    ['/strecken/', /\/strecke\/$/],
    ['/kontaktformular/', /\/kontakt\/$/],
    ['/datenschutzerklaerung/', /\/datenschutz\/$/],
    ['/newsletter/', /\/kontakt\/$/],
    ['/2025/08/30/ergebnisse-2025/', /\/aktuelles\/2025-08-30-ergebnisse-2025\/$/],
    ['/2021/09/15/beitrag-1/', /\/aktuelles\/2021-09-15-orgateam\/$/],
  ];

  for (const [alt, neu] of UMZUEGE) {
    test(`${alt} landet am neuen Ort`, async ({ page }) => {
      await page.goto(alt);
      await page.waitForURL(neu, { timeout: 10000 });
      await expect(page.locator('h1')).toBeVisible();
    });
  }
});

test('unbekannte Adresse zeigt die 404-Seite mit Auswegen', async ({ page }) => {
  const antwort = await page.goto('/gibt-es-nicht/');
  // GitHub Pages liefert 404.html mit Status 404; die Vorschau lokal ebenfalls.
  expect(antwort?.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'Anmeldung' })).toBeVisible();
});
