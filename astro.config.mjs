// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';

// Statischer Output ist keine Vorliebe, sondern Bedingung: Die Seite liegt auf
// GitHub Pages, und das raceresult-Widget braucht einen echten Browser-DOM, in
// den es zur Laufzeit rendert. Nichts hier darf serverseitig werden.
export default defineConfig({
  site: 'https://anmelden.ultraschwimmen.de',
  output: 'static',
  outDir: './dist',
  publicDir: './public',
  vite: {
    plugins: [tailwind()],
  },
  devToolbar: { enabled: false },
});
