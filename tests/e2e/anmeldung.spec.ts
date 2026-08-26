// Beweist, dass die Anmeldeseite wirklich funktioniert — nicht nur, dass der
// Vertrag mit raceresult stimmt. Läuft täglich im Canary gegen die Live-Seite.

import { expect, test } from '@playwright/test';

const WIDGET = '#divRRRegStart';
const CONTEST = '[name="RRReg_1_0"]';

test.describe('Entscheidungsmodus', () => {
  test('zeigt Distanzen und führt zur Anmeldung', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.card')).toHaveCount(7);
    // Die längste Distanz ist der Hero — sonst sähen alle sieben gleich aus.
    await expect(page.locator('.card.is-hero .card-label')).toHaveText('10 km');

    await page.locator('.card', { hasText: '6 km' }).first().click();
    await expect(page.locator('#cta')).toHaveAttribute('href', /regname=Sammel-Anmeldung&d=6km/);
  });

  test('verdeckt auf dem Handy keinen Inhalt mit der CTA-Leiste', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobil', 'nur mobil relevant');
    await page.goto('/');
    await page.locator('.card').first().click();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Die Leiste lag auf der Vorgängerseite mitten auf den Distanz-Karten.
    const verdeckt = await page.evaluate(() => {
      const bar = document.getElementById('cta-bar')!.getBoundingClientRect();
      const foot = document.querySelector('.footer')!.getBoundingClientRect();
      return foot.bottom > bar.top;
    });
    expect(verdeckt).toBe(false);
  });

  test('scrollt nicht horizontal', async ({ page }) => {
    await page.goto('/');
    const ueberbreit = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(ueberbreit).toBe(false);
  });
});

test.describe('Formularmodus', () => {
  test('lädt das raceresult-Widget', async ({ page }) => {
    await page.goto('/?regname=Sammel-Anmeldung');
    await expect(page.locator(CONTEST)).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#widget-fallback')).toBeHidden();
  });

  test('wählt die Distanz aus der URL vor', async ({ page }) => {
    await page.goto('/?regname=Sammel-Anmeldung&d=6km');
    const contest = page.locator(CONTEST);
    await expect(contest).toBeVisible({ timeout: 30000 });
    // contest_id 2 = 6 km. Bricht, wenn raceresult umnummeriert.
    await expect(contest).toHaveValue('2');
    await expect(page.locator('#continuity-text')).toContainText('6 km');
  });

  test('färbt das Formular um — kein Rot des Veranstalters', async ({ page }) => {
    await page.goto('/?regname=Sammel-Anmeldung');
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
    await page.goto('/?regname=Sammel-Anmeldung');
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

  test('zeigt den Notausgang, wenn raceresult blockiert ist', async ({ page }) => {
    // Adblocker, Netzwerkausfall, raceresult down: Die Anmeldung darf nie in
    // einer leeren Seite enden.
    await page.route('**://my.raceresult.com/**', (route) => route.abort());
    await page.goto('/?regname=Sammel-Anmeldung');

    const fallback = page.locator('#widget-fallback');
    await expect(fallback).toBeVisible({ timeout: 40000 });
    await expect(fallback.locator('a')).toHaveAttribute('href', /my\.raceresult\.com/);
  });
});
