// Lädt die YAML-Dateien zur Build-Zeit und validiert sie gegen ihr Schema.
// Läuft nie im Browser: Das Ergebnis wird von den .astro-Komponenten in
// statisches HTML gebacken.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORE_SCHEMA, load as parseYaml } from 'js-yaml';
import type { z } from 'astro/zod';
import {
  eventDataSchema,
  photosSchema,
  resultsSchema,
  siteSchema,
  type EventData,
  type Photos,
  type Results,
  type SiteData,
} from './schema.js';

// Bewusst über cwd statt über `import.meta.url`: Unter der happy-dom-Umgebung
// der Unit-Tests ist `import.meta.url` keine `file:`-URL, und fileURLToPath
// wirft. Astro-Build wie Vitest laufen beide im Projektwurzelverzeichnis.
const CONTENT_DIR = join(process.cwd(), 'src/content');

// Gemeinsamer Kern beider Loader. Der Aufrufer bekommt entweder gültige Daten
// oder eine Exception — nie ein halb geparstes Objekt.
function loadYaml<T extends z.ZodTypeAny>(path: string, schema: T, name: string): z.infer<T> {
  // CORE_SCHEMA statt Default: Das Default-Schema von js-yaml kennt den
  // YAML-1.1-Typ `timestamp` und macht aus `2026-08-27T23:00:00+02:00`
  // ungefragt ein Date-Objekt. Damit wäre der Zeitzonen-Offset schon
  // verschluckt, bevor das Schema ihn prüfen kann — genau die Zusicherung,
  // auf die sich der Countdown verlässt.
  const raw = parseYaml(readFileSync(path, 'utf8'), { schema: CORE_SCHEMA });
  const result = schema.safeParse(raw);

  if (!result.success) {
    // Bewusst laut und mit Pfadangabe: Ein Datenfehler soll den Build
    // abbrechen, nicht als stille Warnung auf der Live-Seite landen.
    const details = result.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`${name} ist ungültig:\n${details}`);
  }

  return result.data;
}

export function loadEvent(path: string = join(CONTENT_DIR, 'event.yaml')): EventData {
  return loadYaml(path, eventDataSchema, 'event.yaml');
}

export function loadSite(path: string = join(CONTENT_DIR, 'site.yaml')): SiteData {
  return loadYaml(path, siteSchema, 'site.yaml');
}

export function loadResults(path: string = join(CONTENT_DIR, 'ergebnisse.yaml')): Results {
  return loadYaml(path, resultsSchema, 'ergebnisse.yaml');
}

export function loadPhotos(path: string = join(CONTENT_DIR, 'fotos.yaml')): Photos {
  return loadYaml(path, photosSchema, 'fotos.yaml');
}
