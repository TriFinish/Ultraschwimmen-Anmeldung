# Komponenten

Drei Ordner, nach der Frage sortiert „was weiß diese Komponente?":

| Ordner | Weiß von … | Beispiel |
|---|---|---|
| `ui/` | nichts über Ultraschwimmen | `Card`, `Figure`, `DataTable`, `NoteBox`, `FaqList`, `StickyCta`, `Waves` |
| `content/` | unseren Datentypen aus `src/data/schema.ts` | `PostCard`, `DistanceTable`, `DistanceChooser`, `RegistrationWidget` |
| `layout/` | dem Seitengerüst | `SiteHeader`, `MobileNav`, `SiteFooter` |

Die Richtung ist einseitig: `content/` benutzt `ui/`, nie umgekehrt. Eine
`ui/`-Komponente, die `Distance` importiert, gehört nach `content/`.

## Die sechs Regeln

**1. Ein Domänenobjekt als eine Prop.**
`<PostCard post={beitrag} />`, nicht `<PostCard title={…} date={…} excerpt={…} />`.
Kommt ein Feld dazu, ändert sich keine Signatur.

**2. Typen aus der einen Quelle.**
`import type { Distance } from '../../data/schema'`, nicht ein eigenes
`interface Distance` daneben. Ein zweiter Typ ist ein Typ, der driftet.

**3. Keine Komponente lädt selbst.**
`loadSite()` und `loadEvent()` ruft ausschließlich die Seite bzw. `Page.astro`.
Der Grund steht in `tests/component/render.ts`: Nur so lässt sich eine
Komponente mit erfundenen Daten rendern, ohne eine Seite zu bauen.

**4. Styles gehören in die Komponente.**
`<style>` im `.astro`-File, nicht in `site.css`. Astro scopet das automatisch —
und das ist hier keine Kosmetik: Das raceresult-Widget rendert in unser DOM
(siehe Kommentarkopf von `src/styles/app.css`). Was gescopet ist, **kann** nicht
hineinlaufen. Global bleiben nur Tokens und das Seitengerüst.

**5. Slots statt Props-Explosion.**
Braucht eine Karte eine Variante, bekommt sie einen Slot — keine sechste
boolesche Prop. `Card` hat `eyebrow`, `media` und `footer`.

**6. Tests behaupten Bedeutung, nie Klassennamen.**
Überschriftenebene, Linkziel, `alt`, `aria-current` — ja. `.card-title` — nein.
Sonst ist jede Umgestaltung ein Testumbau.

## Die schwebende Ebene

Am unteren Rand können bis zu zwei Dinge übereinander schweben: die
Daumenleiste (`MobileNav`) und darüber die Anmelde-Leiste (`StickyCta`). Damit
sie sich nicht überlagern, gibt es zwei Tokens in `app.css`:

- `--dock` — was die Daumenleiste belegt. Ab 48 rem fast null, dort gibt es sie
  nicht.
- `--cta-height` — was die Anmelde-Leiste belegt. Beginnt bei `0px` und wird von
  `src/scripts/page.ts` gemessen, weil ihr Hinweistext auf schmalen Geräten
  umbricht und sie dann höher ist als jede geschätzte Zahl.

Wer etwas Neues dort unten platziert, rechnet mit diesen Tokens statt eine
eigene Zahl zu raten. Der Fußbereich hält mit
`calc(var(--dock) + var(--cta-height))` genau so viel Platz frei, dass nichts
verdeckt wird — das war der auffälligste Fehler der Vorgängerseite.
