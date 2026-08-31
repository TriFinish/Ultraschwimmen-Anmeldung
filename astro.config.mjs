// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';

// Statischer Output ist keine Vorliebe, sondern Bedingung: Die Seite liegt auf
// GitHub Pages, und das raceresult-Widget braucht einen echten Browser-DOM, in
// den es zur Laufzeit rendert. Nichts hier darf serverseitig werden.
export default defineConfig({
  site: 'https://ultraschwimmen.de',
  output: 'static',
  outDir: './dist',
  publicDir: './public',
  trailingSlash: 'always',

  // Adressen der WordPress-Installation, die es nach dem Umzug nicht mehr gibt.
  // GitHub Pages kennt keine Server-Weiterleitungen; Astro legt für jeden
  // Eintrag eine kleine HTML-Seite mit Meta-Refresh und <link rel="canonical">
  // ab. Das ist keine 301, reicht aber, damit niemand vor einer 404 steht.
  //
  // Vollständig gegen wp-sitemap-posts-page-1.xml und -post-1.xml geprüft.
  redirects: {
    // Seiten, die umbenannt wurden
    '/anmeldung/': '/anmelden/',
    '/strecken/': '/strecke/',
    '/kontaktformular/': '/kontakt/',
    '/kontakt-2/': '/kontakt/',
    '/datenschutzerklaerung/': '/datenschutz/',

    // Ersatzlos entfallen: Der Newsletter lief über MailPoet, das es hier
    // nicht mehr gibt. Wer sich melden wollte, findet auf /kontakt/ einen Weg.
    '/newsletter/': '/kontakt/',

    // Galerien. /fotos/ ist inzwischen eine echte Seite; die jahrgangsweisen
    // Adressen der WordPress-Installation führen dorthin, bis die einzelnen
    // Galerien in fotos.yaml stehen.
    '/fotos-2016-sammlung/': '/fotos/',
    '/fotos-2020-sammlung/': '/fotos/',
    '/fotos-2021-sammlung/': '/fotos/',
    '/fotos-2024-sammlung/': '/fotos/',
    '/fotos-2025-sammlung/': '/fotos/',
  },

  integrations: [
    // Iconify-Symbole werden zur BUILD-Zeit aus @iconify-json/lucide als SVG
    // eingebettet, nicht zur Laufzeit nachgeladen: kein fremder Host, keine
    // Anfrage im Browser, nichts was ein Adblocker verschluckt. Im HTML landet
    // nur, was auch benutzt wird.
    icon(),
    sitemap({
      // Weiterleitungsseiten gehören nicht in die Sitemap — sie sind kein
      // Inhalt, sondern eine Brücke für alte Lesezeichen.
      filter: (page) =>
        !/\/(anmeldung|fotos-\d{4}-sammlung|newsletter|strecken|kontaktformular|datenschutzerklaerung)/.test(
          page,
        ) &&
        !/\/\d{4}\/\d{2}\/\d{2}\//.test(page),
    }),
  ],

  vite: {
    plugins: [tailwind()],
  },
  devToolbar: { enabled: false },
});
