// Beweist, dass die Anmeldeseite wirklich funktioniert — nicht nur, dass der
// Vertrag mit raceresult stimmt.
//
// Die Seite hat drei Zustände, und alle drei werden hier geprüft: Meldephase,
// nach Meldeschluss, nach dem Wettkampf. Die Momente dafür kommen aus zeit.ts
// und leiten sich aus event.yaml ab — siehe dort, warum das keine festen Daten
// sein dürfen.

import { expect, test, type Page } from '@playwright/test';
import { anmeldungOffen } from '../contract/probe.js';
import { nachFrist, vorFrist } from './zeit.js';

const WIDGET = '#divRRRegStart';
const CONTEST = '[name="RRReg_1_0"]';

test.describe('Entscheidungsmodus', () => {
  // Die Distanzwahl existiert nur während der Meldephase: Nach Fristablauf
  // verdrahtet initPage() sie bewusst nicht mehr. Ohne gestellte Uhr prüfte
  // dieser Block also je nach Kalender etwas anderes — oder gar nichts.
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: vorFrist });
  });

  // Angeklickt wird die Karte, nicht das Radiofeld darin: Das Feld ist eine
  // 1px-Fläche unter der Beschriftung — sichtbar für die Tastatur, aber nicht
  // das, worauf ein Mensch zielt.
  const karte = (page: Page, beschriftung: RegExp) =>
    page.locator('label').filter({ has: page.getByRole('radio', { name: beschriftung }) });

  test('zeigt Distanzen und führt zur Anmeldung', async ({ page }) => {
    await page.goto('/anmelden/');

    // Über die Rolle statt über Klassennamen: Die Distanzwahl ist eine echte
    // Radiogruppe, und genau das soll sie bleiben — auch wenn die Karten
    // darum herum irgendwann anders aussehen.
    await expect(page.getByRole('radio')).toHaveCount(7);

    // Die längste Distanz ist hervorgehoben — sonst sähen alle sieben gleich aus.
    await expect(page.getByRole('radio', { name: /Ultra-Distanz/ })).toHaveValue('10km');

    await karte(page, /^\s*6 km/).click();
    await expect(page.getByRole('radio', { name: /^\s*6 km/ })).toBeChecked();
    await expect(page.locator('#cta')).toHaveAttribute('href', /regname=Sammel-Anmeldung&d=6km/);
  });

  test('verdeckt auf dem Handy keinen Inhalt mit der CTA-Leiste', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobil', 'nur mobil relevant');
    await page.goto('/anmelden/');
    await karte(page, /Ultra-Distanz/).click();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Die Leiste lag auf der Vorgängerseite mitten auf den Distanz-Karten.
    // Seit der Trichter das Seitengerüst trägt, stehen unten ZWEI schwebende
    // Leisten übereinander — geprüft wird deshalb gegen die unterste Zeile
    // des Fußbereichs, die beide freilassen müssen.
    const verdeckt = await page.evaluate(() => {
      const cta = document.getElementById('cta-bar')!.getBoundingClientRect();
      const fuss = document.querySelector('.footer-copy')!.getBoundingClientRect();
      return fuss.bottom > cta.top;
    });
    expect(verdeckt).toBe(false);
  });

  test('stapelt Anmelde-Leiste und Daumenleiste, statt sie zu überlagern', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'mobil', 'nur mobil relevant');
    await page.goto('/anmelden/');
    await karte(page, /Ultra-Distanz/).click();

    const ueberlappt = await page.evaluate(() => {
      const cta = document.getElementById('cta-bar')!.getBoundingClientRect();
      const nav = document
        .querySelector('nav[aria-label*="mobil" i]')!
        .getBoundingClientRect();
      return cta.bottom > nav.top;
    });
    expect(ueberlappt).toBe(false);
  });

  test('scrollt nicht horizontal', async ({ page }) => {
    await page.goto('/anmelden/');
    const ueberbreit = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(ueberbreit).toBe(false);
  });
});

test.describe('Nach dem Meldeschluss', () => {
  // Der Zustand, in dem die Seite die meiste Zeit des Jahres steht — und der
  // deshalb genauso beweisbedürftig ist wie die Meldephase.
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: nachFrist });
    await page.goto('/anmelden/');
  });

  test('sagt, dass die Voranmeldung zu ist, und nennt die Nachmeldung', async ({ page }) => {
    const deadline = page.locator('[data-deadline]');
    await expect(deadline).toContainText('Voranmeldung geschlossen');
    await expect(deadline).toContainText('Nachmeldung');
    await expect(deadline).toHaveClass(/is-closed/);
  });

  test('bietet keine Distanzwahl mehr an, die ins Leere führt', async ({ page }) => {
    // Die Karten stehen weiter als Information da; die CTA-Leiste, die zur
    // geschlossenen Anmeldung führen würde, bleibt verborgen.
    await expect(page.locator('#cta-bar')).toBeHidden();
  });

  test('scrollt auch geschlossen nicht horizontal', async ({ page }) => {
    const ueberbreit = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(ueberbreit).toBe(false);
  });
});

