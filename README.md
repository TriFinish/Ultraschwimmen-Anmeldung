# Ultraschwimmen

Die Website des Ultraschwimmens unter **`ultraschwimmen.de`** — sie löst die
WordPress-Installation ab und enthält den Anmeldetrichter als eine ihrer Seiten.

Astro + TypeScript, statischer Output, kein Backend, keine eigene Zahlung:
Vertragspartner bleibt der Verein, das Startgeld zieht tollense-timing ein.

Unter **`/anmelden/`** läuft der **gesamte** Anmeldevorgang — Distanzwahl,
Formular, Bezahlung, Buchung. Das raceresult-Formular ist als JavaScript-Widget
eingebettet und in unser blaues Theme umgefärbt; der Nutzer wechselt nie die
Domain. Diese Seite ist die einzige **ohne** Menü: Wer dort ist, soll sich
anmelden und nicht weiterklicken.

## Woher die Inhalte kommen

Alles Inhaltliche steht in `src/content/` und wird beim Build gegen ein
Zod-Schema geprüft — ein Datenfehler bricht den Build, statt als
Konsolen-Warnung auf der Live-Seite zu landen.

| Datei | Enthält | Ändert sich |
|---|---|---|
| `event.yaml` | Termin, Ort, Strecke, Distanzen, Preise, Frist, FAQ | jedes Jahr |
| `site.yaml` | Navigation, Kontakt, Verein, Sponsoren, Fußzeile | selten |
| `ergebnisse.yaml` | Ergebnislisten der Vorjahre | einmal im Jahr |
| `fotos.yaml` | Bildergalerien nach Jahrgang (darf leer sein) | einmal im Jahr |
| `ausschreibung.md` | die Ausschreibung als Fließtext | jedes Jahr |
| `aktuelles/*.md` | Meldungen, eine Datei je Beitrag | laufend |

**`event.yaml` ist die einzige Quelle für Termin, Preise und Startzeiten.**
Startseite, Zeitplan, Strecke und Anmeldung rendern daraus — auf der alten
Seite standen dieselben Zahlen auf vier Seiten und wichen voneinander ab.

Die Ausschreibung ist bewusst Fließtext und keine erzeugte Tabelle: Sie ist ein
formales Dokument mit eigenem Stand-Datum und verlinkt die Anmeldung nicht.
Damit sie trotzdem nicht driftet, prüft
[`tests/unit/ausschreibung.test.ts`](tests/unit/ausschreibung.test.ts) jede dort
genannte Zahl gegen `event.yaml`.

## Warum es den Canary gibt

Tollense Timing hat die Einbettung erlaubt — mit einer Einschränkung
(Mail vom 26.08.2026):

> „Wir haben damit an sich kein Problem, weisen euch aber darauf hin das wir für
> Probleme in der Anmeldung dann nicht mehr primär verantwortlich sind —
> RaceResult ändert hier gerne und oft was im Hintergrund, wenn dies dann eure
> Anmeldung beeinträchtigt bekommen wir es mitunter nicht proaktiv mit."

Das Betriebsrisiko liegt damit bei uns. Die Seite greift an drei Stellen in
fremdes Markup — Wettbewerbs-Vorwahl, Abschluss-Tracking, CSS-Theming — und
würde bei einer stillen raceresult-Änderung **kommentarlos** brechen.
Deshalb läuft täglich [`canary.yml`](.github/workflows/canary.yml).

**Diese Griffe sind alternativlos, nicht bequem.** Nachgeprüft im ausgelieferten
Bundle: Das Widget liest aus der URL nur `n`, `k`, `regname` und `test` — einen
Deep-Link für den Wettbewerb gibt es nicht. Und es feuert weder `CustomEvent`
noch Callback bei Abschluss. Die offizielle Doku dokumentiert lediglich zwei
Konstruktor-Argumente und `ShowInfoText`; **keine** CSS-Klasse des Formulars,
keinen URL-Parameter, keinen Callback.

## Die Ladekette

Wichtig zu verstehen, bevor jemand am Widget-Code etwas ändert:

