// Schema für anmeldung.yaml.
//
// Ersetzt den handgeschriebenen `parseYamlLite` aus der Vorgängerversion. Der
// alte Parser konnte keine Listen in Listen und meldete Datenfehler bestenfalls
// als Konsolen-Warnung im Browser — also erst, wenn die Seite schon live war.
// Hier scheitert stattdessen der Build.

import { z } from 'astro/zod';

// Die Frist wird gegen einen absoluten Zeitpunkt verglichen. Ohne Offset würde
// `new Date()` die Angabe als Ortszeit des Betrachters lesen — jemand in einer
// anderen Zeitzone sähe die Anmeldung zu früh geschlossen. Das war bisher nur
// ein Kommentar in der README; jetzt bricht der Build.
const isoWithOffset = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/,
    'deadline muss ISO-8601 mit Zeitzonen-Offset sein, z. B. 2026-08-27T23:00:00+02:00',
  )
  .refine((v) => !Number.isNaN(Date.parse(v)), 'deadline ist kein gültiges Datum');

export const eventSchema = z.object({
  title: z.string().min(1),
  date: z.coerce.string(),
  date_label: z.string().min(1),
  location: z.string().min(1),
  location_detail: z.string().optional(),
  office_opens: z.string().optional(),
  deadline: isoWithOffset,
  deadline_label: z.string().min(1),
  late_fee: z.number().nonnegative().optional(),
  youth_birth_from: z.coerce.string().optional(),
  youth_birth_to: z.coerce.string().optional(),
  youth_label: z.string().optional(),
});

export const providerSchema = z.object({
  name: z.string().min(1),
  event_id: z.number().int().positive(),
  regname: z.string().min(1),
  // Notausgang, wenn das Widget nicht lädt. Muss absolut sein — ein relativer
  // Link führte im Fehlerfall zurück auf unsere eigene, kaputte Seite.
  url: z.string().url(),
});

export const distanceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  // Die Zuordnung zum raceresult-Formular. Der Canary prüft täglich, dass es
  // diese ID dort noch gibt und sie dasselbe Label trägt.
  contest_id: z.number().int().nonnegative(),
  laps: z.number().int().positive(),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.number().nonnegative(),
  price_youth: z.number().nonnegative().optional(),
});

export const anmeldungSchema = z.object({
  event: eventSchema,
  provider: providerSchema,
  group: z
    .object({
      headline: z.string(),
      text: z.string(),
      note: z.string().optional(),
    })
    .optional(),
  legal: z.object({ processing: z.string().min(1) }).optional(),
  distances: z.array(distanceSchema).min(1),
  faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).default([]),
  footer: z
    .object({
      note: z.string().optional(),
      links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    })
    .optional(),
});

export type Anmeldung = z.infer<typeof anmeldungSchema>;
export type Distance = z.infer<typeof distanceSchema>;
export type EventInfo = z.infer<typeof eventSchema>;
