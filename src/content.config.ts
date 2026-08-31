// Content-Collections.
//
// Nur „Aktuelles" ist eine echte Collection: viele gleichartige Dateien, die
// über einen Glob hereinkommen und einheitliche Frontmatter brauchen. Die
// Ausschreibung ist ein Einzeldokument und wird direkt importiert; event.yaml,
// site.yaml und ergebnisse.yaml laufen über src/data/load.ts, weil sie zur
// Build-Zeit auch außerhalb von Astro gebraucht werden — von den Tests.

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { imageSchema } from './data/schema.js';

const aktuelles = defineCollection({
  loader: glob({ base: './src/content/aktuelles', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(1),
    // Das Veröffentlichungsdatum bestimmt den Permalink. Es zu ändern heißt,
    // die URL zu ändern — deshalb steht es hier und nicht im Dateinamen allein.
    date: z.date(),
    /** Kurzfassung für die Übersicht. Ohne sie steht dort der Anfang des Textes. */
    excerpt: z.string().optional(),
    // Dieselbe Form wie Streckenkarte und Album-Titelbild — deshalb dasselbe
    // Schema. Stand hier bis zur Einführung von Figure.astro ein zweites Mal.
    image: imageSchema.optional(),
  }),
});

export const collections = { aktuelles };