```
my.raceresult.com/RRRegStart/load.js.php      v2.0.221 (hartkodiert)
  └─ RRRegStart.js?v=v2.0.221 + lang.js       äußere Hülle, Login/Auswahl
       └─ events2.../registrations/init.js    ⚠ UNVERSIONIERT
            ├─ registration.css?build=v14.0.19-10   erzeugt unsere Klassen
            ├─ registration.js ?build=v14.0.19-10   erzeugt unser Markup
            └─ RRReg(div.RRReg, …)            ← Ziel unseres CSS
```

Die dritte Stufe ist das Scharnier: `init.js` trägt **keine Version**, wird
24 h gecacht und hat als ETag nur einen Zeitstempel. Dort kann sich unsere
Integration ohne Vorwarnung ändern — deshalb überwacht der Canary die
`build=`-Version daraus, nicht die `v2.0.221` der äußeren Hülle.

## Die zwei Modi

Beide Modi stehen im ausgelieferten HTML; `?regname=` in der URL entscheidet,
welcher bleibt. Das raceresult-Script lädt **nur** im Formularmodus.

| URL | Modus |
|---|---|
| `/` | Entscheidung — Distanzen, Preise, Frist, FAQ |
| `/?regname=Sammel-Anmeldung` | Formular — das eingebettete Widget |
| `/?regname=Sammel-Anmeldung&d=6km` | Formular, Wettbewerb „6 km" vorgewählt |

## Wo liegt was?

| Bereich | Datei |
|---|---|
| Inhalte | [`src/content/`](src/content/) — siehe Tabelle oben |
| Schema + Validierung | [`src/data/schema.ts`](src/data/schema.ts), [`load.ts`](src/data/load.ts) |
| Reine Logik (testbar ohne Rendern) | [`src/lib/`](src/lib/) — Navigation, Zeitplan, Preise, Datum |
| Seitengerüst | [`src/layouts/Page.astro`](src/layouts/Page.astro), [`components/layout/`](src/components/layout/) |
| Bausteine | [`src/components/`](src/components/README.md) — `ui/` kennt keine Daten, `content/` kennt unsere Typen |
| Anmeldetrichter | [`src/pages/anmelden.astro`](src/pages/anmelden.astro) — liegt direkt auf `Base.astro`, ohne Menü |
| Widget-Anbindung | [`src/scripts/widget.ts`](src/scripts/widget.ts) |
| Client-Logik des Trichters | [`src/scripts/page.ts`](src/scripts/page.ts) |
| Design des Trichters | [`src/styles/app.css`](src/styles/app.css) — enthält auch die Tokens |
| Design der Inhaltsseiten | in den Komponenten (gescopet); global nur Gerüst und Tokens in [`site.css`](src/styles/site.css) / [`app.css`](src/styles/app.css) |
| Widget-Theming | [`src/styles/widget.css`](src/styles/widget.css) |
| Weiterleitungen alter Adressen | [`astro.config.mjs`](astro.config.mjs) |
| Canary | [`tests/contract/`](tests/contract/), [`canary.yml`](.github/workflows/canary.yml) |
| Deployment | [`deploy.yml`](.github/workflows/deploy.yml) → GitHub Pages |
| Anmeldeformular | raceresult, Event `383076`, Formular `Sammel-Anmeldung` |

### Wie eine Komponente gebaut ist

**Die sechs Regeln der Komponentenbibliothek stehen in
[`src/components/README.md`](src/components/README.md).** Die wichtigste davon:

**Komponenten holen sich nichts selbst — sie bekommen alles als Props.**
`loadEvent()` und `getCollection()` rufen ausschließlich Seiten und
`Page.astro` auf. Genau deshalb lässt sich jede Komponente in
[`tests/component/`](tests/component/) einzeln mit erfundenen Daten rendern.

Echte Logik gehört nach `src/lib/` und nicht in den Frontmatter einer
`.astro`-Datei: Welcher Menüpunkt aktiv ist, wie der Zeitplan gruppiert wird,
wie die Preistabelle sortiert — das sind gewöhnliche Funktionen mit
gewöhnlichen Tests.

## Entwickeln

```bash
npm install
npm run dev          # http://127.0.0.1:4321
```

**Nicht `localhost` verwenden.** Der raceresult-Loader prüft
`window.location.origin.indexOf("localhost") < 0` und hält jeden
localhost-Origin für seine eigene Umgebung. Er sucht seine Scripts dann auf
*unserem* Server, bekommt 404 und rendert **kommentarlos nichts**.

