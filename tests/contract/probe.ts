// Sonden gegen die echte raceresult-Infrastruktur.
//
// Die Ladekette hat vier Stufen, und die dritte ist unversioniert:
//
//   my.raceresult.com/RRRegStart/load.js.php      v2.0.221 (hartkodiert)
//     └─ RRRegStart.js?v=v2.0.221                 äußere Hülle
//          └─ events2.../registrations/init.js    ⚠ UNVERSIONIERT
//               ├─ registration.css?build=v14.0.19-10   erzeugt unsere Klassen
//               └─ registration.js ?build=v14.0.19-10   erzeugt unser Markup
//
// Überwacht werden muss die letzte Stufe: Dort entsteht das Markup, in das
// `src/scripts/widget.ts` greift. `init.js` ist das Scharnier dorthin und kann
// sich ohne Vorwarnung ändern — sie trug beim Anlegen dieses Tests einen
// Last-Modified-Zeitstempel von wenigen Stunden.

import { createHash } from 'node:crypto';

export const LOADER_URL = 'https://my.raceresult.com/RRRegStart/load.js.php?lang=de';
export const INIT_URL = 'https://events2.raceresult.com/registrations/init.js?lang=de';
export const EVENT_ID = 383076;
export const REGNAME = 'Sammel-Anmeldung';

const REG_PAGE = `https://my.raceresult.com/${EVENT_ID}/registration?regname=${encodeURIComponent(REGNAME)}`;

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export class UnreachableError extends Error {}

// Netzwerkfehler sind KEIN Vertragsbruch. Zweimal wiederholen und erst bei
// dauerhaftem Ausfall aufgeben — der Workflow meldet das mit einem anderen
// Label als eine echte Vertragsänderung.
async function fetchRetry(url: string, init?: RequestInit): Promise<Response> {
  let last: unknown;
  for (let versuch = 0; versuch < 3; versuch++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      last = new Error(`HTTP ${res.status} für ${url}`);
    } catch (err) {
      last = err;
    }
    if (versuch < 2) await new Promise((r) => setTimeout(r, 1500 * (versuch + 1)));
  }
  throw new UnreachableError(`${url} nach 3 Versuchen nicht erreichbar: ${String(last)}`);
}

export interface ProductProbe {
  loaderVersion: string;
  initEtag: string | null;
  initLastModified: string | null;
  build: string;
  productCssSha: string;
  productJsSha: string;
  productCssClasses: string[];
}

// Alles, was raceresult selbst ausliefert. Ändert sich hier etwas, hat
// raceresult deployed — und niemand sagt uns Bescheid.
export async function probeProduct(): Promise<ProductProbe> {
  const loader = await (await fetchRetry(LOADER_URL)).text();
  const loaderVersion = loader.match(/v=(v[\d.]+)/)?.[1] ?? '';

  const initRes = await fetchRetry(INIT_URL);
  const init = await initRes.text();
  const build = init.match(/build=(v[\d.\-]+)/)?.[1] ?? '';

  const base = 'https://events2.raceresult.com';
  const css = await (
    await fetchRetry(`${base}/registrations/registration.css?build=${build}`)
  ).text();
  const js = await (
    await fetchRetry(`${base}/registrations/registration.js?lang=de&build=${build}`)
  ).text();

  // Genau die Klassen, auf die `src/styles/widget.css` zielt.
  const wanted = [
    'RRReg_Confirmation',
    'RRReg_EntryField',
    'RRReg_EntryFees',
    'RRReg_TabsList',
    'RRReg_RadioGroupTile',
    'RRReg_Nav',
    'RRReg_Box',
    'RRReg_Table',
    'RRReg_Main',
    'RRReg_Page',
  ];

  return {
    loaderVersion,
    initEtag: initRes.headers.get('etag'),
    initLastModified: initRes.headers.get('last-modified'),
    build,
    productCssSha: sha256(css),
    productJsSha: sha256(js),
    productCssClasses: wanted.filter((c) => css.includes(c)),
  };
}

export interface ContestOption {
  Value: number;
  Label: string;
  SoldOut: boolean;
}

export interface EventProbe {
  contests: ContestOption[];
  contestFieldClassName: string;
  contestFieldControlType: string;
  organizerCssClasses: string[];
  organizerCssRedSelectors: string[];
  stepTitles: string[];
}

interface RRElement {
  ID?: string;
  ClassName?: string;
  Children?: RRElement[];
  Field?: { ControlType?: string; Values?: ContestOption[] };
}

function findElement(els: RRElement[], id: string): RRElement | undefined {
  for (const e of els) {
    if (e.ID === id) return e;
    if (e.Children) {
      const hit = findElement(e.Children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

// Alles, was Tollense in ihrem Backend pflegt. Ändert sich hier etwas, genügt
// eine Rückfrage per Mail — deshalb im Workflow ein eigenes Label.
export async function probeEvent(): Promise<EventProbe> {
  const page = await (await fetchRetry(REG_PAGE)).text();
  const key = page.match(/RRReg_key[ =]*"([^"]+)"/)?.[1];
  if (!key) throw new UnreachableError('RRReg_key nicht in der Registrierungsseite gefunden');

  const api =
    `https://events2.raceresult.com/api/registrations/request` +
    `?eventid=${EVENT_ID}&rname=${encodeURIComponent(REGNAME)}&key=${key}&lang=de`;
  const res = await fetchRetry(api, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify({ URL: REG_PAGE }),
  });
  const form = (await res.json()) as {
    Steps: Array<{ Title: string; Elements: RRElement[] }>;
    CSS: string;
  };

  const contestField = findElement(form.Steps[0]?.Elements ?? [], '1_0');
  const css = form.CSS ?? '';

  // Rot aus dem Veranstalter-Backend. Taucht es in einem Selektor auf, den wir
  // nicht überschreiben, schlägt unser Theming dort durch.
  const redSelectors = (css.match(/[^{}]+\{[^}]*(?:#c21b17|a81815)[^}]*\}/gi) ?? []).map((r) =>
    (r.split('{')[0] ?? '').trim(),
  );

  return {
    contests: contestField?.Field?.Values?.filter((v) => v.Value !== 0) ?? [],
    contestFieldClassName: contestField?.ClassName ?? '',
    contestFieldControlType: contestField?.Field?.ControlType ?? '',
    organizerCssClasses: ['RRReg_StarMandatory', 'BoxHTML'].filter((c) => css.includes(c)),
    organizerCssRedSelectors: redSelectors,
    stepTitles: form.Steps.map((s) => s.Title),
  };
}
