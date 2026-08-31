// Die Bausteine des Anmeldetrichters.
//
// Seit er das Seitengerüst trägt, sind das gewöhnliche Komponenten wie alle
// anderen — und werden hier auch so geprüft: über Bedeutung, nicht über
// Klassennamen.

import { describe, expect, it } from 'vitest';
import { render, texts } from './render';
import Card from '../../src/components/ui/Card.astro';
import FaqList from '../../src/components/ui/FaqList.astro';
import NoteBox from '../../src/components/ui/NoteBox.astro';
import StickyCta from '../../src/components/ui/StickyCta.astro';
import DeadlineCountdown from '../../src/components/content/DeadlineCountdown.astro';
import DistanceChooser from '../../src/components/content/DistanceChooser.astro';
import RegistrationWidget from '../../src/components/content/RegistrationWidget.astro';
import { loadEvent } from '../../src/data/load';

const { event, distances, faq, provider } = loadEvent();

describe('Card als Auswahlkarte', () => {
  it('wird zum Label, damit die ganze Karte das Feld darin trifft', async () => {
    const el = await render(Card, { as: 'label' }, { default: '<input type="radio" />' });
    const label = el.querySelector('label');
    expect(label).not.toBeNull();
    // Verschachtelt statt per `for`: So braucht kein Feld eine erfundene ID.
    expect(label?.querySelector('input')).not.toBeNull();
  });

  it('bleibt ohne `as` ein Artikel und wird mit href zum Link', async () => {
    const artikel = await render(Card, {}, { default: 'x' });
    expect(artikel.querySelector('article')).not.toBeNull();

    const link = await render(Card, { as: 'label', href: '/x/' }, { default: 'x' });
    // href gewinnt: Ein Label mit href wäre kein anklickbares Ziel.
    expect(link.querySelector('a')).not.toBeNull();
  });
});

