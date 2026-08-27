// @ts-check
import { defineConfig } from 'astro/config';
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
    '/strecken/': '/strecke/',
    '/kontaktformular/': '/kontakt/',
    '/kontakt-2/': '/kontakt/',
    '/datenschutzerklaerung/': '/datenschutz/',

    // Ersatzlos entfallen: Der Newsletter lief über MailPoet, das es hier
    // nicht mehr gibt. Wer sich melden wollte, findet auf /kontakt/ einen Weg.
    '/newsletter/': '/kontakt/',

    // Galerien. Die Bilder liegen noch auf der alten Installation und kommen
    // in einem späteren Schritt dazu; bis dahin führt der Weg zur Startseite.
    '/fotos/': '/',
    '/fotos-2016-sammlung/': '/',
    '/fotos-2020-sammlung/': '/',
    '/fotos-2021-sammlung/': '/',
    '/fotos-2024-sammlung/': '/',
    '/fotos-2025-sammlung/': '/',

    // Beiträge. Die alten Kürzel waren teils nichtssagend („beitrag-1") oder
    // 200 Zeichen lang — die neuen Adressen sind lesbar, die alten bleiben
    // erreichbar.
    '/2021/09/15/beitrag-1/': '/aktuelles/2021-09-15-orgateam/',
    '/2023/08/08/aenderung-wettkampfgelaende/':
      '/aktuelles/2023-08-08-aenderung-wettkampfgelaende/',
    '/2023/08/18/nachmeldungen-und-wassertemperatur/':
      '/aktuelles/2023-08-18-nachmeldungen-und-wassertemperatur/',
    '/2024/06/05/neopren-testschwimmen-mit-sailfish/':
      '/aktuelles/2024-06-05-neopren-testschwimmen-mit-sailfish/',
    '/2024/06/28/ultraschwimmen-zu-gast-beim-ruderverein-muenster/':
      '/aktuelles/2024-06-28-ultraschwimmen-zu-gast-beim-ruderverein-muenster/',
    '/2024/08/21/einfahrt-ultraschwimmen/': '/aktuelles/2024-08-21-einfahrt-ultraschwimmen/',
    '/2025/07/09/flossenschwimmen-wieder-im-angebot/':
      '/aktuelles/2025-07-09-flossenschwimmen-wieder-im-angebot/',
    '/2025/08/22/wir-freuen-uns-mit-der-eftas-gmbh-einen-neuen-hauptsponsor-dabeizuhaben-das-muensteraner-unternehmen-entwickelt-seit-ueber-35-jahren-passgenaue-geoit-loesungen-um-umweltrelevante-entscheidungen-und/':
      '/aktuelles/2025-08-22-eftas-neuer-hauptsponsor/',
    '/2025/08/30/ergebnisse-2025/': '/aktuelles/2025-08-30-ergebnisse-2025/',
  },

  integrations: [
    sitemap({
      // Weiterleitungsseiten gehören nicht in die Sitemap — sie sind kein
      // Inhalt, sondern eine Brücke für alte Lesezeichen.
      filter: (page) =>
        !/\/(fotos|newsletter|strecken|kontaktformular|datenschutzerklaerung)/.test(page) &&
        !/\/\d{4}\/\d{2}\/\d{2}\//.test(page),
    }),
  ],

  vite: {
    plugins: [tailwind()],
  },
  devToolbar: { enabled: false },
});
