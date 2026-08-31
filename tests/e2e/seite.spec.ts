// Das Seitengerüst im echten Browser.
//
// Was hier geprüft wird, kann kein Komponententest sehen: dass die Navigation
// auf einem echten Handy-Viewport nicht überläuft, dass das Aufklappmenü ohne
// JavaScript funktioniert und dass die Weiterleitungen der alten
// WordPress-Adressen tatsächlich ankommen.

import { expect, test } from '@playwright/test';
import { nachEvent, vorFrist } from './zeit.js';

const SEITEN = [
  '/',
  '/ausschreibung/',
  '/zeitplan/',
  '/strecke/',
  '/ergebnisse/',
  '/aktuelles/',
  '/fotos/',
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
  // Seit es die Daumenleiste gibt, stehen zwei Navigationen im DOM. Die
  // Selektoren hier zielen deshalb ausdrücklich auf die im Kopf; die mobile
  // hat ihre eigene Gruppe weiter unten.
  const kopfnav = 'nav[aria-label="Hauptnavigation"]';

  test('markiert die aktive Seite', async ({ page }) => {
    await page.goto('/zeitplan/');
    const aktiv = page.locator(`${kopfnav} [aria-current="page"]`);
    await expect(aktiv).toHaveCount(1);
    await expect(aktiv).toHaveAttribute('href', '/zeitplan/');
  });

  test('klappt die Gruppe ohne JavaScript auf', async ({ browser }) => {
    // Ausdrücklich mit abgeschaltetem JavaScript: Das Menü ist ein natives
    // <details> und muss auch dann bedienbar sein, wenn kein Skript lädt.
    //
    // Viewport ausdrücklich breit: Die Kopfnavigation gibt es erst ab 48rem,
    // darunter übernimmt die Daumenleiste — die ihren eigenen Ohne-JavaScript-
    // Test weiter unten hat.
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto('/kontakt/');

    const unterpunkt = page.locator(`${kopfnav} a[href="/ausschreibung/"]`);
    await expect(unterpunkt).toBeHidden();

    await page.locator(`${kopfnav} summary`).click();
    await expect(unterpunkt).toBeVisible();

    await context.close();
  });

  test('führt von der Startseite zur Anmeldung', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Zur Anmeldung/ }).click();
    await expect(page).toHaveURL(/\/anmelden\/$/);
  });
});

test.describe('Ergebnishinweis nach dem Wettkampf', () => {
  test('erscheint am Tag danach und führt zu den Ergebnissen', async ({ page }) => {
    await page.clock.install({ time: nachEvent });
    await page.goto('/zeitplan/');

    const hinweis = page.locator('#ergebnishinweis');
    await expect(hinweis).toBeVisible();
    await expect(hinweis.getByRole('link')).toHaveAttribute('href', '/ergebnisse/');
  });

  test('bleibt auf der Ergebnisseite selbst weg', async ({ page }) => {
    await page.clock.install({ time: nachEvent });
    await page.goto('/ergebnisse/');
    await expect(page.locator('#ergebnishinweis')).toBeHidden();
  });

  test('bleibt nach dem Wegklicken auch über einen Reload weg', async ({ page }) => {
    await page.clock.install({ time: nachEvent });
    await page.goto('/zeitplan/');
    await page.getByRole('button', { name: /Nicht mehr anzeigen/ }).click();
    await expect(page.locator('#ergebnishinweis')).toBeHidden();

    await page.goto('/strecke/');
    await expect(page.locator('#ergebnishinweis')).toBeHidden();
  });

  test('schweigt, solange der Wettkampf noch bevorsteht', async ({ page }) => {
    await page.clock.install({ time: vorFrist });
    await page.goto('/zeitplan/');
    await expect(page.locator('#ergebnishinweis')).toBeHidden();
  });
});

test.describe('Mobile Daumenleiste', () => {
  test('erscheint auf dem Handy und verschwindet auf dem Desktop', async ({ page }, info) => {
    await page.goto('/zeitplan/');
    const leiste = page.locator('nav[aria-label*="mobil" i]');

    if (info.project.name === 'mobil') {
      await expect(leiste).toBeVisible();
      // Die Kopfnavigation weicht ihr — sonst zweimal dasselbe Menü.
      await expect(page.locator('nav[aria-label="Hauptnavigation"]')).toBeHidden();
    } else {
      await expect(leiste).toBeHidden();
    }
  });

  test('verdeckt am Seitenende keinen Inhalt', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobil', 'nur mobil relevant');
    await page.goto('/kontakt/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Genau der Fehler, den die alte Seite mit ihrer Anmelde-Leiste hatte.
    const verdeckt = await page.evaluate(() => {
      const bar = document.querySelector('nav[aria-label*="mobil" i]')!.getBoundingClientRect();
      const fuss = document.querySelector('.footer-copy')!.getBoundingClientRect();
      return fuss.bottom > bar.top;
    });
    expect(verdeckt).toBe(false);
  });

  test('klappt „Mehr" ohne JavaScript auf', async ({ browser }, info) => {
    test.skip(info.project.name !== 'mobil', 'nur mobil relevant');
    // Ein natives <details> funktioniert ohne Skript — genau deshalb ist es eins.
    const kontext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
      baseURL: info.project.use.baseURL,
    });
    const seite = await kontext.newPage();
    await seite.goto('/zeitplan/');

    const sheet = seite.locator('.mobilenav-sheet');
    await expect(sheet).toBeHidden();
    await seite.locator('.mobilenav-more summary').click();
    await expect(sheet).toBeVisible();

    await kontext.close();
  });

  test('gilt auch im Anmeldetrichter — von dort führt ein Weg zurück', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobil', 'nur mobil relevant');
    // Der Trichter lief früher ohne Menü („nicht weiterklicken"). Das war eine
    // Sackgasse für alle, die erst noch den Zeitplan lesen wollten.
    await page.goto('/anmelden/');
    const leiste = page.locator('nav[aria-label*="mobil" i]');
    await expect(leiste).toBeVisible();
    await expect(leiste.getByRole('link', { name: 'Anmeldung' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

test.describe('Alte WordPress-Adressen', () => {
  // Meta-Refresh statt 301 — GitHub Pages kann keine Server-Weiterleitung.
  // Playwright folgt ihm wie ein Browser.
  const UMZUEGE: Array<[string, RegExp]> = [
    ['/anmeldung/', /\/anmelden\/$/],
    ['/fotos-2025-sammlung/', /\/fotos\/$/],
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
  // Ausdrücklich im Inhalt gesucht, nicht in der Navigation: Die 404-Seite
  // soll die Wege selbst anbieten, statt den Besucher auf das Menü zu verweisen.
  await expect(page.locator('main').getByRole('link', { name: 'Anmeldung' })).toBeVisible();
});
