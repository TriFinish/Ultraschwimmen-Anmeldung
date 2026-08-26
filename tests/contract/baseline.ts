// Baselines der beiden Schichten. Liegen im Repo, damit eine Änderung im Diff
// des Pull Requests sichtbar wird statt nur im Log eines Actions-Laufs.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '__snapshots__');

// `npm run canary:update` setzt die Baseline bewusst neu.
const UPDATE = process.env.UPDATE_CANARY === '1';

export class BaselineMismatch extends Error {
  constructor(
    readonly name: string,
    readonly expected: unknown,
    readonly actual: unknown,
  ) {
    super(
      `Canary-Baseline "${name}" weicht ab.\n\n` +
        `erwartet:\n${JSON.stringify(expected, null, 2)}\n\n` +
        `tatsächlich:\n${JSON.stringify(actual, null, 2)}\n\n` +
        'Wenn die Änderung gewollt ist: npm run canary:update',
    );
  }
}

export function compareBaseline<T extends object>(name: string, actual: T): void {
  const file = join(DIR, `${name}.json`);
  const serialised = JSON.stringify(actual, null, 2);

  if (UPDATE || !existsSync(file)) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, `${serialised}\n`, 'utf8');
    return;
  }

  const expected = JSON.parse(readFileSync(file, 'utf8')) as T;
  // Beide Seiten kompakt serialisieren. Ein Vergleich gegen `serialised`
  // (eingerückt, weil es so in der Datei steht) schlüge immer fehl.
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new BaselineMismatch(name, expected, actual);
  }
}
