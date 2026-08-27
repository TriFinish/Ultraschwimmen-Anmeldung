import { defineConfig } from 'vitest/config';

// Der Canary braucht kein Astro — er redet mit dem Netz, nicht mit Komponenten.
// Bewusst ohne getViteConfig: Das spart beim Cron-Lauf das Hochfahren der
// gesamten Astro-Pipeline.
export default defineConfig({
  test: {
    name: 'contract',
    include: ['tests/contract/**/*.test.ts'],
    environment: 'node',
    globals: true,
    // Fremdes Netz plus Retries — der Default von 5 s reicht nicht.
    testTimeout: 45000,
    hookTimeout: 45000,
    retry: 1,
  },
});
