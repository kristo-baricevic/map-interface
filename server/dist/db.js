import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const STORES_PATH = join(__dirname, 'data', 'stores.json');
export function getStores() {
    const raw = readFileSync(STORES_PATH, 'utf-8');
    return JSON.parse(raw);
}
export function updateStoreCoords(id, lng, lat) {
    const stores = getStores();
    const store = stores.find((s) => s.id === id);
    if (!store)
        return null;
    store.lng = lng;
    store.lat = lat;
    writeFileSync(STORES_PATH, JSON.stringify(stores, null, 2) + '\n', 'utf-8');
    return store;
}
