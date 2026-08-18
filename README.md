# Ultraschwimmen — Anmelde-Seite

Anmeldeseite für das Ultraschwimmen unter `anmeldung.ultraschwimmen.de`.
Der **gesamte** Anmeldevorgang läuft hier — Distanzwahl, Formular, Bezahlung,
Buchung. Das raceresult-Formular ist als JavaScript-Widget eingebettet und in
unser blaues Theme umgefärbt; der Nutzer wechselt nie die Domain.

Reines HTML/CSS/JS, kein Build-Schritt, kein Backend, keine eigene Zahlung:
Vertragspartner bleibt der Verein, das Startgeld zieht tollense-timing ein.

Warum der Schnitt genau dort liegt, steht in [PLAN.md](PLAN.md).

## Die zwei Modi

Das Widget schaltet über `?regname=` in der URL dieser Seite. Daraus ergibt sich
die einzige Verzweigung im Code:

| URL | Modus |
|---|---|
| `/` | Entscheidung — Distanz-Karten, Preise, Frist, FAQ |
| `/?regname=Sammel-Anmeldung` | Formular — das eingebettete Widget |
| `/?regname=Sammel-Anmeldung&d=6km` | Formular, Wettbewerb „6 km" vorgewählt |

Der CTA im Entscheidungsmodus zeigt auf die zweite bzw. dritte Form. Das
raceresult-Script wird **nur** im Formularmodus geladen.

## Wo liegt was?

| Bereich | Ort | Datei / Ressource |
|---|---|---|
| Inhalte (Preise, Zeiten, FAQ, Links) | Repo | [`site/data/anmeldung.yaml`](site/data/anmeldung.yaml) |
| Seiten-Markup + Templates | Repo | [`site/index.html`](site/index.html) |
| Logik | Repo | [`site/assets/`](site/assets/) — siehe Modulübersicht unten |
| Styles | Repo | [`site/assets/style.css`](site/assets/style.css) |
| Logo / Favicon | Repo | [`site/assets/logo.svg`](site/assets/logo.svg) |
| Custom Domain | Repo | [`site/CNAME`](site/CNAME) |
| Deployment | GitHub | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) → GitHub Pages |
| Analytics | Vercel | Umami, eingebunden im `<head>` von `index.html` |
| Anmeldeformular | raceresult | Event `383076`, Formular `Sammel-Anmeldung` |

**`anmeldung.yaml` ist die einzige Datei, die im Betrieb gepflegt wird.** Preise,
Startzeiten, Frist, FAQ und Footer-Links stehen dort; Änderungen brauchen keinen
Eingriff in HTML, CSS oder JS.

## Aufbau des JavaScripts

ES-Module, vom Browser direkt aufgelöst — **kein Bundler, kein Build-Schritt**.

| Datei | Zuständig für |
|---|---|
| [`app.js`](site/assets/app.js) | Einstieg: YAML laden, Modus wählen, Fehlerpfad |
| [`lib/yaml.js`](site/assets/lib/yaml.js) | `parseYamlLite` — eingeschränkter YAML-Parser |
| [`lib/dom.js`](site/assets/lib/dom.js) | `el`, `fromTemplate`, `formatEuro` |
| [`lib/tracking.js`](site/assets/lib/tracking.js) | Umami-Anbindung samt Ereignispuffer |
| [`ui/shared.js`](site/assets/ui/shared.js) | Header und Footer — in beiden Modi gleich |
| [`ui/deadline.js`](site/assets/ui/deadline.js) | Countdown, Fristende, Abgleich der beiden Datumsangaben |
| [`ui/decision.js`](site/assets/ui/decision.js) | Entscheidungsmodus: Karten, Gruppen-Hinweis, FAQ, CTA |
| [`ui/registration.js`](site/assets/ui/registration.js) | Formularmodus: Widget, Vorwahl, Autofocus-Sperre, Notausgang |

`ui/registration.js` ist die einzige Datei, die fremdes Markup anfasst. Wenn
raceresult etwas ändert, bricht es dort — und nirgendwo sonst.

## Lokale Entwicklung

```bash
python3 -m http.server --directory site 8000
```

Dann **<http://127.0.0.1:8000>** öffnen — **nicht** `localhost`.

Das ist keine Marotte: Der Loader von raceresult prüft
`window.location.origin.indexOf("localhost") < 0` und nimmt an, `localhost` sei
seine eigene Umgebung. Trifft das zu, sucht er seine Scripts auf *unserem*
Server, bekommt 404 und rendert **kommentarlos nichts**. Über `127.0.0.1`
funktioniert alles.

Der YAML-Abruf läuft über `fetch`, es braucht also ohnehin einen echten Server —
`file://` funktioniert nicht.

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

## Datenmodell

`anmeldung.yaml` wird von einem bewusst eingeschränkten Parser gelesen
(`parseYamlLite`, übernommen aus `Ultraschwimmen-Info-Site`). Er kann
verschachtelte Maps und `- key: value`-Listen — **keine Listen in Listen**.
Beim Erweitern darauf achten.

| Block | Zweck |
|---|---|
| `event` | Titel, Datum, Ort, Frist (`deadline`, ISO-8601 **mit Offset**), Nachmeldegebühr, Altersgrenzen |
| `provider` | `event_id` und `regname` fürs Widget; `url` nur als Notausgang |
| `group` | Text des Gruppen-Hinweises |
| `distances` | Karten: `label`, `laps`, `start`, `price`, `price_youth` — plus `contest_id` für die Vorwahl |
| `faq` | `<details>`-Einträge |
| `footer` | Hinweis + Links |

Zwei Fallstricke, die der Code aktiv meldet:

