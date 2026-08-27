import { getViteConfig } from 'astro/config';

// `getViteConfig` statt des blanken `defineConfig` aus vitest/config: Nur so
// steht Astros Vite-Plugin bereit, und nur damit lässt sich eine
// .astro-Komponente in einem Test importieren und rendern. Ohne das landet die
// Datei untransformiert bei esbuild, und der Fehler lautet dann irreführend
// „invalid JS syntax … name the file with the .jsx extension".
//
// Eigene Datei und nicht bloß ein Eintrag unter `projects`: Vitest startet je
// Projekt einen eigenen Vite-Server, und Plugins aus der Wurzelkonfiguration
// erreichen ihn nicht.
export default getViteConfig({
  // @ts-expect-error `test` gehört Vitest, nicht Vite. Vitest erweitert dafür
  // per Moduleerweiterung Vites `UserConfig` — aber astro/config tippt gegen
  // seine eigene, mitgelieferte Vite-Kopie, die diese Erweiterung nicht sieht.
  // Zur Laufzeit liest Vitest den Schlüssel trotzdem; nur `astro check` stört
  // sich daran. Sollte Astro den Typ eines Tages öffnen, meldet sich diese
  // Zeile von selbst als überflüssig.
  test: {
    name: 'unit',
    // Komponententests laufen bewusst im selben Projekt: Sie sind genauso
    // schnell und offline wie der Rest. Getrennt wird nur, was sich in der
    // Laufzeit unterscheidet — und das ist der Canary.
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.ts'],
    environment: 'happy-dom',
    globals: true,
  },
});