## Tests

```bash
npm run test:unit        # offline, < 2 s — Schema, Logik, Komponenten
npm run build            # astro check && astro build
npm run verify           # build + test:unit — das ist der Lauf, der zählt
npm run test:contract    # gegen die echte raceresult-API (Canary)
npm run test:e2e         # Playwright, mobil + Desktop
npm run canary:update    # Baselines bewusst neu setzen
```

Vier Schichten, jede für eine Sorte Fehler:

| Schicht | Prüft |
|---|---|
| `tests/unit/` | Schema, `src/lib/`, Formatierung, Ausschreibungs-Drift |
| `tests/component/` | jede Komponente einzeln gerendert — **Bedeutung, nicht Klassennamen** |
| `tests/unit/dist.test.ts` | das gebaute `dist/`: tote interne Links, fehlende `alt`, falsches raceresult-Event, Weiterleitungen |
| `tests/e2e/` | echter Browser: Menü ohne JavaScript, kein seitlicher Überlauf, 404, Trichter |

`dist.test.ts` läuft nur, wenn `dist/` existiert — deshalb `npm run verify`
statt `npm run test:unit` allein. Im Deployment läuft er zwischen Build und
Veröffentlichung; was er findet, geht nicht live.

Komponententests nutzen `experimental_AstroContainer`. Sie behaupten nie etwas
über Klassennamen, sondern über Überschriftenebenen, Linkziele, `alt`-Texte und
`aria-current` — sonst wäre jede Umgestaltung ein Testumbau.

### Was der Canary prüft

Zwei Schichten, weil sie **unterschiedliche Reaktionen** verlangen:

| Schicht | Label | Bedeutung |
|---|---|---|
| Produkt | `canary:product` | raceresult hat deployed. Niemand sagt uns Bescheid — `widget.css` und `widget.ts` gegenprüfen |
| Veranstalter | `canary:event` | Tollense hat das Event bearbeitet. Kein Notfall: nachfragen, YAML angleichen, `npm run canary:update` |
| — | `canary:unreachable` | Netzwerkausfall. **Kein** Vertragsbruch; erst bei mehreren Tagen nachhaken |

Baselines liegen in [`tests/contract/__snapshots__/`](tests/contract/__snapshots__/),
damit eine Änderung im PR-Diff sichtbar wird statt nur im Actions-Log.
Der Job öffnet bzw. aktualisiert **ein** Issue (dedupliziert über den Titel) und
schließt es automatisch, sobald der Lauf wieder grün ist.

### Fristende testen

Die Seite schaltet nach `event.deadline` auf „Voranmeldung geschlossen". Zum
Prüfen die Systemzeit vortäuschen, statt die YAML zu verbiegen — in der
DevTools-Konsole vor dem Laden:

```js
const F = new Date('2026-08-28T10:00:00+02:00').getTime(), O = Date, d = F - O.now();
Date = class extends O {
  constructor(...a) { a.length ? super(...a) : super(O.now() + d); }
  static now() { return O.now() + d; }
};
```

## Zwei Regeln, die nicht verhandelbar sind

**1. Keine nackten Element-Selektoren im CSS.** Das Widget rendert in unser DOM,
und alles kaskadiert hinein. Ein einziges `div { opacity: .8 }` graut das halbe
Anmeldeformular aus. Global erlaubt sind nur `*`, `html` und `body`.
Aus demselben Grund läuft **Tailwind ohne Preflight** — dessen `button {}`- und
`input {}`-Resets würden das Formular zerlegen.

**2. `widget.css` bleibt global und ungelayert.** raceresult injiziert sein CSS
ungelayert und *nach* unserem Stylesheet. Ungelayerte Regeln schlagen jede
`@layer`-Regel — käme unser Override-Layer in einen Tailwind-Layer, verlöre er
sofort. Die `body`-Präfixe darin sind der Spezifitäts-Gewinn, kein Zierrat.

Zwei Regeln im Theming sind behobene Fehler, kein Geschmack:

- **Eingabefelder auf `max(1rem, 16px)`.** iOS Safari zoomt beim Antippen in
  jedes Feld unter 16 px — und zoomt nicht wieder heraus. Nicht über
  `user-scalable=no` lösen: das sperrt alle aus, die zum Lesen zoomen müssen.
