import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Store } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORES_PATH = join(__dirname, 'data', 'stores.json');

export function getStores(): Store[] {
  const raw = readFileSync(STORES_PATH, 'utf-8');
  return JSON.parse(raw) as Store[];
}
