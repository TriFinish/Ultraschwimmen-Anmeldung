// Einstiegspunkt. Lädt die YAML und entscheidet, welcher Modus gerendert wird.
// Alles Weitere liegt in lib/ (allgemeine Helfer) und ui/ (die zwei Modi).

import { parseYamlLite } from './lib/yaml.js';
import { warnIfTrackingUnconfigured } from './lib/tracking.js';
import { el } from './lib/dom.js';
import { renderEntscheidungsmodus } from './ui/decision.js';
import { renderFormularmodus } from './ui/registration.js';

function renderError(message) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const box = el('div', 'error');
  box.appendChild(el('p', null, message));
  // Die Anmeldung darf nie an unserer Seite scheitern — deshalb hier die
  // raceresult-URL fest verdrahtet: die YAML ist an dieser Stelle ja gerade
  // die Fehlerquelle.
  const fallback = el('a', 'error-link', 'Direkt zur Anmeldung bei raceresult');
  fallback.href = 'https://my.raceresult.com/383076/registration?regname=Sammel-Anmeldung';
  fallback.rel = 'noopener noreferrer';
  box.appendChild(fallback);
  app.appendChild(box);
}

warnIfTrackingUnconfigured();

// Das Widget schaltet über `?regname=` in der URL dieser Seite — daraus ergibt
// sich die Weiche zwischen Entscheidungs- und Formularmodus.
fetch('data/anmeldung.yaml')
  .then((res) => {
    if (!res.ok) throw new Error(`anmeldung.yaml konnte nicht geladen werden (${res.status})`);
    return res.text();
  })
  .then((text) => {
    const data = parseYamlLite(text);
    if (!data.provider?.url) throw new Error('provider.url fehlt in anmeldung.yaml');
    const params = new URLSearchParams(location.search);
    if (params.has('regname')) renderFormularmodus(data, params);
    else renderEntscheidungsmodus(data);
  })
  .catch((err) => {
    console.error(err);
    renderError('Die Anmeldedaten konnten nicht geladen werden.');
  });
