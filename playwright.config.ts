import { defineConfig, devices } from '@playwright/test';

// WICHTIG: 127.0.0.1, nicht localhost.
// Der raceresult-Loader prüft `window.location.origin.indexOf("localhost") < 0`
// und hält jeden localhost-Origin für seine eigene Umgebung. Er sucht seine
// Scripts dann auf UNSEREM Server, bekommt 404 und rendert kommentarlos nichts.
// Über 127.0.0.1 funktioniert alles.
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4321';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60000,

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Mobil zuerst — der Traffic kommt aus der Instagram-Bio.
    //
    // Bewusst Chromium mit iPhone-Viewport statt des `iPhone 13`-Presets: Das
    // Preset zieht WebKit nach, was in CI einen zweiten Browser-Download
    // bedeutet. Was wir hier prüfen — Layout-Überdeckung, horizontaler Scroll,
    // font-size der Felder — sind Computed-Style-Werte und engine-unabhängig.
    // Echtes iOS-Safari-Verhalten (der Auto-Zoom selbst) bleibt der manuelle
    // Check aus der README; ihn kann kein Headless-Browser ersetzen.
    {
      name: 'mobil',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: false, // Chromium erlaubt isMobile nur mit eigenem Gerätemodus
        hasTouch: true,
      },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],

  // Gegen die Live-Seite läuft kein eigener Server.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4321',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