- **`[hidden]` auf `display: none`.** Eigene `display`-Regeln schlagen sonst
  das `hidden`-Attribut.

## Distanz-Vorwahl

raceresult wertet aus der URL nur `regname` aus. Eingebettet steht das Feld aber
in *unserem* DOM, also setzt `preselectContest` es nach dem Rendern selbst
(Zuordnung über `contest_id` in der YAML).

Das kann bei einem raceresult-Update brechen, deshalb scheitert es **still**:
Feld nicht da → nichts passiert, kein Fehler. Aufgefangen wird das von der
Kontinuitätsleiste über dem Formular („Deine Wahl: 6 km · 37 €") — sie sagt dem
Nutzer auch dann, was er wählen wollte. Der Canary meldet den Bruch am nächsten
Morgen.

## Tracking-Events

| Event | Wann |
|---|---|
| `Distanz gewählt: 10 km` | Klick auf eine Distanz-Karte |
| `Zur Anmeldung` | Klick auf den CTA, mit `{ distanz }` |
| `Formular geöffnet` | Seitenaufruf im Formularmodus |
| `Distanz vorgewählt: 10 km` | Vorwahl hat im Widget gegriffen |
| `Anmeldung abgeschlossen` | Bestätigungsseite des Widgets wird sichtbar |
| `Formular nicht ladbar` | Widget kam nicht durch, Notausgang gezeigt |
| `Deadline abgelaufen` | Seitenaufruf nach Fristende |

Events, die feuern bevor Umami geladen ist, werden gepuffert und nachgereicht
(bis zu 15 s).

## Offen vor dem Livegang

- [ ] **Umami-Website-ID eintragen.** In `Base.astro` steht der Platzhalter
      `TODO-EIGENE-WEBSITE-ID`; solange er dort steht, wird nichts gemessen.
- [ ] **Mindestalter klären.** Das raceresult-Formular sagt 12, Preisstaffel und
      Ausschreibung sagen 10. Der FAQ-Eintrag steht deshalb auf `TODO` — er ist
      auf der Seite sichtbar.
- [ ] Preise und Startzeiten gegen die aktuelle Ausschreibung abgleichen.
      Die Seite darf nie günstiger aussehen als das Anmeldeformular.
- [ ] **Testbuchung.** `Anmeldung abgeschlossen` lässt sich nur prüfen, indem
      wirklich gebucht wird. Dafür braucht es vom Zeitnehmer eine
      Testveranstaltung oder einen 100-%-Gutscheincode.
- [ ] **Datenschutzerklärung juristisch prüfen.** `datenschutz.astro` ist neu
      geschrieben und beschreibt, was diese Seite tatsächlich tut — Hosting bei
      GitHub, Umami ohne Cookies, das eingebettete raceresult-Formular. Die alte
      WordPress-Fassung nannte Newsletter, Kontaktformular und Google Web Fonts,
      die es hier alle nicht gibt.
- [ ] **Vereinsanschrift klären.** Impressum und Datenschutzerklärung der alten
      Seite widersprachen sich: Lublinring 12, 48147 gegen Wilhelmstraße 60,
      48149. Übernommen ist die Anschrift aus dem Impressum.
- [ ] **DNS umstellen.** `public/CNAME` steht auf `ultraschwimmen.de`. Solange
      die Domain auf WordPress zeigt, ändert der Build daran nichts.
- [ ] **Fotogalerien.** 798 Bilder liegen noch auf der WordPress-Installation.
      `/fotos/` und die fünf Sammlungsadressen leiten bis dahin auf die
      Startseite.

## Deployment

Push auf `main` löst [`deploy.yml`](.github/workflows/deploy.yml) aus: bauen,
`npm run test:unit` gegen das Ergebnis, dann `dist/` auf GitHub Pages
veröffentlichen. Scheitert der Build oder ein Test, wird nichts veröffentlicht.

Alte WordPress-Adressen sind in [`astro.config.mjs`](astro.config.mjs)
eingetragen. GitHub Pages kennt keine Server-Weiterleitung; Astro legt dafür je
Eintrag eine kleine Seite mit Meta-Refresh und `rel="canonical"` ab. Das ist
keine 301, aber niemand landet vor einer 404.
