import type { Store } from "./types";

/**
 * Button/source identifiers for click tracking (for marketing and CSV export).
 * - map_marker: user clicked a store pin on the map
 * - drawer_instagram: user clicked Instagram link in the store drawer
 * - drawer_facebook: user clicked Facebook link in the store drawer
 * - drawer_vip: user clicked VIP Pass link in the store drawer
 */
export type StoreClickButton =
  | "map_marker"
  | "drawer_instagram"
  | "drawer_facebook"
  | "drawer_vip";

export function trackStoreClick(store: Store, button: StoreClickButton): void {
  fetch("/api/store-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: store.id,
      storeName: store.name,
      button,
      t: Date.now(),
    }),
  }).catch(() => {});
}
