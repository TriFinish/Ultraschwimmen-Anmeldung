// Lädt anmeldung.yaml zur Build-Zeit und validiert sie gegen das Schema.
// Läuft nie im Browser: Das Ergebnis wird von den .astro-Komponenten in
// statisches HTML gebacken.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORE_SCHEMA, load as parseYaml } from 'js-yaml';
import { anmeldungSchema, type Anmeldung } from './schema.js';

// Bewusst über cwd statt über `import.meta.url`: Unter der happy-dom-Umgebung
// der Unit-Tests ist `import.meta.url` keine `file:`-URL, und fileURLToPath
// wirft. Astro-Build wie Vitest laufen beide im Projektwurzelverzeichnis.
const YAML_PATH = join(process.cwd(), 'src/content/anmeldung.yaml');

export function loadAnmeldung(path: string = YAML_PATH): Anmeldung {
  // CORE_SCHEMA statt Default: Das Default-Schema von js-yaml kennt den
  // YAML-1.1-Typ `timestamp` und macht aus `2026-08-27T23:00:00+02:00`
  // ungefragt ein Date-Objekt. Damit wäre der Zeitzonen-Offset schon
  // verschluckt, bevor das Schema ihn prüfen kann — genau die Zusicherung,
  // auf die sich der Countdown verlässt.
  const raw = parseYaml(readFileSync(path, 'utf8'), { schema: CORE_SCHEMA });
  const result = anmeldungSchema.safeParse(raw);

  if (!result.success) {
    // Bewusst laut und mit Pfadangabe: Ein Datenfehler soll den Build
    // abbrechen, nicht als stille Warnung auf der Live-Seite landen.
    const details = result.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`anmeldung.yaml ist ungültig:\n${details}`);
  }

  return result.data;
}