describe('DistanceChooser', () => {
  it('gibt jeder Distanz ein Radiofeld mit ihrer ID als Wert', async () => {
    const el = await render(DistanceChooser, { distances });
    const felder = [...el.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(felder).toHaveLength(distances.length);
    expect(felder.map((f) => f.value).sort()).toEqual(distances.map((d) => d.id).sort());
  });

  it('fasst alle Felder zu einer Gruppe zusammen — sonst wären es Häkchen', async () => {
    const el = await render(DistanceChooser, { distances });
    const namen = new Set(
      [...el.querySelectorAll('input[type="radio"]')].map((f) => f.getAttribute('name')),
    );
    expect(namen.size).toBe(1);
  });

  it('stellt die längste Distanz nach vorn und hebt sie hervor', async () => {
    const el = await render(DistanceChooser, { distances });
    const laengste = distances.reduce((a, b) => (b.laps > a.laps ? b : a));
    const erstes = el.querySelector<HTMLInputElement>('input[type="radio"]');
    expect(erstes?.value).toBe(laengste.id);
    expect(el.textContent).toContain('Ultra-Distanz');
  });

  it('wickelt jedes Feld in sein Label — Klick auf die Karte wählt aus', async () => {
    const el = await render(DistanceChooser, { distances });
    const felder = [...el.querySelectorAll('input[type="radio"]')];
    expect(felder.every((f) => f.closest('label') !== null)).toBe(true);
  });

  it('nennt den Jugendpreis nur, wenn es eine Beschriftung dafür gibt', async () => {
    const ohne = await render(DistanceChooser, { distances });
    expect(ohne.textContent).not.toContain('Jahrgang');

    const mit = await render(DistanceChooser, { distances, youthLabel: 'Jahrgang 2009 bis 2016' });
    expect(mit.textContent).toContain('Jahrgang 2009 bis 2016');
  });
});

describe('DeadlineCountdown', () => {
  it('nennt den Meldeschluss schon im HTML, nicht erst per Skript', async () => {
    // Wer kein JavaScript hat, soll wenigstens das Datum lesen können.
    const el = await render(DeadlineCountdown, { deadlineLabel: event.deadline_label });
    expect(el.textContent).toContain(event.deadline_label);
  });

  it('trägt den Griff, an dem page.ts ansetzt', async () => {
    const el = await render(DeadlineCountdown, { deadlineLabel: event.deadline_label });
    expect(el.querySelector('[data-deadline]')).not.toBeNull();
  });

  it('meldet Änderungen an die Vorlesehilfe — der Wert zählt herunter', async () => {
    const el = await render(DeadlineCountdown, { deadlineLabel: event.deadline_label });
    expect(el.querySelector('[data-deadline]')?.getAttribute('aria-live')).toBe('polite');
  });
});

describe('StickyCta', () => {
  it('startet verborgen — sichtbar wird sie erst, wenn es etwas zu tun gibt', async () => {
    const el = await render(
      StickyCta,
      { href: '?regname=x', label: 'Zur Anmeldung', hidden: true },
      { default: 'Hinweis' },
    );
    expect(el.querySelector('[hidden]')).not.toBeNull();
  });

  it('gibt Link und Hinweiszeile die angeforderten IDs', async () => {
    const el = await render(
      StickyCta,
      { href: '?regname=x', label: 'Zur Anmeldung', linkId: 'cta', hintId: 'cta-hint' },
      { default: 'Hinweis' },
    );
    expect(el.querySelector('#cta')?.getAttribute('href')).toBe('?regname=x');
    expect(el.querySelector('#cta-hint')?.textContent).toContain('Hinweis');
  });
});

describe('FaqList', () => {
  it('macht jede Frage aufklappbar, ohne JavaScript', async () => {
    const el = await render(FaqList, { items: faq });
    const punkte = [...el.querySelectorAll('details')];
    expect(punkte).toHaveLength(faq.length);
    expect(punkte.every((d) => d.querySelector('summary') !== null)).toBe(true);
  });

  it('zeigt Frage und Antwort aus den Daten', async () => {
    const el = await render(FaqList, { items: [{ q: 'Geht Neopren?', a: 'Ja, freigestellt.' }] });
    expect(texts(el, 'summary')).toEqual(['Geht Neopren?']);
    expect(el.textContent).toContain('Ja, freigestellt.');
  });

  it('startet zugeklappt — sieben offene Antworten sind keine Übersicht', async () => {
    const el = await render(FaqList, { items: faq });
    expect([...el.querySelectorAll('details')].some((d) => d.hasAttribute('open'))).toBe(false);
  });
});

describe('NoteBox', () => {
  it('rendert die Überschrift auf der angeforderten Ebene', async () => {
    const el = await render(NoteBox, { title: 'Sammelanmeldung', level: 3 }, { default: '<p>x</p>' });
    expect(el.querySelector('h3')?.textContent).toBe('Sammelanmeldung');
  });

  it('lässt Bereiche weg, die nicht gefüllt sind', async () => {
    const el = await render(NoteBox, {}, { default: '<p>nur Text</p>' });
    expect(el.querySelector('h2, h3')).toBeNull();
    expect(el.textContent?.trim()).toBe('nur Text');
  });
});

describe('RegistrationWidget', () => {
  const props = {
    fallbackUrl: provider.url,
    backHref: '/anmelden/',
    legalNote: 'Der Veranstalter wird Vertragspartner.',
    privacyHref: '/datenschutz/',
  };

  it('hält den Container bereit, in den raceresult rendert', async () => {
    // Die ID gibt raceresult vor — sie darf sich nicht ändern.
    const el = await render(RegistrationWidget, props);
    expect(el.querySelector('#divRRRegStart')).not.toBeNull();
  });

  it('hält den Notausgang verborgen bereit, statt ihn erst zu bauen', async () => {
    const el = await render(RegistrationWidget, props);
    const notausgang = el.querySelector('#widget-fallback');
    expect(notausgang?.hasAttribute('hidden')).toBe(true);
    expect(notausgang?.querySelector('a')?.getAttribute('href')).toBe(provider.url);
  });

  it('führt zurück zur Distanzwahl', async () => {
    const el = await render(RegistrationWidget, props);
    expect(el.querySelector('.continuity a')?.getAttribute('href')).toBe('/anmelden/');
  });

  it('nennt den Verarbeitungshinweis samt Weg zur Datenschutzerklärung', async () => {
    const el = await render(RegistrationWidget, props);
    expect(el.textContent).toContain('Der Veranstalter wird Vertragspartner.');
    expect(el.querySelector('a[href="/datenschutz/"]')).not.toBeNull();
  });

  it('kommt ohne Rechtshinweis aus, ohne einen leeren Absatz zu hinterlassen', async () => {
    const el = await render(RegistrationWidget, { ...props, legalNote: undefined });
    expect(el.querySelector('.legal-note')).toBeNull();
  });
});
