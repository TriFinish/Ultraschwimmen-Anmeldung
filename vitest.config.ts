import { defineConfig } from 'vitest/config';

// Zwei Projekte, weil sie sich grundlegend unterscheiden:
// `unit` läuft offline in Millisekunden und darf bei jedem Speichern laufen.
// `contract` geht ans echte raceresult-Netz, ist langsam und läuft im Cron.
//
// Jedes Projekt hat eine eigene Datei, weil `unit` Astros Vite-Plugin braucht
// (Komponenten rendern) und `contract` nicht. Als Inline-Objekte unter
// `projects` bekämen sie die Plugins der Wurzel nicht mit.
export default defineConfig({
  test: {
    // Testdateien nacheinander: raceresult limitiert auf 1 Request/Sekunde je
    // URL. Gilt auch fürs unit-Projekt, das aber ohnehin nur Millisekunden
    // braucht. `fileParallelism` ist eine Root-Option, keine Projekt-Option.
    fileParallelism: false,
    projects: ['./vitest.unit.config.ts', './vitest.contract.config.ts'],
  },
});