test.describe('Formularmodus', () => {
  // Bewusst OHNE gestellte Uhr: Das raceresult-Widget bringt eigene Timeouts
  // mit, die unter gefälschten Timern nie feuern würden.
  let offen = false;
  let grund = '';

  test.beforeAll(async () => {
    ({ offen, grund } = await anmeldungOffen());
  });

  // Diese vier Tests brauchen ein echtes, offenes Formular bei raceresult.
  // Außerhalb der Meldephase gibt es das nicht — dann überspringen sie mit
  // sichtbarer Begründung, statt die Suite monatelang rot zu färben. Den
  // Live-Vertrag bewacht in dieser Zeit der tägliche Canary.
  test.beforeEach(() => {
    test.skip(!offen, grund);
  });

  test('lädt das raceresult-Widget', async ({ page }) => {
    await page.goto('/anmelden/?regname=Sammel-Anmeldung');
    await expect(page.locator(CONTEST)).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#widget-fallback')).toBeHidden();
  });

  test('wählt die Distanz aus der URL vor', async ({ page }) => {
    await page.goto('/anmelden/?regname=Sammel-Anmeldung&d=6km');
    const contest = page.locator(CONTEST);
    await expect(contest).toBeVisible({ timeout: 30000 });
    // contest_id 2 = 6 km. Bricht, wenn raceresult umnummeriert.
    await expect(contest).toHaveValue('2');
    await expect(page.locator('#continuity-text')).toContainText('6 km');
  });

  test('färbt das Formular um — kein Rot des Veranstalters', async ({ page }) => {
    await page.goto('/anmelden/?regname=Sammel-Anmeldung');
    await expect(page.locator(CONTEST)).toBeVisible({ timeout: 30000 });

    const rot = await page.evaluate((sel) => {
      const treffer: string[] = [];
      for (const el of document.querySelectorAll(`${sel} *`)) {
        const cs = getComputedStyle(el);
        for (const prop of ['color', 'backgroundColor', 'borderTopColor'] as const) {
          const m = cs[prop].match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!m) continue;
          const r = Number(m[1]);
          const g = Number(m[2]);
          const b = Number(m[3]);
          if (r > 120 && r > g * 1.9 && r > b * 1.9) treffer.push(`${el.className}: ${cs[prop]}`);
        }
      }
      return [...new Set(treffer)];
    }, WIDGET);

    expect(rot).toEqual([]);
  });

  test('hält Eingabefelder bei mindestens 16px', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobil', 'nur mobil relevant');
    await page.goto('/anmelden/?regname=Sammel-Anmeldung');
    await expect(page.locator(CONTEST)).toBeVisible({ timeout: 30000 });

    // iOS Safari zoomt beim Antippen in jedes Feld unter 16px — und zoomt nicht
    // wieder heraus. raceresult setzt keine Größe, es griff die Browser-Vorgabe
    // von 13,33px.
    const zuKlein = await page.evaluate(
      (sel) =>
        [...document.querySelectorAll(`${sel} input, ${sel} select, ${sel} textarea`)]
          .map((el) => parseFloat(getComputedStyle(el).fontSize))
          .filter((size) => size < 16),
      WIDGET,
    );

    expect(zuKlein).toEqual([]);
  });
});

test('zeigt den Notausgang, wenn raceresult blockiert ist', async ({ page }) => {
  // Adblocker, Netzwerkausfall, raceresult down: Die Anmeldung darf nie in
  // einer leeren Seite enden.
  //
  // Steht außerhalb der Formularmodus-Gruppe, weil er als einziger auch bei
  // geschlossener Anmeldung etwas beweist: Er blockiert raceresult ohnehin.
  await page.route('**://my.raceresult.com/**', (route) => route.abort());
  await page.goto('/anmelden/?regname=Sammel-Anmeldung');

  const fallback = page.locator('#widget-fallback');
  await expect(fallback).toBeVisible({ timeout: 40000 });
  await expect(fallback.locator('a')).toHaveAttribute('href', /my\.raceresult\.com/);
});