- **`deadline` muss den Zeitzonen-Offset tragen.** Der Countdown vergleicht gegen
  den absoluten Zeitpunkt, sonst sähe jemand in einer anderen Zeitzone die
  Anmeldung zu früh geschlossen.
- **`deadline_label` und `deadline` werden beide von Hand gepflegt.** Driften sie
  auseinander, warnt `app.js` in der Konsole.

## Vor dem Livegang

- [ ] **Umami-Website-ID eintragen.** In `index.html` steht der Platzhalter
      `TODO-EIGENE-WEBSITE-ID`; solange er dort steht, wird nichts gemessen und
      `app.js` warnt in der Konsole. Eine **neue** ID anlegen, nicht die der
      Info-Site mitbenutzen.
- [ ] **Mindestalter klären.** Das raceresult-Formular sagt 12 Jahre, die
      Preisstaffel und die Ausschreibung sagen 10. Der FAQ-Eintrag in der YAML
      steht deshalb auf `TODO` — er ist auf der Seite sichtbar und muss vor dem
      Livegang ersetzt werden.
- [ ] Preise und Startzeiten gegen die dann aktuelle Ausschreibung abgleichen.
      Die Seite darf nie günstiger aussehen als das Anmeldeformular.
- [ ] DNS-CNAME `anmeldung` → GitHub Pages, HTTPS in den Pages-Settings
      erzwingen.
- [ ] Mobil zuerst prüfen — der Traffic kommt aus der Instagram-Bio.
- [ ] **Testbuchung.** `Anmeldung abgeschlossen` lässt sich nur prüfen, indem
      wirklich gebucht wird — mit echter Lastschrift. Dafür braucht es vom
      Zeitnehmer eine Testveranstaltung oder einen 100-%-Gutscheincode.

## Tracking-Events

| Event | Wann |
|---|---|
| `Distanz gewählt: 10 km` | Klick auf eine Distanz-Karte |
| `Zur Anmeldung` | Klick auf den CTA, mit `{ distanz }` als Event-Data |
| `Formular geöffnet` | Seitenaufruf im Formularmodus |
| `Distanz vorgewählt: 10 km` | Vorwahl hat im Widget gegriffen |
| `Anmeldung abgeschlossen` | Bestätigungsseite des Widgets wird sichtbar |
| `Formular nicht ladbar` | Widget-Script kam nicht durch, Notausgang gezeigt |
| `Deadline abgelaufen` | Seitenaufruf nach Fristende |
| `Footer: Ausschreibung` | Klick auf einen Footer-Link |

Der Trichter reicht damit erstmals bis zum Abschluss statt nur bis zum Klick.
`Anmeldung abgeschlossen` beobachtet fremdes Markup und ist entsprechend
zerbrechlich; es zählt Ereignisse, keine Personendaten.

Events, die feuern bevor Umami geladen ist, werden gepuffert und nachgereicht
(bis zu 15 s). Ohne das ginge ausgerechnet `Deadline abgelaufen` verloren, weil
es direkt nach dem YAML-Abruf ausgelöst wird.

## Distanz-Vorwahl

raceresult wertet aus der URL nur `regname` aus — einen Deep-Link mit
vorgewähltem Wettbewerb gibt es nicht. Eingebettet steht das Feld aber in
*unserem* DOM, also setzt `app.js` es nach dem Rendern selbst
(`preselectContest`, Zuordnung über `contest_id` in der YAML).

Das ist ein Griff in fremdes Markup und kann bei einem raceresult-Update
brechen. Deshalb scheitert es still: Feld nicht da → nichts passiert, kein
Fehler. Aufgefangen wird das von der Kontinuitätsleiste über dem Formular
(„Deine Wahl: 6 km · 37 €") — sie sagt dem Nutzer auch dann, was er wählen
wollte.

## Theming des Formulars

raceresult liefert ~4,3 KB eigenes CSS mit, das der Veranstalter in seinem
Backend pflegt — in Rot und mit `!important`. **Auf dieses Backend haben wir
keinen Zugriff.**

Umgefärbt wird deshalb aus `style.css`, Abschnitt „Widget-Theming": sechs
Regeln, jeweils mit `body` davor. Das ist kein Zierrat — das Backend-CSS wird
zur Laufzeit *nach* unserem Stylesheet injiziert und gewänne bei gleicher
Spezifität.

Taucht irgendwann wieder Rot auf, weil der Zeitnehmer sein Backend geändert hat,
lässt sich der aktuelle Stand jederzeit abrufen — dafür braucht es keine Kopie
im Repo:

```bash
KEY=$(curl -s 'https://my.raceresult.com/383076/registration?regname=Sammel-Anmeldung' \
      | grep -oE 'RRReg_key[ =]*"[^"]+"' | grep -oE '"[^"]+"' | tr -d '"')
curl -s -X POST "https://events2.raceresult.com/api/registrations/request?eventid=383076&rname=Sammel-Anmeldung&key=$KEY&lang=de" \
     -H 'content-type: text/plain' \
     -d '{"URL":"https://my.raceresult.com/383076/registration?regname=Sammel-Anmeldung"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['CSS'].replace('}','}\n'))"
```

Darin nach `#c21b17` und `a81815` suchen: Was dort auftaucht und in unserem
Override-Layer fehlt, ist die Lücke.

**Wichtigste Regel in `style.css`: keine nackten Element-Selektoren.** Unser CSS
kaskadiert ins Widget; ein `div { opacity: .8 }` graut das halbe Formular aus.
Global erlaubt sind nur `*`, `html` und `body`.

## Deployment

Push auf `main` löst [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
aus und veröffentlicht `site/` auf GitHub Pages.
