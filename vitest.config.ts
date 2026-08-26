import { defineConfig } from 'vitest/config';

// Zwei Projekte, weil sie sich grundlegend unterscheiden:
// `unit` läuft offline in Millisekunden und darf bei jedem Speichern laufen.
// `contract` geht ans echte raceresult-Netz, ist langsam und läuft im Cron.
export default defineConfig({
  test: {
    // Testdateien nacheinander: raceresult limitiert auf 1 Request/Sekunde je
    // URL. Gilt auch fürs unit-Projekt, das aber ohnehin nur Millisekunden
    // braucht. `fileParallelism` ist eine Root-Option, keine Projekt-Option.
    fileParallelism: false,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'happy-dom',
          globals: true,
        },
      },
      {
        test: {
          name: 'contract',
          include: ['tests/contract/**/*.test.ts'],
          environment: 'node',
          globals: true,
          // Fremdes Netz plus Retries — der Default von 5 s reicht nicht.
          testTimeout: 45000,
          hookTimeout: 45000,
          retry: 1,
        },
      },
    ],
  },
});
