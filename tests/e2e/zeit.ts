// Ein Zeitbegriff für die E2E-Tests.
//
// Die Anmeldeseite verhält sich je nach Datum grundlegend anders: Vor dem
// Meldeschluss führt sie durch die Distanzwahl, danach schaltet
// `initPage()` die Distanzwahl bewusst ab, und nach dem Wettkampftag weist sie
// auf die Ergebnisse hin. Ein Test ohne gestellte Uhr prüft deshalb immer nur
// den Zustand, in dem der Kalender gerade zufällig steht — und wird spätestens
// am Tag nach dem Meldeschluss dauerhaft rot.
//
// Die Momente werden aus event.yaml ABGELEITET, nicht hartkodiert. Der
// Wettkampf 2027 braucht damit keine einzige Teständerung: Er verschiebt das
// Datum in der YAML, und die Tests ziehen mit.

import { loadEvent } from '../../src/data/load.js';

const { event } = loadEvent();

const frist = new Date(event.deadline).getTime();
// `date` ist ein reines Datum (2026-08-29). Als UTC-Mitternacht gelesen, dann
// einen Tag weiter — das liegt sicher hinter dem Wettkampftag, egal in welcher
// Zeitzone der Browser des Testlaufs steht.
const eventTag = new Date(`${event.date}T00:00:00Z`).getTime();

const TAG = 24 * 60 * 60 * 1000;

/** Mitten in der Meldephase: Distanzwahl und Countdown sind aktiv. */
export const vorFrist = new Date(frist - 7 * TAG);

/** Kurz nach Meldeschluss: Voranmeldung zu, Nachmeldung am Wettkampftag. */
export const nachFrist = new Date(frist + 60 * 60 * 1000);

/** Der Tag nach dem Wettkampf: Der Ergebnishinweis soll erscheinen. */
export const nachEvent = new Date(eventTag + 1.5 * TAG);
